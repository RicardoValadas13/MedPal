import { QRCodeSVG } from 'qrcode.react'
import './QRModal.css'

const DEMO_URL = 'https://demo.medpal.pt'

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
        <p className="qr-url">{DEMO_URL}</p>
        <p className="qr-note">Point your phone camera at the code to open the demo instantly — no app store needed.</p>
      </div>
    </div>
  )
}
