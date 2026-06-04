import { useState } from 'react'
import './App.css'
import QRModal from './QRModal.jsx'

const SCREENS = [
  { id: 'today',     label: 'Today',     src: '/screens/today.png',     title: 'Daily Dose Tracker', desc: "See every medication scheduled for today. Mark doses taken, snooze a reminder, or check what's next — in seconds, one-handed." },
  { id: 'meds',      label: 'My Meds',   src: '/screens/meds.png',      title: 'Your Digital Medicine Cabinet', desc: 'Every medication in one place — daily use, as-needed, and past treatments. Scan a new prescription or add one manually at any time.' },
  { id: 'chat',      label: 'Assistant', src: '/screens/chat.png',       title: 'MedPal Assistant', desc: "Feeling off? Tell MedPal. It cross-checks your symptoms against your current medications and can alert your doctor or care team if needed." },
  { id: 'analytics', label: 'Reports',   src: '/screens/analytics.png', title: 'Reports & Adherence', desc: 'Track your adherence over 30 days. Log mood and side effects daily. Flip on Doctor Mode to share a clean summary at your next appointment.' },
]

const FEATURE_GROUPS = [
  {
    category: 'Prescription Management',
    icon: '📋',
    features: [
      'Upload any PDF prescription — extracted directly, no AI needed, instant',
      'Snap a photo of a paper or handwritten prescription — AI reads it in seconds',
      'Review and confirm every medication before anything is saved — non-skippable safety gate',
      'Drug names matched against the official INFARMED medical database',
    ],
  },
  {
    category: 'Smart Reminders & Tracking',
    icon: '🔔',
    features: [
      'Personalised intake reminders based on your exact schedule and routine',
      'Refill alerts before you run out — no gaps in treatment',
      'Daily mood check-in and side effect logging — know your patterns over time',
      'AI voice calls for users who miss app notifications — designed for elderly users',
    ],
  },
  {
    category: 'Pill Organiser Verification',
    icon: '📦',
    features: [
      'Snap a photo of your filled MedPal Smart Box',
      'AI verifies each slot — confirms correct medication and dose',
      'Flags mismatches or empty slots before you take them',
    ],
  },
  {
    category: 'Medical Support Team',
    icon: '🩺',
    features: [
      'Real doctors and pharmacists answer your prescription questions',
      'AI triages your question and routes it to the right specialist instantly',
      'Your team knows your exact medications and history — no re-explaining',
      'No waiting rooms, no hold music',
      'End-to-end encrypted messages — every conversation stays private',
    ],
  },
  {
    category: 'Analytics & Doctor Connectivity',
    icon: '📊',
    features: [
      'Clean dashboard of all active, paused, and completed medications',
      'One-tap Doctor Mode — share adherence trends and full history instantly',
      'Side effects and mood logged daily, visible to your care team',
      'Export-ready report for appointments and medical reviews',
    ],
  },
  {
    category: 'Visual Learning & Calendar',
    icon: '🎓',
    features: [
      'AI-generated visual guides for your medication or exercise routine',
      'Step-by-step animated instructions linked to your care plan',
      'Full calendar sync — your medication schedule in Google or Apple Calendar',
    ],
  },
]

const PATIENT_BENEFITS = [
  { icon: '⚡', title: 'Effortless independence', desc: 'Use Magic Scan to set everything up in seconds. Point the camera, confirm your medications, and MedPal organises your entire schedule automatically.' },
  { icon: '🛡️', title: 'Safety in every dose', desc: 'Smart reminders adapt to your routine and confirm you loaded the box correctly. Reduce errors and feel relaxed every day.' },
  { icon: '🤝', title: 'A friend who cares', desc: 'A voice and chat assistant that listens to how you feel and understands what you are going through — more than an alarm, a companion.' },
]

