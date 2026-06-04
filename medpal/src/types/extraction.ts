import { z } from 'zod'

export const posologyStructuredSchema = z.object({
  dose_amount: z.number().nullable(),
  dose_unit: z.string().nullable(),
  frequency_hours: z.number().nullable(),
  times_per_day: z.number().nullable(),
  duration_days: z.number().nullable(),
})

export const extractionItemSchema = z.object({
  extracted_name: z.string().min(1),
  extracted_dosage: z.string().nullable(),
  extracted_form: z.string().nullable(),
  quantity: z.number().nullable(),
  posology_text: z.string().nullable(),
  posology_structured: posologyStructuredSchema.nullable(),
  field_confidences: z.record(z.string(), z.number()).nullable(),
})

const isoDateOrNull = z.string()
  .refine(s => /^\d{4}-\d{2}-\d{2}$/.test(s), { message: 'Must be YYYY-MM-DD' })
  .nullable()

export const extractionResultSchema = z.object({
  prescription: z.object({
    rsp_number: z.string().nullable(),
    prescribed_at: isoDateOrNull,
    doctor_name: z.string().nullable(),
  }),
  items: z.array(extractionItemSchema).min(1),
})

export type ExtractionResult = z.infer<typeof extractionResultSchema>
export type ExtractionItem = z.infer<typeof extractionItemSchema>
export type PosologyStructured = z.infer<typeof posologyStructuredSchema>
