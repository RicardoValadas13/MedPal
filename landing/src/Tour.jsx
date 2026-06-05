import { useEffect, useState, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { DEMO_URL } from './QRModal.jsx'
import './Tour.css'

// The opener + a guided run through the best features + a big final QR screen.
const STOPS = [
  { type: 'title', title: 'Now we have MedPal', sub: 'Care that understands you.' },
  { type: 'media', title: 'Manage every prescription', sub: 'Scan a paper or PDF prescription and MedPal builds your whole medicine cabinet — no typing.', img: '/screens/meds.png' },
  { type: 'media', title: 'Reminders & alarms that work', sub: 'A reminder for every dose, refill alerts before you run out, and even a voice call if you miss one.', img: '/screens/today.png' },
  { type: 'media', title: 'A medical team on call', sub: 'Real doctors and pharmacists, plus an AI assistant that speaks over 100 languages.', img: '/screens/chat.png' },
  { type: 'media', title: 'Reports for your doctor', sub: 'See adherence at a glance and share your full history in a single tap.', img: '/screens/analytics.png' },
  { type: 'media', title: 'Peace of mind for family', sub: 'Caregivers get notified when a dose is taken or missed — and before the box runs out.', img: '/screens/caregiver.png' },
  { type: 'media', title: 'The free Smart Box', sub: 'A 28-day pill organiser, included free. Scan it and MedPal checks every slot.', img: '/screens/box1.png' },
  { type: 'qr', title: 'Scan to try MedPal', sub: 'Point your phone camera at the code.' },
]

const LAST = STOPS.length - 1
const MEDIA_COUNT = STOPS.filter(s => s.type === 'media').length

export default function Tour({ onClose }) {
  const [i, setI] = useState(0)
  const stop = STOPS[i]

  const next = useCallback(() => setI(v => Math.min(v + 1, LAST)), [])
  const prev = useCallback(() => setI(v => Math.max(v - 1, 0)), [])

  useEffect(() => {
    const onKey = (e) => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); next() }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); prev() }
      else if (e.key === 'Escape') { onClose() }
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow }
  }, [next, prev, onClose])

  return (
    <div className={`tour tour-${stop.type}`}>
      <button className="tour-close" onClick={onClose} aria-label="Close tour">✕</button>

      {/* Click the stage to advance (works with presentation clickers too) */}
      <div className="tour-stage" onClick={next}>
        {stop.type === 'title' && (
          <div className="tour-title-slide">
            <img className="tour-logo" src="/logo.png" alt="" />
            <h1 className="tour-h1">{stop.title}</h1>
            <p className="tour-sub">{stop.sub}</p>
          </div>
        )}

        {stop.type === 'media' && (
          <div className="tour-media-slide">
            <div className="tour-media-text">
              <span className="tour-kicker">Stop {i} of {MEDIA_COUNT}</span>
              <h2 className="tour-h2">{stop.title}</h2>
              <p className="tour-sub">{stop.sub}</p>
            </div>
            <div className="tour-media-img">
              <img src={stop.img} alt={stop.title} />
            </div>
          </div>
        )}

        {stop.type === 'qr' && (
          <div className="tour-qr-slide">
            <h2 className="tour-h2 tour-qr-title">{stop.title}</h2>
            <div className="tour-qr-box">
              <QRCodeSVG
                value={DEMO_URL}
                size={520}
                bgColor="#ffffff"
                fgColor="#192830"
                level="H"
                includeMargin={false}
                imageSettings={{ src: '/logo.png', height: 84, width: 42, excavate: true }}
              />
            </div>
            <a className="tour-qr-url" href={DEMO_URL} target="_blank" rel="noopener noreferrer">{DEMO_URL}</a>
            <p className="tour-sub">{stop.sub}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="tour-controls" onClick={e => e.stopPropagation()}>
        <button className="tour-nav-btn" onClick={prev} disabled={i === 0} aria-label="Previous">←</button>
        <div className="tour-dots">
          {STOPS.map((s, idx) => (
            <button
              key={idx}
              className={`tour-dot ${idx === i ? 'is-active' : ''}`}
              onClick={() => setI(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
        <button className="tour-nav-btn" onClick={next} disabled={i === LAST} aria-label="Next">→</button>
      </div>
    </div>
  )
}