const CAREGIVER_BENEFITS = [
  { icon: '🔔', title: 'Remote monitoring', desc: 'Receive real-time notifications when your family member takes — or forgets — their medication. Stay informed without being intrusive.' },
  { icon: '📦', title: 'Proactive care', desc: 'MedPal alerts you when medication stocks are running low so you can reorder in time. No last-minute pharmacy runs.' },
  { icon: '💬', title: 'Always in the loop', desc: 'Access a clear, simple view of their adherence and mood logs — the full picture, without needing to ask.' },
]

const DOCTOR_BENEFITS = [
  { icon: '📋', title: 'Real Adherence Reports', desc: 'See exactly when and how your patient takes their medication. Eliminate memory bias. Get a clear overview of the treatment routine between consultations.' },
  { icon: '⏱️', title: 'Consultation Optimisation', desc: 'Transform "Doctor Mode" into a rapid diagnostic tool with clear charts. Spend less time collecting history and more time on direct care.' },
  { icon: '⚠️', title: 'Interaction Alerts', desc: 'The assistant monitors patient-reported symptoms in real time and flags potential serious side effects or drug interactions proactively.' },
]

const DEMO_CARDS = [
  { icon: '📷', title: 'Try Magic Scan', desc: 'Add prescriptions instantly using your camera.' },
  { icon: '💬', title: 'Talk to Assistant', desc: 'Ask questions about your schedule by voice or text.' },
  { icon: '📊', title: 'View Sample Report', desc: 'Track your adherence with clear charts.' },
]

