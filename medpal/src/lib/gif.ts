import { supabase } from './supabase'

export type GifResult =
  | { status: 'processing' }
  | { status: 'done'; url: string }
  | { status: 'error'; error: string }

/**
 * Asks the `generate-gif` edge function to advance the GIF job for `action`
 * (the OCR `description`). The function queues the job on first call and polls
 * the GIF service once per call; the caller re-invokes until it resolves.
 * One GIF per unique action — the backend dedupes by a hash of the string.
 */
export async function pollGif(action: string): Promise<GifResult> {
  const { data, error } = await supabase.functions.invoke('generate-gif', {
    body: { action },
  })

  if (error) return { status: 'error', error: error.message }
  if (!data || data.error) return { status: 'error', error: data?.error ?? 'Unknown error' }

  if (data.status === 'done' && data.path) {
    const { data: pub } = supabase.storage.from('gifs').getPublicUrl(data.path)
    return { status: 'done', url: pub.publicUrl }
  }
  if (data.status === 'error') {
    return { status: 'error', error: data.error ?? 'Generation failed.' }
  }
  return { status: 'processing' }
}
