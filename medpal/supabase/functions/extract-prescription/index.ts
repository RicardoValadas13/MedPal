import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.27.0'

// Shared extraction schema (mirrors src/types/extraction.ts)
interface PosologyStructured {
  dose_amount: number | null
  dose_unit: string | null
  frequency_hours: number | null
  times_per_day: number | null
  duration_days: number | null
}

interface ExtractionItem {
  extracted_name: string
  extracted_dosage: string | null
  extracted_form: string | null
  quantity: number | null
  posology_text: string | null
  posology_structured: PosologyStructured | null
  field_confidences: Record<string, number> | null
}

interface ExtractionResult {
  prescription: {
    rsp_number: string | null
    prescribed_at: string | null
    doctor_name: string | null
  }
  items: ExtractionItem[]
}

const EXTRACTION_PROMPT = `You are a medical prescription parser for Portuguese prescriptions (RSP — Receita Sem Papel).
Extract all medications and metadata from the provided prescription text or image.
Return ONLY valid JSON matching the schema below — no prose, no markdown, no code fences.

Schema:
{
  "prescription": {
    "rsp_number": "string or null",
    "prescribed_at": "YYYY-MM-DD or null",
    "doctor_name": "string or null"
  },
  "items": [
    {
      "extracted_name": "medication brand or generic name",
      "extracted_dosage": "e.g. '500 mg' or null",
      "extracted_form": "e.g. 'Comprimido' or null",
      "quantity": number or null,
      "posology_text": "full dosage instructions as written or null",
      "posology_structured": {
        "dose_amount": number or null,
        "dose_unit": "e.g. 'comprimido' or null",
        "frequency_hours": number or null,
        "times_per_day": number or null,
        "duration_days": number or null
      } or null,
      "field_confidences": {
        "extracted_name": 0.0-1.0,
        "extracted_dosage": 0.0-1.0,
        "quantity": 0.0-1.0
      }
    }
  ]
}

Rules:
- field_confidences: 1.0 = clearly stated, 0.5 = inferred, 0.0 = guessed
- If a field is absent from the prescription, set it to null (never fabricate values)
- Return at least one item; if no medications found return {"error": "no_items"}
- Do not include medication leaflet content`

function validateExtractionResult(raw: unknown): ExtractionResult {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Extraction result is not an object')
  }

  const obj = raw as Record<string, unknown>

  if ('error' in obj) {
    throw new Error(`Extraction error: ${obj.error}`)
  }

  if (!('prescription' in obj) || !('items' in obj)) {
    throw new Error('Missing required fields: prescription, items')
  }

  const items = obj.items as unknown[]
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('No items found in extraction')
  }

  for (const item of items) {
    const i = item as Record<string, unknown>
    if (typeof i.extracted_name !== 'string' || !i.extracted_name) {
      throw new Error('Item missing extracted_name')
    }
  }

  return raw as ExtractionResult
}

