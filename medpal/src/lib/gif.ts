import { supabase } from './supabase'

const GENERATE_GIF_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-gif`

export type GifResult =
  | { status: 'processing' }
  | { status: 'done'; url: string }
  | { status: 'error'; error: string }

export async function pollGif(action: string): Promise<GifResult> {
  const res = await fetch(GENERATE_GIF_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    return { status: 'error', error: body?.error ?? `generate-gif error ${res.status}` }
  }

  const data = await res.json()

  if (data.status === 'done' && data.path) {
    const { data: pub } = supabase.storage.from('gifs').getPublicUrl(data.path)
    return { status: 'done', url: pub.publicUrl }
  }
  if (data.status === 'error') {
    return { status: 'error', error: data.error ?? 'Generation failed.' }
  }
  return { status: 'processing' }
}
