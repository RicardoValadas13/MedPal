import { useRef, useState } from 'react'
import { Phone, PhoneCall, Volume2 } from 'lucide-react'
import {
  playEmergencyAnnouncement,
  prefetchEmergencyAnnouncement,
  type AnnouncementPlayback,
} from '../lib/emergencyVoice'
import { supabase } from '../lib/supabase'
import { pt } from '../i18n/pt'

// Shared 2.5D treatment: solid face + darker bottom edge for depth,
// pressed state sinks the face into the edge.
const FACE =
  'bg-[#dc2626] text-white font-extrabold uppercase tracking-[0.06em] select-none ' +
  'rounded-2xl border-b-[6px] border-[#7f1d1d] ' +
  'shadow-[0_10px_24px_rgba(220,38,38,0.35)] ' +
  'active:translate-y-[4px] active:border-b-2 active:shadow-[0_4px_12px_rgba(220,38,38,0.3)] ' +
  'transition-[transform,border-width,box-shadow] duration-75 ' +
  'flex items-center justify-center gap-3'

type Stage = 'idle' | 'confirm' | 'announcing'

export function EmergencyButton({
  variant = 'floating',
}: {
  variant?: 'floating' | 'banner'
}) {
  const [stage, setStage] = useState<Stage>('idle')
  const playbackRef = useRef<AnnouncementPlayback | null>(null)
  const dialedRef = useRef(false)

  function openConfirm() {
    dialedRef.current = false
    // Start fetching the TTS clip now so it's ready if the user confirms
    prefetchEmergencyAnnouncement()
    setStage('confirm')
  }

  function dial() {
    if (dialedRef.current) return
    dialedRef.current = true
    playbackRef.current?.stop()
    setStage('idle')
    window.location.href = 'tel:112'
  }

  // Play the announcement first — mobile browsers pause web audio once
  // the dialer takes the foreground — then open the dialer.
  async function handleConfirm() {
    setStage('announcing')
    // SMS the family contacts in parallel; strictly fire-and-forget so
    // it can never delay or break the call chain.
    void supabase.functions.invoke('emergency-alert').catch(() => {})
    const playback = await playEmergencyAnnouncement()
    playbackRef.current = playback
    await playback.finished
    dial()
  }

  function cancel() {
    playbackRef.current?.stop()
    dialedRef.current = true // prevent the pending finished→dial chain
    setStage('idle')
  }

  const button =
    variant === 'floating' ? (
      // Round FAB pinned to the bottom-right corner of the 430px app
      // frame, 80px up so it clears the bottom nav.
      <div className="fixed bottom-[80px] left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 pointer-events-none flex justify-end pr-5">
        <button
          onClick={openConfirm}
          aria-label={`${pt.emergency.button} — ${pt.emergency.confirmTitle}`}
          className={`${FACE} !rounded-full animate-emergency-pulse pointer-events-auto w-16 h-16 !flex-col !gap-0`}
        >
          <PhoneCall size={22} strokeWidth={2.5} aria-hidden />
          <span className="text-[13px] leading-tight">112</span>
        </button>
      </div>
    ) : (
      <button
        onClick={openConfirm}
        aria-label={pt.emergency.confirmTitle}
        className={`${FACE} animate-emergency-pulse w-full min-h-[64px] text-2xl`}
      >
        <PhoneCall size={26} strokeWidth={2.5} aria-hidden />
        {pt.emergency.button}
      </button>
    )

  return (
    <>
      {button}

      {stage !== 'idle' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={pt.emergency.confirmTitle}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
          onClick={stage === 'confirm' ? cancel : undefined}
        >
          <div
            className="w-full max-w-[360px] bg-white rounded-3xl p-6 text-center shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {stage === 'confirm' ? (
              <>
                <p className="text-[32px] leading-tight font-bold text-[#192830] mb-2">
                  {pt.emergency.confirmTitle}
                </p>
                <p className="text-lg text-[#43474a] mb-6">{pt.emergency.confirmHint}</p>
                <button
                  onClick={handleConfirm}
                  className={`${FACE} w-full min-h-[68px] text-2xl mb-3`}
                >
                  <Phone size={28} strokeWidth={2.5} aria-hidden />
                  {pt.emergency.callButton}
                </button>
                <button
                  onClick={cancel}
                  className="w-full min-h-[60px] bg-[#efeeea] text-[#192830] text-xl font-semibold rounded-2xl hover:bg-[#e9e8e4] transition"
                >
                  {pt.emergency.cancel}
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-[#ffdad6] flex items-center justify-center mb-4">
                  <Volume2 size={30} className="text-[#ba1a1a] animate-pulse" aria-hidden />
                </div>
                <p className="text-xl leading-snug font-bold text-[#192830] mb-1">
                  {pt.emergency.announcing}
                </p>
                <p className="text-base text-[#43474a] mb-6">{pt.emergency.announcingHint}</p>
                <button onClick={dial} className={`${FACE} w-full min-h-[68px] text-2xl mb-3`}>
                  <Phone size={28} strokeWidth={2.5} aria-hidden />
                  {pt.emergency.callNow}
                </button>
                <button
                  onClick={cancel}
                  className="w-full min-h-[60px] bg-[#efeeea] text-[#192830] text-xl font-semibold rounded-2xl hover:bg-[#e9e8e4] transition"
                >
                  {pt.emergency.cancel}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