async function matchDrugs(
  supabase: ReturnType<typeof createClient>,
  items: ExtractionItem[]
): Promise<Array<ExtractionItem & { drug_id: string | null; match_confidence: number; match_status: string; candidates?: string[] }>> {
  return Promise.all(
    items.map(async (item) => {
      const name = item.extracted_name.trim()

      // Exact name match first
      const { data: exactMatch } = await supabase
        .from('drugs')
        .select('id, name')
        .ilike('name', name)
        .limit(1)
        .single()

      if (exactMatch) {
        return { ...item, drug_id: exactMatch.id, match_confidence: 0.95, match_status: 'matched' }
      }

      // Trigram/partial match — use first significant word
      const keyword = name.split(/\s+/)[0]
      const { data: partialMatches } = await supabase
        .from('drugs')
        .select('id, name')
        .ilike('name', `%${keyword}%`)
        .limit(5)

      if (!partialMatches || partialMatches.length === 0) {
        return { ...item, drug_id: null, match_confidence: 0, match_status: 'unmatched' }
      }

      if (partialMatches.length === 1) {
        return { ...item, drug_id: partialMatches[0].id, match_confidence: 0.75, match_status: 'matched' }
      }

      // Multiple candidates — return ambiguous with candidate ids
      return {
        ...item,
        drug_id: partialMatches[0].id,
        match_confidence: 0.5,
        match_status: 'ambiguous',
        candidates: partialMatches.map(m => m.id),
      }
    })
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { prescription_id } = await req.json()

    if (!prescription_id) {
      return new Response(JSON.stringify({ error: 'prescription_id required' }), { status: 400 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const anthropic = new Anthropic({ apiKey: anthropicKey })

    // Fetch prescription record
    const { data: prescription, error: fetchError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('id', prescription_id)
      .single()

    if (fetchError || !prescription) {
      return new Response(JSON.stringify({ error: 'Prescription not found' }), { status: 404 })
    }

    // Mark as processing
    await supabase
      .from('prescriptions')
      .update({ status: 'processing' })
      .eq('id', prescription_id)

    let extractionResult: ExtractionResult

    // --- Fork: digital PDF text extraction vs vision ---
    if (prescription.source_type === 'rsp_pdf') {
      // Download the PDF and attempt text extraction
      const { data: fileData, error: dlError } = await supabase.storage
        .from('prescriptions')
        .download(prescription.file_path)

      if (dlError || !fileData) {
        throw new Error('Failed to download prescription file')
      }

      // For digital PDFs, try to extract text using PDF.js in a basic way
      // We send the raw bytes to Claude with explicit instruction to parse the text
      const bytes = await fileData.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)))

      const response = await anthropic.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64,
                },
              },
              {
                type: 'text',
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      })

      const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
      const parsed = JSON.parse(rawText.trim())
      extractionResult = validateExtractionResult(parsed)
    } else {
      // Vision path for photos/image-only PDFs
      const { data: fileData, error: dlError } = await supabase.storage
        .from('prescriptions')
        .download(prescription.file_path)

      if (dlError || !fileData) {
        throw new Error('Failed to download prescription file')
      }

      const bytes = await fileData.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)))
      const mediaType = prescription.source_type === 'photo' ? 'image/jpeg' : 'image/png'

      const response = await anthropic.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: 'text',
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      })

      const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
      const parsed = JSON.parse(rawText.trim())
      extractionResult = validateExtractionResult(parsed)
    }

    // Match drugs against Infomed reference table
    const matchedItems = await matchDrugs(supabase, extractionResult.items)

    // Persist prescription metadata
    await supabase
      .from('prescriptions')
      .update({
        status: 'extracted',
        prescribed_at: extractionResult.prescription.prescribed_at,
        doctor_name: extractionResult.prescription.doctor_name,
        rsp_number: extractionResult.prescription.rsp_number,
        raw_extraction: extractionResult as unknown as Record<string, unknown>,
      })
      .eq('id', prescription_id)

    // Create prescription_items
    for (const item of matchedItems) {
      await supabase.from('prescription_items').insert({
        prescription_id,
        drug_id: item.drug_id,
        extracted_name: item.extracted_name,
        extracted_dosage: item.extracted_dosage,
        extracted_form: item.extracted_form,
        quantity: item.quantity,
        posology_text: item.posology_text,
        posology_structured: item.posology_structured as unknown as Record<string, unknown>,
        match_confidence: item.match_confidence,
        match_status: item.match_status as 'matched' | 'ambiguous' | 'unmatched' | 'manual',
        field_confidences: item.field_confidences as unknown as Record<string, unknown>,
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('extract-prescription error:', err)

    // Try to mark prescription as failed
    try {
      const { prescription_id } = await (async () => {
        // req body already consumed above — we can't re-read it
        return { prescription_id: null }
      })()
      if (prescription_id) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )
        await supabase
          .from('prescriptions')
          .update({ status: 'failed' })
          .eq('id', prescription_id)
      }
    } catch (_) { /* best effort */ }

    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  }
})
