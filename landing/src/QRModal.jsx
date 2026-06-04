import { QRCodeSVG } from 'qrcode.react'
import './QRModal.css'

export const DEMO_URL = 'https://project-wo2i5.vercel.app/'

export default function QRModal({ onClose }) {
  return (
    <div className="qr-overlay" onClick={onClose}>
      <div className="qr-modal" onClick={e => e.stopPropagation()}>
        <button className="qr-close" onClick={onClose} aria-label="Close">✕</button>
        <p className="qr-eyebrow">Open on your phone</p>
        <h2 className="qr-title">Scan to try MedPal</h2>
        <div className="qr-code">
          <QRCodeSVG
            value={DEMO_URL}
            size={200}
            bgColor="#ffffff"
            fgColor="#192830"
            level="M"
            includeMargin={false}
          />
        </div>
        <a className="qr-url" href={DEMO_URL} target="_blank" rel="noopener noreferrer">{DEMO_URL}</a>
      </div>
    </div>
  )
}
