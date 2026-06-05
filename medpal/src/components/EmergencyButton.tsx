import { useRef, useState } from 'react'
import { Phone, PhoneCall, Volume2 } from 'lucide-react'
import {
  playEmergencyAnnouncement,
  prefetchEmergencyAnnouncement,
  type AnnouncementPlayback,
} from '../lib/emergencyVoice'
import { supabase } from '../lib/supabase'
import { pt } from '../i18n/pt'
import { useEmergencySettings } from '../lib/emergencySettings'

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
  variant?: 'floating' | 'banner' | 'inline'
}) {
  const [stage, setStage] = useState<Stage>('idle')
  const playbackRef = useRef<AnnouncementPlayback | null>(null)
  const dialedRef = useRef(false)
  const { caregiverNumber } = useEmergencySettings()

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

  function dialDirect(number: string) {
    setStage('idle')
    window.location.href = `tel:${number}`
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
      <div className="fixed top-[76px] left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 pointer-events-none flex justify-end pr-5">
        <button
          onClick={openConfirm}
          aria-label={`${pt.emergency.button} — ${pt.emergency.confirmTitle}`}
          className="pointer-events-auto flex items-center gap-2 px-4 h-11 rounded-full bg-[#efeeea] text-[#192830] font-semibold text-sm shadow-sm transition active:scale-95"
        >
          <Phone size={16} strokeWidth={2.5} aria-hidden />
          <span>112</span>
        </button>
      </div>
    ) : variant === 'inline' ? (
      <button
        data-walkthrough="topbar-emergency"
        onClick={openConfirm}
        aria-label={`${pt.emergency.button} — ${pt.emergency.confirmTitle}`}
        className="px-3 h-9 flex items-center justify-center rounded-xl bg-[#ba1a1a] text-white hover:bg-[#9b1515] transition-colors active:scale-95 font-bold text-sm"
      >
        112
      </button>
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
            className="w-full max-w-[360px] bg-white rounded-3xl p-6 text-center shadow-2xl overflow-y-auto max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {stage === 'confirm' ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-center gap-2 mb-1">
                  <PhoneCall size={20} className="text-[#ba1a1a]" strokeWidth={2.5} aria-hidden />
                  <p className="text-[26px] leading-tight font-bold text-[#192830]">
                    {pt.emergency.confirmTitle}
                  </p>
                </div>
                <p className="text-base text-[#43474a] mb-5">{pt.emergency.confirmHint}</p>

                {/* Primary: 112 */}
                <button
                  onClick={handleConfirm}
                  className={`${FACE} w-full min-h-[72px] mb-5`}
                >
                  <Phone size={24} strokeWidth={2.5} className="flex-shrink-0" aria-hidden />
                  <span className="flex flex-col items-start gap-0.5">
                    <span className="text-xl">{pt.emergency.callButton}</span>
                    <span className="text-[11px] font-semibold normal-case tracking-normal opacity-80">
                      {pt.emergency.call112Hint}
                    </span>
                  </span>
                </button>

                {/* Secondary: Caregiver — only shown when a number is configured */}
                {caregiverNumber && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px bg-[#e8e6e0]" />
                      <span className="text-sm text-[#6e7477] font-medium">{pt.emergency.orDivider}</span>
                      <div className="flex-1 h-px bg-[#e8e6e0]" />
                    </div>
                    <button
                      onClick={() => dialDirect(caregiverNumber)}
                      className="w-full min-h-[60px] flex items-center gap-4 px-4 bg-[#f0f7f1] rounded-2xl border border-[#a3c9a8] hover:bg-[#dff0e3] transition-colors active:scale-95 mb-4"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#cbebcd] flex items-center justify-center flex-shrink-0">
                        <Phone size={17} strokeWidth={2.5} className="text-[#49654d]" aria-hidden />
                      </div>
                      <span className="flex flex-col items-start">
                        <span className="text-xl font-bold text-[#49654d] leading-tight">{pt.emergency.callCaregiver}</span>
                        <span className="text-sm text-[#49654d] opacity-70">{caregiverNumber}</span>
                      </span>
                    </button>
                  </>
                )}

                <button
                  onClick={cancel}
                  className="w-full min-h-[52px] bg-[#efeeea] text-[#43474a] text-lg font-semibold rounded-2xl hover:bg-[#e9e8e4] transition"
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
