import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// MedPal GIF Generation service (async job + poll). See its README for the
// contract: POST /v1/gifs -> { job_id }, then GET /v1/gifs/{job_id}/raw which is
// 409 until ready and 200 image/gif when done.
const GIF_BASE = 'https://medpal-gifgen.onrender.com'
const GIF_BUCKET = 'gifs'
const NUM_FRAMES = 4
const LANGUAGE = 'en'

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

/** Stable dedup key: one GIF per unique action string (Q1). */
async function hashAction(action: string): Promise<string> {
  const norm = action.trim().toLowerCase().replace(/\s+/g, ' ')
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { action } = await req.json().catch(() => ({ action: null }))
    if (!action || typeof action !== 'string' || !action.trim()) {
      return json({ error: 'Missing "action" string.' }, 400)
    }

    const actionHash = await hashAction(action)

    // Look up (or create) the deduped row for this action.
    let { data: row } = await supabase
      .from('action_gifs')
      .select('*')
      .eq('action_hash', actionHash)
      .maybeSingle()

    if (!row) {
      const { data: inserted, error } = await supabase
        .from('action_gifs')
        .insert({ action_hash: actionHash, action: action.trim(), status: 'pending' })
        .select()
        .single()
      // If two requests raced, fall back to the existing row.
      if (error) {
        const { data: existing } = await supabase
          .from('action_gifs').select('*').eq('action_hash', actionHash).single()
        row = existing
      } else {
        row = inserted
      }
    }

    if (row.status === 'done' && row.gif_path) {
      return json({ status: 'done', path: row.gif_path })
    }
    if (row.status === 'error') {
      return json({ status: 'error', error: row.error ?? 'Generation failed.' })
    }

    // Ensure a job exists on the GIF service.
    let jobId: string | null = row.job_id
    if (!jobId) {
      const res = await fetch(`${GIF_BASE}/v1/gifs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: action.trim(), num_frames: NUM_FRAMES, language: LANGUAGE }),
      })
      if (!res.ok) {
        const text = await res.text()
        await supabase.from('action_gifs')
          .update({ status: 'error', error: `submit failed ${res.status}: ${text}`, updated_at: new Date().toISOString() })
          .eq('id', row.id)
        return json({ status: 'error', error: `GIF submit failed (${res.status}).` })
      }
      const created = await res.json()
      jobId = created.job_id
      await supabase.from('action_gifs')
        .update({ job_id: jobId, status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', row.id)
    }

    // Poll the raw endpoint once. The frontend re-invokes until done (Q3/Q7).
    const raw = await fetch(`${GIF_BASE}/v1/gifs/${jobId}/raw`)

    if (raw.status === 200) {
      const bytes = new Uint8Array(await raw.arrayBuffer())
      const path = `${actionHash}.gif`
      const { error: upErr } = await supabase.storage
        .from(GIF_BUCKET)
        .upload(path, bytes, { contentType: 'image/gif', upsert: true })
      if (upErr) {
        return json({ status: 'error', error: `upload failed: ${upErr.message}` })
      }
      await supabase.from('action_gifs')
        .update({ status: 'done', gif_path: path, error: null, updated_at: new Date().toISOString() })
        .eq('id', row.id)
      return json({ status: 'done', path })
    }

    if (raw.status === 409) {
      // Still generating — keep the client polling.
      return json({ status: 'processing' })
    }

    if (raw.status === 404) {
      // In-memory job store was lost (service restarted). Re-queue next call.
      await supabase.from('action_gifs')
        .update({ job_id: null, status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', row.id)
      return json({ status: 'processing' })
    }

    // 500 or other → generation failed.
    const detail = await raw.text().catch(() => '')
    await supabase.from('action_gifs')
      .update({ status: 'error', error: `raw ${raw.status}: ${detail}`.slice(0, 500), updated_at: new Date().toISOString() })
      .eq('id', row.id)
    return json({ status: 'error', error: `Generation failed (${raw.status}).` })
  } catch (err) {
    console.error('generate-gif error:', err)
    return json({ error: String(err) }, 500)
  }
})
