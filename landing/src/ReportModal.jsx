import './ReportModal.css'
import { DEMO_URL } from './QRModal.jsx'

const REPORT_MEDS = [
  { name: 'Lisinopril 10mg', note: 'Blood pressure · Morning', adherence: 98 },
  { name: 'Metformin 500mg', note: 'Morning & Evening', adherence: 95 },
  { name: 'Atorvastatin 20mg', note: 'Cholesterol · Evening', adherence: 92 },
  { name: 'Vitamin D', note: 'After lunch', adherence: 90 },
]

export default function ReportModal({ onClose }) {
  return (
    <div className="report-overlay" onClick={onClose}>
      <div className="report-modal" onClick={e => e.stopPropagation()}>
        <button className="report-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="report-head">
          <span className="report-eyebrow">Sample Report</span>
          <h2 className="report-title">John's Medication Summary</h2>
          <p className="report-period">1–30 June · Ready for your next appointment</p>
        </div>

        <div className="report-score">
          <div className="report-ring"><span>94%</span></div>
          <div className="report-score-text">
            <strong>Excellent adherence</strong>
            <p>28 of 30 days fully on track</p>
          </div>
        </div>

        <div className="report-callout">
          <span className="report-callout-icon">🩺</span>
          <p>Heading to your next doctor's appointment? You'll <strong>never have to remember everything you've been taking</strong> — it's all recorded here, ready to share with your doctor in one tap.</p>
        </div>

        <div className="report-meds">
          <h3>Medications on record</h3>
          <ul>
            {REPORT_MEDS.map(m => (
              <li key={m.name}>
                <div className="report-med-info">
                  <span className="report-med-name">{m.name}</span>
                  <span className="report-med-note">{m.note}</span>
                </div>
                <span className={`report-med-adh ${m.adherence >= 95 ? 'good' : ''}`}>{m.adherence}%</span>
              </li>
            ))}
          </ul>
        </div>

        <a className="btn btn-primary report-cta" href={DEMO_URL} target="_blank" rel="noopener noreferrer">
          Try MedPal — keep your own record
        </a>
        <p className="report-foot">🔒 Shared securely with Doctor Mode — your data stays yours.</p>
      </div>
    </div>
  )
}
