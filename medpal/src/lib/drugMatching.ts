import { supabase } from './supabase'
import type { Drug } from '../types/database'

export interface MatchResult {
  drug: Drug | null
  confidence: number
  status: 'matched' | 'ambiguous' | 'unmatched'
  candidates: Drug[]
}

// Interface for the matching provider — swap implementation without changing callers
export interface DrugMatchingProvider {
  match(extractedName: string): Promise<MatchResult>
}

// MVP: normalized text + trigram matching against the local `drugs` table
export class TrigramDrugMatcher implements DrugMatchingProvider {
  async match(extractedName: string): Promise<MatchResult> {
    const name = extractedName.trim()

    // 1. Exact (case-insensitive) match
    const { data: exact } = await supabase
      .from('drugs')
      .select('*')
      .ilike('name', name)
      .limit(1)
      .single()

    if (exact) {
      return { drug: exact, confidence: 0.95, status: 'matched', candidates: [exact] }
    }

    // 2. Partial match on first significant word
    const keyword = name.split(/\s+/)[0]
    const { data: partial } = await supabase
      .from('drugs')
      .select('*')
      .ilike('name', `%${keyword}%`)
      .limit(5)

    if (!partial || partial.length === 0) {
      return { drug: null, confidence: 0, status: 'unmatched', candidates: [] }
    }

    if (partial.length === 1) {
      return { drug: partial[0], confidence: 0.75, status: 'matched', candidates: partial }
    }

    return { drug: partial[0], confidence: 0.5, status: 'ambiguous', candidates: partial }
  }
}

// Stub for future embedding-based matching
export class EmbeddingDrugMatcher implements DrugMatchingProvider {
  async match(_extractedName: string): Promise<MatchResult> {
    throw new Error('EmbeddingDrugMatcher not yet implemented')
  }
}

// Stub for future Infomed sync job
export async function syncInfomed(): Promise<void> {
  // TODO: fetch from INFARMED API and upsert into drugs table
  throw new Error('syncInfomed not yet implemented')
}

export const drugMatcher: DrugMatchingProvider = new TrigramDrugMatcher()