export default function App() {
  const [activeScreen, setActiveScreen] = useState('today')
  const [showQR, setShowQR] = useState(false)
  const current = SCREENS.find(s => s.id === activeScreen)

  return (
    <div className="app">
      {showQR && <QRModal onClose={() => setShowQR(false)} />}
      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner container">
          <span className="nav-logo">
            <span className="logo-mark">✚</span> MedPal
          </span>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#screens">App</a>
            <a href="#patients">Patients</a>
            <a href="#doctors">Doctors</a>
            <a href="#caregivers">Caregivers</a>
          </div>
          <a href="#download" className="btn btn-primary btn-sm">Get Started</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner container">
          <div className="hero-text">
            <span className="badge">Human-First Healthcare</span>
            <h1>Care that<br /><span className="accent">understands you.</span></h1>
            <p className="hero-sub">Manage your medications with technical precision and human warmth. MedPal keeps you on track, your doctor informed, and the people you love at peace — every single day.</p>
            <div className="hero-actions">
              <a href="#product" className="btn btn-primary">Order the Box — €19.99</a>
              <a href="#screens" className="btn btn-ghost">See how it works →</a>
            </div>
            <div className="hero-stats">
              <div className="stat"><strong>94%</strong><span>average adherence rate</span></div>
              <div className="stat-divider" />
              <div className="stat"><strong>30 sec</strong><span>to scan a prescription</span></div>
              <div className="stat-divider" />
              <div className="stat"><strong>24/7</strong><span>medical support team</span></div>
            </div>
          </div>
          <div className="hero-image">
            <div className="phone-frame">
              <img src="/screens/hero.png" alt="MedPal app" />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features section" id="features">
        <div className="container">
          <div className="section-header">
            <span className="badge">Everything Included</span>
            <h2>Six systems.<br />One box.</h2>
            <p>MedPal combines hardware, AI, and a real medical team into a single product that works for patients, carers, and doctors alike.</p>
          </div>
          <div className="features-grid">
            {FEATURE_GROUPS.map(g => (
              <div className="feature-card" key={g.category}>
                <span className="feature-icon">{g.icon}</span>
                <h3>{g.category}</h3>
                <ul className="feature-list">
                  {g.features.map(f => (
                    <li key={f}><span className="feat-check">✓</span>{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="trust-strip">
        <div className="container">
          <div className="trust-items">
            <div className="trust-item"><span>🔒</span><strong>End-to-end encrypted</strong><span className="trust-sub">All messages and health data</span></div>
            <div className="trust-divider" />
            <div className="trust-item"><span>🇪🇺</span><strong>GDPR compliant</strong><span className="trust-sub">Your data belongs to you</span></div>
            <div className="trust-divider" />
            <div className="trust-item"><span>🩺</span><strong>Verified medical team</strong><span className="trust-sub">Certified doctors & pharmacists</span></div>
            <div className="trust-divider" />
            <div className="trust-item"><span>🔐</span><strong>Zero data selling</strong><span className="trust-sub">Never shared with third parties</span></div>
          </div>
        </div>
      </section>

      {/* PRODUCT BOX */}
      <section className="product section" id="product">
        <div className="container">
          <div className="product-inner">
            <div className="product-images">
              <img className="product-img-main" src="/screens/box1.png" alt="MedPal Smart Box" />
              <img className="product-img-secondary" src="/screens/box2.png" alt="MedPal Smart Box numbered" />
            </div>
            <div className="product-info">
              <span className="badge badge-green">The Product</span>
              <h2>The box that keeps everything on track.</h2>
              <p className="product-lead">The <strong>MedPal Smart Box</strong> is a 7×4 weekly pill organiser with 28 compartments — one for each time of day, every day of the week. Pair it with the app and it becomes a smart, connected system.</p>
              <ul className="product-features">
                <li><span>✓</span> 28 compartments — Morning, Afternoon, Evening, Night</li>
                <li><span>✓</span> Scan the box to verify each slot is filled correctly</li>
                <li><span>✓</span> Compact, travel-friendly, transparent lid</li>
                <li><span>✓</span> App included — no subscription, ever</li>
                <li><span>✓</span> Medical support team included</li>
              </ul>
              <div className="product-price-block">
                <div className="product-price">
                  <span className="price-value">€19.99</span>
                  <span className="price-note">Box + App + Medical Support. One-time payment.</span>
                </div>
                <a href="#download" className="btn btn-primary">Order Now</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* APP SCREENS */}
      <section className="screens section" id="screens">
        <div className="container">
          <div className="section-header">
            <span className="badge">The App</span>
            <h2>Designed for real life.</h2>
            <p>Every screen is built to be used in seconds — whether you just woke up or are rushing to an appointment.</p>
          </div>
          <div className="screens-showcase">
            <div className="screen-tabs">
              {SCREENS.map(s => (
                <button
                  key={s.id}
                  className={`tab ${activeScreen === s.id ? 'tab-active' : ''}`}
                  onClick={() => setActiveScreen(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="screen-content">
              <div className="screen-phone">
                <img key={current.id} src={current.src} alt={current.title} />
              </div>
              <div className="screen-info">
                <h3>{current.title}</h3>
                <p>{current.desc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PATIENT BENEFITS */}
      <section className="benefits section" id="patients">
        <div className="container">
          <div className="benefits-inner">
            <div className="benefits-image">
              <div className="phone-frame phone-frame-sm">
                <img src="/screens/patient.png" alt="Patient view" />
              </div>
            </div>
            <div className="benefits-text">
              <span className="badge badge-green">For Patients</span>
              <h2>Your health back<br />in your hands.</h2>
              <p className="benefits-lead">Simplify your care routine with a smart assistant that understands and protects every step of your treatment.</p>
              <ul className="benefit-list">
                {PATIENT_BENEFITS.map(b => (
                  <li key={b.title} className="benefit-item">
                    <span className="benefit-icon">{b.icon}</span>
                    <div>
                      <strong>{b.title}</strong>
                      <p>{b.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <button className="btn btn-primary" onClick={() => setShowQR(true)}>Start Now</button>
            </div>
          </div>
        </div>
      </section>

      {/* CAREGIVER BENEFITS */}
      <section className="benefits benefits-sage section" id="caregivers">
        <div className="container">
          <div className="benefits-inner">
            <div className="benefits-text">
              <span className="badge badge-green">For Caregivers & Family</span>
              <h2>The peace of mind of knowing they are well.</h2>
              <p className="benefits-lead">MedPal is the ideal partner for caregivers and family. Follow the health routine of those you love with safety, clarity, and empathy.</p>
              <ul className="benefit-list">
                {CAREGIVER_BENEFITS.map(b => (
                  <li key={b.title} className="benefit-item">
                    <span className="benefit-icon">{b.icon}</span>
                    <div>
                      <strong>{b.title}</strong>
                      <p>{b.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <button className="btn btn-primary" onClick={() => setShowQR(true)}>Start Now</button>
            </div>
            <div className="benefits-image">
              <div className="phone-frame phone-frame-sm">
                <img src="/screens/caregiver.png" alt="Caregiver view" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DOCTOR BENEFITS */}
      <section className="benefits benefits-dark section" id="doctors">
        <div className="container">
          <div className="benefits-inner benefits-inner-reverse">
            <div className="benefits-text">
              <span className="badge badge-light">For Healthcare Professionals</span>
              <h2>Precise data for safe clinical decisions.</h2>
              <p className="benefits-lead">Transform patient monitoring with real-time insights. MedPal connects you to the treatment journey — empathy backed by real data.</p>
              <ul className="benefit-list">
                {DOCTOR_BENEFITS.map(b => (
                  <li key={b.title} className="benefit-item">
                    <span className="benefit-icon">{b.icon}</span>
                    <div>
                      <strong>{b.title}</strong>
                      <p>{b.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <a href="#download" className="btn btn-outline-light">Request Early Access</a>
            </div>
            <div className="benefits-image">
              <div className="phone-frame phone-frame-sm">
                <img src="/screens/doctor.png" alt="Doctor view" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="testimonial section">
        <div className="container">
          <div className="testimonial-card">
            <span className="quote-mark">"</span>
            <blockquote>MedPal changed the way I care for my parents. I no longer need to call every day to check if they took their medication — the app alerts me automatically, and a box running out is never a surprise anymore. It's a huge relief.</blockquote>
            <div className="testimonial-author">
              <div className="author-avatar">M</div>
              <div>
                <strong>Mariana S.</strong>
                <span>Daughter & primary carer</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section className="demo section" id="demo">
        <div className="container">
          <div className="section-header">
            <span className="badge">Try It First</span>
            <h2>Explore MedPal.</h2>
            <p>Discover how we simplify your health routine before committing to anything.</p>
          </div>
          <div className="demo-inner">
            <div className="demo-phone">
              <div className="phone-frame">
                <img src="/screens/demo.png" alt="MedPal demo mode" />
              </div>
            </div>
            <div className="demo-cards">
              {DEMO_CARDS.map(c => (
                <div className="demo-card" key={c.title}>
                  <span className="demo-icon">{c.icon}</span>
                  <div>
                    <strong>{c.title}</strong>
                    <p>{c.desc}</p>
                  </div>
                  <span className="demo-arrow">→</span>
                </div>
              ))}
              <button className="btn btn-primary" style={{marginTop: '8px'}} onClick={() => setShowQR(true)}>Create My Account</button>
            </div>
          </div>
        </div>
      </section>

      {/* DOWNLOAD CTA */}
      <section className="download section" id="download">
        <div className="container">
          <div className="download-inner">
            <h2>Ready for more peace of mind?</h2>
            <p>Join thousands of people who have simplified their medication routine with MedPal.</p>
            <div className="store-buttons">
              <a href="#" className="store-btn">
                <span className="store-icon">🍎</span>
                <div><span>Download on the</span><strong>App Store</strong></div>
              </a>
              <a href="#" className="store-btn">
                <span className="store-icon">▶</span>
                <div><span>Get it on</span><strong>Google Play</strong></div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container footer-inner">
          <span className="nav-logo"><span className="logo-mark">✚</span> MedPal</span>
          <p className="footer-copy">© 2024 MedPal Health. Human-First medication management.</p>
          <div className="footer-links">
            <a href="#">Features</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Support</a>
            <a href="#">Download</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
