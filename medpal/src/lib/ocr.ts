// Routed through the ocr-proxy edge function to avoid CORS restrictions.
// The edge function calls the OCR API server-side and writes results to Supabase
// using the service role key (bypassing RLS).
const OCR_PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-proxy`

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export function isOcrSupported(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.has(file.type)
}

/**
 * Sends the image to the ocr-proxy edge function which calls the OCR API,
 * then writes prescription + items to Supabase. Returns an error string on failure.
 */
export async function runOcr(
  file: File,
  prescriptionId: string,
): Promise<{ error: string | null }> {
  const form = new FormData()
  form.append('file', file)
  form.append('prescription_id', prescriptionId)

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const res = await fetch(OCR_PROXY, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: form,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    return { error: body?.error ?? `OCR proxy error ${res.status}` }
  }

  return { error: null }
}
