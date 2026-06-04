import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TrigramDrugMatcher, type MatchResult } from './drugMatching'

// Mock supabase so tests don't need a real DB
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from './supabase'

const mockDrug = (overrides = {}) => ({
  id: 'uuid-1',
  name: 'Brufen',
  active_substance: 'Ibuprofeno',
  strength: '400 mg',
  form: 'Comprimido',
  route: 'Oral',
  atc_code: 'M01AE01',
  leaflet_url: 'https://infarmed.pt',
  rcm_url: null,
  aim_number: null,
  cnpem_code: null,
  is_marketed: true,
  last_synced_at: null,
  ...overrides,
})

describe('TrigramDrugMatcher', () => {
  let matcher: TrigramDrugMatcher

  beforeEach(() => {
    matcher = new TrigramDrugMatcher()
    vi.clearAllMocks()
  })

  it('returns matched with high confidence on exact name hit', async () => {
    const drug = mockDrug()
    const chain = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: drug, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as never)

    const result: MatchResult = await matcher.match('Brufen')

    expect(result.status).toBe('matched')
    expect(result.confidence).toBeGreaterThanOrEqual(0.9)
    expect(result.drug?.name).toBe('Brufen')
  })

  it('returns unmatched when no drugs found', async () => {
    const exactChain = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    }
    const partialChain = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    vi.mocked(supabase.from)
      .mockReturnValueOnce(exactChain as never)
      .mockReturnValueOnce(partialChain as never)

    const result = await matcher.match('UnknownDrug XYZ')
    expect(result.status).toBe('unmatched')
    expect(result.drug).toBeNull()
  })

  it('returns ambiguous when multiple candidates found', async () => {
    const drugs = [mockDrug({ id: '1', name: 'Brufen 400' }), mockDrug({ id: '2', name: 'Brufen Plus' })]
    const exactChain = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    }
    const partialChain = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: drugs, error: null }),
    }
    vi.mocked(supabase.from)
      .mockReturnValueOnce(exactChain as never)
      .mockReturnValueOnce(partialChain as never)

    const result = await matcher.match('Brufen')
    expect(result.status).toBe('ambiguous')
    expect(result.candidates).toHaveLength(2)
    expect(result.confidence).toBe(0.5)
  })
})
