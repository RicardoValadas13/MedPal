import { useState } from 'react'
import { Phone, PhoneCall } from 'lucide-react'
import { playEmergencyAnnouncement } from '../lib/emergencyVoice'
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

export function EmergencyButton({
  variant = 'floating',
}: {
  variant?: 'floating' | 'banner'
}) {
  const [confirming, setConfirming] = useState(false)

  const button =
    variant === 'floating' ? (
      // Sits above the bottom nav (72px) inside the 430px app frame.
      <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 z-30 pointer-events-none">
        <button
          onClick={() => setConfirming(true)}
          aria-label={pt.emergency.confirmTitle}
          className={`${FACE} animate-emergency-pulse pointer-events-auto w-full min-h-[72px] text-[26px]`}
        >
          <PhoneCall size={30} strokeWidth={2.5} aria-hidden />
          {pt.emergency.button}
        </button>
      </div>
    ) : (
      <button
        onClick={() => setConfirming(true)}
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

      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={pt.emergency.confirmTitle}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
          onClick={() => setConfirming(false)}
        >
          <div
            className="w-full max-w-[360px] bg-white rounded-3xl p-6 text-center shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-[32px] leading-tight font-bold text-[#192830] mb-2">
              {pt.emergency.confirmTitle}
            </p>
            <p className="text-lg text-[#43474a] mb-6">{pt.emergency.confirmHint}</p>
            <a
              href="tel:112"
              // Start the spoken announcement (name + address, 5x with 2s
              // pauses) in parallel with opening the dialer — never blocking.
              onClick={() => void playEmergencyAnnouncement()}
              className={`${FACE} w-full min-h-[68px] text-2xl mb-3`}
            >
              <Phone size={28} strokeWidth={2.5} aria-hidden />
              {pt.emergency.callButton}
            </a>
            <button
              onClick={() => setConfirming(false)}
              className="w-full min-h-[60px] bg-[#efeeea] text-[#192830] text-xl font-semibold rounded-2xl hover:bg-[#e9e8e4] transition"
            >
              {pt.emergency.cancel}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
