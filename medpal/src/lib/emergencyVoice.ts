import { supabase } from './supabase'

// The clip already contains 5 repetitions with 2s pauses baked in
// server-side (see supabase/functions/emergency-voice). It is played
// BEFORE opening the dialer, because iOS/Android pause web audio and
// throttle JS timers once the dialer takes the foreground.

// How long to wait for the clip if it isn't fetched yet when the user
// confirms — past this we dial without the announcement.
const READY_GRACE_MS = 4000
// Hard cap on playback before dialing anyway (clip is ~50s).
const MAX_PLAYBACK_MS = 75_000

let prefetched: Promise<Blob | null> | null = null

async function fetchClip(): Promise<Blob | null> {
  try {
    const { data, error } = await supabase.functions.invoke('emergency-voice')
    // A JSON response means the announcement is disabled or unavailable
    if (error || !(data instanceof Blob) || !data.type.startsWith('audio/')) return null
    return data
  } catch {
    return null
  }
}

/** Start fetching the clip early (e.g. when the confirm dialog opens). */
export function prefetchEmergencyAnnouncement(): void {
  if (!prefetched) {
    prefetched = fetchClip().then(clip => {
      // Don't cache failures — retry on the next emergency
      if (!clip) prefetched = null
      return clip
    })
  }
}

export interface AnnouncementPlayback {
  /** Resolves when playback finishes, fails, or is stopped. */
  finished: Promise<void>
  /** Stops playback immediately (resolves `finished`). */
  stop: () => void
}

/**
 * Plays the emergency announcement and resolves `finished` when done.
 * Resolves quickly when no clip is available (disabled, incomplete
 * profile, network failure, not ready within READY_GRACE_MS) — the
 * emergency call is never held hostage by the audio.
 */
export async function playEmergencyAnnouncement(): Promise<AnnouncementPlayback> {
  let stop: () => void = () => {}
  let stopped = false

  const finished = (async () => {
    prefetchEmergencyAnnouncement()
    const clip = await Promise.race([
      prefetched as Promise<Blob | null>,
      new Promise<null>(resolve => setTimeout(() => resolve(null), READY_GRACE_MS)),
    ])
    if (!clip || stopped) return

    const url = URL.createObjectURL(clip)
    const audio = new Audio(url)

    await new Promise<void>(resolve => {
      const done = () => {
        clearTimeout(cap)
        audio.pause()
        URL.revokeObjectURL(url)
        resolve()
      }
      const cap = setTimeout(done, MAX_PLAYBACK_MS)
      stop = done
      audio.onended = done
      audio.onerror = done
      audio.play().catch(done)
    })
  })()

  return {
    finished,
    stop: () => {
      stopped = true
      stop()
    },
  }
}
