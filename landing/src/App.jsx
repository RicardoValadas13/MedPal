import { useState } from 'react'
import './App.css'
import QRModal, { DEMO_URL } from './QRModal.jsx'

const SCREENS = [
  { id: 'today',     label: 'Today',     src: '/screens/today.png',     title: 'Your Day at a Glance', desc: 'All your medications for the day — morning to night — with one tap to mark each dose taken. Plus upcoming appointments and notes, all in one place.' },
  { id: 'meds',      label: 'My Meds',   src: '/screens/meds.png',      title: 'Your Digital Medicine Cabinet', desc: 'Daily use, as-needed, and completed treatments — organised with icons and status. Tap Scan Prescription to add a new one in seconds.' },
  { id: 'chat',      label: 'Assistant', src: '/screens/chat.png',       title: 'MedPal Assistant', desc: "Feeling off? Tell MedPal. It cross-checks your symptoms against your current medications and can alert your doctor or care team if needed." },
  { id: 'analytics', label: 'Reports',   src: '/screens/analytics.png', title: 'Reports & Adherence', desc: 'Track your overall adherence — 94% Excellent over 30 days. Log side effects. Flip on Doctor Mode to share a clean summary at your next appointment.' },
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
  {
    category: 'AI Chat Agent',
    icon: '🤖',
    features: [
      'Medical assistant powered by Gemini 2.5 Flash',
      'Answers medication questions, app support, and basic health guidance',
      'Available in English and Portuguese',
      'Never diagnoses or changes dosages — always refers you to your doctor',
      'Detects emergency keywords and triggers the emergency banner automatically',
      'Full conversation history saved securely, with a disclaimer banner always visible',
    ],
  },
  {
    category: 'Emergency System',
    icon: '🚨',
    features: [
      'Big red 2.5D emergency button — always visible, bottom-centre, full width',
      'Pulse animation drawing attention for elderly users with low vision (respects reduced-motion)',
      'AAA contrast — white on red, 26px extrabold',
      'Safety gate — "Call 112?" confirmation before it dials, then opens tel:112 instantly',
      'ElevenLabs voice plays your details once connected: name, address and floor',
      'Repeats 5× with 2-second pauses so the operator can write everything down — EN + PT',
    ],
  },
  {
    category: 'Caregiver Mode',
    icon: '🔒',
    features: [
      '4-digit PIN set by the caregiver, stored as a bcrypt hash',
      'Locks for 30 seconds after 3 wrong attempts',
      'Toggle missed-medication alerts and the emergency voice on or off',
      'Mark which medications are critical',
      'Edit the patient address and emergency info',
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

  // On mobile, open the demo directly — no need to scan a QR code from the same device.
  const handleStart = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches) {
      window.open(DEMO_URL, '_blank', 'noopener,noreferrer')
    } else {
      setShowQR(true)
    }
  }

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
              <a href="#download" className="btn btn-primary">Start for €3.99/month</a>
              <a href="#screens" className="btn btn-ghost">See how it works →</a>
            </div>
            <p className="hero-gift">🎁 Subscribe and get the <strong>MedPal Smart Box free</strong> — shipped to your door.</p>
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

      {/* VIDEO */}
      <section className="video-section section" id="video">
        <div className="container">
          <div className="section-header">
            <span className="badge">See It in Action</span>
            <h2>Watch how MedPal works.</h2>
            <p>From prescription scan to doctor report — everything in one box.</p>
          </div>
          <div className="video-wrapper">
            <video
              controls
              playsInline
              className="promo-video"
            >
              <source src="/medpal-promo.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features section" id="features">
        <div className="container">
          <div className="section-header">
            <span className="badge">Everything Included</span>
            <h2>Nine systems.<br />One subscription.</h2>
            <p>Your MedPal plan combines AI, a real medical team, and a free Smart Box into one service that works for patients, carers, and doctors alike.</p>
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
            </div>
            <div className="product-info">
              <span className="badge badge-green">Free With Your Plan</span>
              <h2>Subscribe and the box is on us.</h2>
              <p className="product-lead">Every MedPal subscription ships with the <strong>MedPal Smart Box</strong> — a 28-slot monthly pill organiser with numbered compartments, one per day. No extra cost. It pairs seamlessly with the app you're already paying for.</p>
              <ul className="product-features">
                <li><span>✓</span> 28 numbered compartments — one per day of the month</li>
                <li><span>✓</span> Scan the box to verify each slot is filled correctly</li>
                <li><span>✓</span> Compact, travel-friendly, translucent lid</li>
                <li><span>✓</span> Yours free — included with any MedPal plan</li>
                <li><span>✓</span> Medical support team included</li>
              </ul>
              <div className="product-price-block">
                <div className="product-price">
                  <span className="price-strike">€19.99</span>
                  <span className="price-value">Free</span>
                  <span className="price-note">Included free with your MedPal subscription.</span>
                </div>
                <a href="#download" className="btn btn-primary">See Plans</a>
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
              <button className="btn btn-primary" onClick={handleStart}>Start Now</button>
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
              <button className="btn btn-primary" onClick={handleStart}>Start Now</button>
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
              <button className="btn btn-primary" style={{marginTop: '8px'}} onClick={handleStart}>Create My Account</button>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="download section" id="download">
        <div className="container">
          <div className="section-header">
            <span className="badge">Simple Pricing</span>
            <h2>One plan. Everything included.</h2>
            <p>The app, the medical support team, and a free Smart Box — all in one subscription. Cancel anytime.</p>
          </div>
          <div className="pricing-grid">
            <div className="price-card">
              <span className="price-card-name">Free</span>
              <div className="price-card-amount"><strong>€0</strong><span>/forever</span></div>
              <p className="price-card-billing">Ad-supported · no card needed</p>
              <ul className="price-card-list">
                <li><span>✓</span> Core reminders, tracking & AI chat agent</li>
                <li><span>✓</span> Emergency button included</li>
                <li><span>📺</span> Shows occasional ads</li>
                <li><span>—</span> Smart Box not included</li>
              </ul>
              <button className="btn btn-ghost" onClick={handleStart}>Start Free</button>
            </div>
            <div className="price-card">
              <span className="price-card-name">Monthly</span>
              <div className="price-card-amount"><strong>€3.99</strong><span>/month</span></div>
              <p className="price-card-billing">Billed monthly · cancel anytime</p>
              <ul className="price-card-list">
                <li><span>✓</span> Full app — all nine systems, ad-free</li>
                <li><span>✓</span> 24/7 medical support team</li>
                <li><span>🎁</span> Free MedPal Smart Box</li>
              </ul>
              <button className="btn btn-primary" onClick={handleStart}>Start Monthly</button>
            </div>
            <div className="price-card price-card-featured">
              <span className="price-badge">Save 30%</span>
              <span className="price-card-name">Annual</span>
              <div className="price-card-amount"><strong>€33.52</strong><span>/year</span></div>
              <p className="price-card-billing">Just €2.79/month · billed yearly</p>
              <ul className="price-card-list">
                <li><span>✓</span> Everything in Monthly</li>
                <li><span>✓</span> 30% off vs paying monthly</li>
                <li><span>🎁</span> Free MedPal Smart Box</li>
              </ul>
              <button className="btn btn-primary" onClick={handleStart}>Start Annual — Best Value</button>
            </div>
          </div>
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
