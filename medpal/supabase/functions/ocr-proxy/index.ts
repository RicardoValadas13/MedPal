import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OCR_BASE = 'https://medpal-prescription-ocr.onrender.com'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  })
}

type FixedSchedule = {
  type: 'fixed'
  times: string[]
  days: string[]
  take_with_food: boolean
}

type IntervalSchedule = {
  type: 'interval'
  interval_hours: number
  first_dose: string
  days: string[]
  take_with_food: boolean
}

type OcrSchedule = FixedSchedule | IntervalSchedule

/** Derive concrete HH:MM times from an interval schedule. */
function intervalToTimes(intervalHours: number, firstDose: string): string[] {
  const [h, m] = firstDose.split(':').map(Number)
  const count = Math.floor(24 / intervalHours)
  const times: string[] = []
  let minutes = h * 60 + (m || 0)
  for (let i = 0; i < count; i++) {
    const hh = String(Math.floor(minutes / 60) % 24).padStart(2, '0')
    const mm = String(minutes % 60).padStart(2, '0')
    times.push(`${hh}:${mm}`)
    minutes += intervalHours * 60
  }
  return times
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const contentType = req.headers.get('content-type') ?? ''

    if (!contentType.includes('multipart/form-data')) {
      return json({ error: 'multipart/form-data required' }, 400)
    }

    const form = await req.formData()
    const file = form.get('file') as File | null
    const prescriptionId = form.get('prescription_id') as string | null

    if (!file || !prescriptionId) {
      return json({ error: 'Missing file or prescription_id' }, 400)
    }

    const ocrForm = new FormData()
    ocrForm.append('file', file)

    const ocrRes = await fetch(`${OCR_BASE}/v1/prescriptions`, {
      method: 'POST',
      body: ocrForm,
    })

    if (!ocrRes.ok) {
      const text = await ocrRes.text()
      return json({ error: `OCR API error ${ocrRes.status}: ${text}` }, 502)
    }

    const ocr = await ocrRes.json()

    await supabase
      .from('prescriptions')
      .update({
        status: 'extracted',
        doctor_name: ocr.prescriber?.name ?? null,
        prescribed_at: ocr.date ?? null,
        raw_extraction: ocr,
      })
      .eq('id', prescriptionId)

    if (Array.isArray(ocr.items) && ocr.items.length > 0) {
      const rows = ocr.items.map((item: {
        name: string
        description: string | null
        dosage: string | null
        duration_days: number | null
        schedule: OcrSchedule | null
      }) => {
        const sched = item.schedule
        const times = sched
          ? sched.type === 'fixed'
            ? sched.times
            : intervalToTimes(sched.interval_hours, sched.first_dose)
          : []

        return {
          prescription_id: prescriptionId,
          extracted_name: item.name,
          description: item.description ?? null,
          extracted_dosage: item.dosage ?? null,
          extracted_form: null,
          quantity: null,
          posology_text: null,
          posology_structured: sched
            ? {
                ...sched,
                times,                          // always resolved to HH:MM list
                duration_days: item.duration_days ?? null,
              }
            : null,
          match_status: 'unmatched',
          field_confidences: null,
        }
      })

      const { error: insertError } = await supabase.from('prescription_items').insert(rows)
      if (insertError) {
        console.error('prescription_items insert failed:', insertError)
        return json({ error: insertError.message }, 500)
      }
    }

    return json({ ok: true, items_count: ocr.items?.length ?? 0 })
  } catch (err) {
    console.error('ocr-proxy error:', err)
    return json({ error: String(err) }, 502)
  }
})
