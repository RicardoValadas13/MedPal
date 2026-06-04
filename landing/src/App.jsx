import { useState } from 'react'
import './App.css'

const SCREENS = [
  { id: 'today',     label: 'Today',     src: '/screens/today.png',     title: 'Daily Dose Tracker', desc: "See all your medications for today at a glance. Mark them taken, snooze a reminder, or check what's coming next — in seconds." },
  { id: 'meds',      label: 'My Meds',   src: '/screens/meds.png',      title: 'Your Digital Medicine Cabinet', desc: 'All your medications in one place. Continuous use, as-needed, and historical records — always organised and up to date.' },
  { id: 'chat',      label: 'Assistant', src: '/screens/chat.png',       title: 'AI Health Assistant', desc: 'Not feeling well? Tell MedPal. It cross-checks your symptoms with your medication history and connects you to your care team when needed.' },
  { id: 'analytics', label: 'Reports',   src: '/screens/analytics.png', title: 'Health Reports', desc: 'Track your adherence over time. Share a full medication history with your doctor in one tap — no guesswork, just real data.' },
]

const FEATURE_GROUPS = [
  {
    category: 'Prescription Management',
    icon: '📋',
    features: [
      'Automatic sync when your doctor sends a prescription',
      'Snap any paper prescription — OCR extracts name, dosage & instructions instantly',
      'Reads handwritten doctor notes accurately',
      'Supports all standard prescription formats',
    ],
  },
  {
    category: 'Smart Reminders & Tracking',
    icon: '🔔',
    features: [
      'Personalised intake reminders based on your exact dosing schedule',
      'Refill alerts before you run out — no gaps in treatment',
      'AI voice calls for users who miss app notifications — built for elderly users',
    ],
  },
  {
    category: 'Pill Organiser Verification',
    icon: '📦',
    features: [
      'Snap a photo of your MedPal Smart Box',
      'AI checks each slot — confirms correct medication and dosage',
      'Flags mismatches or missing pills before you take them',
    ],
  },
  {
    category: 'Medical Support Team',
    icon: '🩺',
    features: [
      'Real doctors and pharmacists available to answer your prescription questions',
      'AI triages your question and routes it to the right specialist instantly',
      'Fully context-aware — your team knows your exact prescriptions and history',
      'No waiting rooms, no hold music — answers when you need them',
    ],
  },
  {
    category: 'Analytics & Doctor Connectivity',
    icon: '📊',
    features: [
      'Visual dashboard of all active, paused, and completed medications',
      'One-tap sharing of adherence trends and full history with your doctor',
      'Ready-to-share export for appointments and medical reviews',
    ],
  },
  {
    category: 'Visual Learning & Calendar',
    icon: '🎓',
    features: [
      'AI-generated visual guides for your medication or exercise routine',
      'Step-by-step animated instructions appended to your care plan',
      'Full calendar sync — your medication schedule in your existing calendar',
    ],
  },
]

const PATIENT_BENEFITS = [
  { icon: '🛡️', title: 'Safety in every dose', desc: 'Smart reminders adapt to your routine, reducing errors and giving you peace of mind every day.' },
  { icon: '🤝', title: 'A companion that cares', desc: 'A voice and chat assistant that listens to how you feel and checks in — more than a reminder, a health partner.' },
  { icon: '⚡', title: 'Zero effort setup', desc: 'Use Magic Scan to configure everything in seconds. Point, scan, done — MedPal handles the rest automatically.' },
]

const DOCTOR_BENEFITS = [
  { icon: '📋', title: 'Real Adherence Reports', desc: 'See exactly how and when your patient takes their medication. Eliminate guesswork and make better clinical decisions.' },
  { icon: '⏱️', title: 'Optimise Every Consultation', desc: 'Turn 10 minutes of history-taking into a 30-second review. Full medication timeline, ready when you walk in.' },
  { icon: '⚠️', title: 'Interaction Alerts', desc: 'The AI monitors current medications in real time and surfaces potential interactions before they become serious events.' },
]

export default function App() {
  const [activeScreen, setActiveScreen] = useState('today')
  const current = SCREENS.find(s => s.id === activeScreen)

  return (
    <div className="app">
      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner container">
          <span className="nav-logo">
            <span className="logo-mark">✚</span> MedPal
          </span>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#screens">App</a>
            <a href="#doctors">For Doctors</a>
          </div>
          <a href="#download" className="btn btn-primary btn-sm">Get Started</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner container">
          <div className="hero-text">
            <span className="badge">Human-First Healthcare</span>
            <h1>Healthcare that<br /><span className="accent">understands you.</span></h1>
            <p className="hero-sub">Manage your medications with clinical precision and human warmth. MedPal keeps you on track, keeps your doctor informed, and keeps you feeling supported — every single day.</p>
            <div className="hero-actions">
              <a href="#download" className="btn btn-primary">Download Free</a>
              <a href="#screens" className="btn btn-ghost">See how it works →</a>
            </div>
            <div className="hero-stats">
              <div className="stat"><strong>94%</strong><span>average adherence rate</span></div>
              <div className="stat-divider" />
              <div className="stat"><strong>30 sec</strong><span>to add a prescription</span></div>
              <div className="stat-divider" />
              <div className="stat"><strong>24/7</strong><span>AI companion</span></div>
            </div>
          </div>
          <div className="hero-image">
            <div className="phone-frame">
              <img src="/screens/hero.png" alt="MedPal app hero screen" />
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
            <p>MedPal combines hardware, AI, and clinical tools into a single product that works for patients, carers, and doctors alike.</p>
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
              <p className="product-lead">The <strong>MedPal Smart Box</strong> is a 7×4 weekly pill organiser with 28 individual compartments — one for each time of day, every day of the week. Built for clarity, built for independence.</p>
              <ul className="product-features">
                <li><span>✓</span> 28 compartments — Morning, Afternoon, Evening, Night</li>
                <li><span>✓</span> Syncs with the MedPal app automatically</li>
                <li><span>✓</span> Compact, travel-friendly design</li>
                <li><span>✓</span> Transparent lid for quick visual check</li>
                <li><span>✓</span> App included — no subscription</li>
              </ul>
              <div className="product-price-block">
                <div className="product-price">
                  <span className="price-value">€19.99</span>
                  <span className="price-note">Box + App. One-time payment.</span>
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
              <h2>Your health,<br />back in your hands.</h2>
              <p className="benefits-lead">Simplify your care routine with an intelligent assistant that understands every step of your treatment.</p>
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
              <a href="#download" className="btn btn-primary">Start for Free</a>
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
              <h2>Precise data for safer clinical decisions.</h2>
              <p className="benefits-lead">Transform patient follow-up into a real-time view of their treatment journey — backed by actual data, not memory.</p>
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
          <p className="footer-copy">© 2024 MedPal Health. Human-First Healthcare.</p>
          <div className="footer-links">
            <a href="#">Features</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Support</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
