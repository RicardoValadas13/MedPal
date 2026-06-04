import { describe, it, expect } from 'vitest'
import { extractionResultSchema } from './extraction'

describe('extractionResultSchema', () => {
  it('accepts a valid extraction result', () => {
    const valid = {
      prescription: {
        rsp_number: 'RSP-123',
        prescribed_at: '2024-03-15',
        doctor_name: 'Dr. Silva',
      },
      items: [
        {
          extracted_name: 'Brufen',
          extracted_dosage: '400 mg',
          extracted_form: 'Comprimido',
          quantity: 20,
          posology_text: '1 comprimido 3 vezes por dia',
          posology_structured: {
            dose_amount: 1,
            dose_unit: 'comprimido',
            frequency_hours: 8,
            times_per_day: 3,
            duration_days: 7,
          },
          field_confidences: { extracted_name: 0.99, extracted_dosage: 0.95, quantity: 0.9 },
        },
      ],
    }

    const result = extractionResultSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('accepts null nullable fields', () => {
    const minimal = {
      prescription: { rsp_number: null, prescribed_at: null, doctor_name: null },
      items: [
        {
          extracted_name: 'Paracetamol',
          extracted_dosage: null,
          extracted_form: null,
          quantity: null,
          posology_text: null,
          posology_structured: null,
          field_confidences: null,
        },
      ],
    }
    expect(extractionResultSchema.safeParse(minimal).success).toBe(true)
  })

  it('rejects empty items array', () => {
    const invalid = {
      prescription: { rsp_number: null, prescribed_at: null, doctor_name: null },
      items: [],
    }
    expect(extractionResultSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects invalid prescribed_at format', () => {
    const invalid = {
      prescription: { rsp_number: null, prescribed_at: '15/03/2024', doctor_name: null },
      items: [
        {
          extracted_name: 'Drug',
          extracted_dosage: null,
          extracted_form: null,
          quantity: null,
          posology_text: null,
          posology_structured: null,
          field_confidences: null,
        },
      ],
    }
    expect(extractionResultSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects missing extracted_name', () => {
    const invalid = {
      prescription: { rsp_number: null, prescribed_at: null, doctor_name: null },
      items: [{ extracted_name: '' }],
    }
    expect(extractionResultSchema.safeParse(invalid).success).toBe(false)
  })
})
