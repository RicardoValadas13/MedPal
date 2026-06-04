import { supabase } from './supabase'

// Repeat the announcement so a 112 operator has time to write
// the name and address down.
const REPEAT_COUNT = 5
const PAUSE_MS = 2000

/**
 * Fetches the TTS emergency announcement (name + address) and plays it
 * REPEAT_COUNT times with PAUSE_MS between repetitions.
 *
 * Fire-and-forget by design: it must never block or break the 112 call,
 * so all failures (voice disabled, incomplete profile, network/TTS error,
 * autoplay restriction) resolve silently.
 */
export async function playEmergencyAnnouncement(): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('emergency-voice')

    // JSON response means the announcement is disabled or unavailable
    if (error || !(data instanceof Blob) || !data.type.startsWith('audio/')) return

    const url = URL.createObjectURL(data)
    const audio = new Audio(url)
    let played = 1

    audio.onended = () => {
      if (played < REPEAT_COUNT) {
        played++
        setTimeout(() => {
          audio.currentTime = 0
          void audio.play().catch(() => URL.revokeObjectURL(url))
        }, PAUSE_MS)
      } else {
        URL.revokeObjectURL(url)
      }
    }

    await audio.play()
  } catch {
    // Never let the announcement interfere with the emergency call
  }
}
