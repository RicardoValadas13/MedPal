const OCR_PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-proxy`

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export function isOcrSupported(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.has(file.type)
}

export async function runOcr(
  file: File,
  prescriptionId: string,
): Promise<{ error: string | null }> {
  const form = new FormData()
  form.append('file', file)
  form.append('prescription_id', prescriptionId)

  const res = await fetch(OCR_PROXY, { method: 'POST', body: form })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    return { error: body?.error ?? `OCR proxy error ${res.status}` }
  }

  return { error: null }
}
