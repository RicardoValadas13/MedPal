import { useState, useEffect } from 'react'
import './App.css'
import QRModal, { DEMO_URL } from './QRModal.jsx'
import ReportModal from './ReportModal.jsx'
import Tour from './Tour.jsx'
import TeamPool from './TeamPool.jsx'
import { Icon } from './Icons.jsx'

const SCREENS = [
  { id: 'home',          label: 'Home',          src: '/screens/home.png',          title: 'Your day at a glance', desc: 'Every medication for the day, grouped by time, with one tap to mark each dose taken — and your adherence right at the top.' },
  { id: 'prescriptions', label: 'Prescriptions', src: '/screens/prescriptions.png', title: 'All your prescriptions', desc: 'Every prescription you have uploaded in one place, clearly marked as confirmed, under review, or just added.' },
  { id: 'box',           label: 'Your Box',      src: '/screens/yourbox.png',       title: 'Manage your Smart Box', desc: 'See your medications, scan the box to check every slot is filled correctly, or log a dose taken outside your schedule.' },
  { id: 'assistant',     label: 'Assistant',     src: '/screens/assistant.png',     title: 'The MedPal assistant', desc: 'Ask anything about your medication. The assistant gives general guidance, always points you to your doctor, and keeps a disclaimer in view.' },
]

const FEATURE_GROUPS = [
  {
    category: 'Prescription Management',
    icon: 'file-text',
    features: [
      'Upload a PDF prescription and have it read instantly',
      'Or snap a photo of a paper prescription — AI reads it in seconds',
      'Check and confirm every medication before it is saved',
      'Drug names matched against the official medical database',
    ],
  },
  {
    category: 'Smart Reminders',
    icon: 'bell',
    features: [
      'Reminders that fit your real daily routine',
      'Refill alerts before you run out',
      'A quick daily mood and side-effect check-in',
      'Voice-call reminders for anyone who misses notifications',
    ],
  },
  {
    category: 'Smart Box Check',
    icon: 'package',
    features: [
      'Take a photo of your filled Smart Box',
      'MedPal checks that every slot has the right pills',
      'Warns you about wrong or empty slots before you take them',
    ],
  },
  {
    category: 'Medical Support Team',
    icon: 'stethoscope',
    features: [
      'Real doctors and pharmacists answer your questions',
      'Your question goes to the right specialist automatically',
      'They already know your medications — no need to re-explain',
      'No waiting rooms and no hold music',
      'Every message is private and encrypted',
    ],
  },
  {
    category: 'Reports for Your Doctor',
    icon: 'bar-chart',
    features: [
      'One clear view of all your medications',
      'Share your full history with your doctor in one tap',
      'Daily mood and side effects, visible to your care team',
      'A ready-to-share report for every appointment',
    ],
  },
  {
    category: 'Visual Guides & Calendar',
    icon: 'calendar',
    features: [
      'Simple visual guides for your medication routine',
      'Step-by-step instructions linked to your care plan',
      'Syncs with your Google or Apple calendar',
    ],
  },
  {
    category: 'AI Chat Agent',
    icon: 'bot',
    features: [
      'A smart assistant for your medication questions',
      'Help with the app and everyday health questions',
      'Speaks over 100 languages',
      'Never diagnoses or changes doses — always points you to your doctor',
      'Spots emergency words and raises the alarm automatically',
    ],
  },
  {
    category: 'Emergency System',
    icon: 'siren',
    features: [
      'One big red button, always on screen — impossible to miss in an emergency',
      'Large, high-contrast and easy to see, built for users with low vision',
      'Asks “Call 112?” first, so it never dials by accident — then connects instantly',
      'Once connected, a clear voice tells the operator your name, address and floor',
      'Your details are repeated calmly so nothing is missed — in English or Portuguese',
    ],
  },
  {
    category: 'Caregiver Mode',
    icon: 'lock-keyhole',
    features: [
      'Protected by a private PIN only the caregiver knows',
      'Locks for a while after several wrong tries',
      'Turn missed-dose alerts and the emergency voice on or off',
      'Mark which medications are critical',
      'Keep the patient’s address and emergency info up to date',
    ],
  },
]

const PATIENT_BENEFITS = [
  { icon: 'zap', title: 'Effortless setup', desc: 'Scan your prescription once and MedPal builds your whole schedule for you.' },
  { icon: 'shield-check', title: 'Safety in every dose', desc: 'Gentle reminders and box checks help you take the right dose, every time.' },
  { icon: 'heart', title: 'A companion, not an alarm', desc: 'A voice and chat assistant that listens and answers when you have a question.' },
]

const CAREGIVER_BENEFITS = [
  { icon: 'activity', title: 'Remote monitoring', desc: 'Get a notification when your family member takes — or misses — a dose.' },
  { icon: 'cart', title: 'Proactive care', desc: 'MedPal warns you before the medication runs out, so you can reorder in time.' },
  { icon: 'eye', title: 'Always in the loop', desc: 'See their doses and mood in one simple view, without having to ask.' },
]

const DOCTOR_BENEFITS = [
  { icon: 'clipboard-list', title: 'Real adherence reports', desc: 'See exactly when your patient takes their medication between visits.' },
  { icon: 'clock', title: 'Faster consultations', desc: 'Open a clear summary in Doctor Mode and spend the visit on care, not history.' },
  { icon: 'alert-triangle', title: 'Interaction alerts', desc: 'Get flagged about reported side effects and possible drug interactions.' },
]

const DEMO_CARDS = [
  { icon: 'camera', title: 'Try Magic Scan', desc: 'Add a prescription with your camera.', action: 'app' },
  { icon: 'message-square', title: 'Talk to the assistant', desc: 'Ask about your schedule by voice or text.', action: 'app' },
  { icon: 'line-chart', title: 'View a sample report', desc: 'See how your adherence is shown.', action: 'report' },
]

const TRUST = [
  { icon: 'lock', title: 'End-to-end encrypted', sub: 'All messages and health data' },
  { icon: 'shield', title: 'GDPR compliant', sub: 'Your data belongs to you' },
  { icon: 'badge-check', title: 'Verified medical team', sub: 'Certified doctors and pharmacists' },
  { icon: 'eye-off', title: 'No data selling', sub: 'Never shared with third parties' },
]

const PARTNERS = [
  { icon: 'leaf', name: 'VerdeFuel', area: 'Plant-based protein', detail: 'Serving sizes and post-workout timing sync into the user routine.' },
  { icon: 'pill', name: 'Floravita', area: 'Vegan vitamins', detail: 'Daily dosage and “take with food” rules load automatically.' },
  { icon: 'watch', name: 'PulseForm', area: 'Fitness wearables', detail: 'Workout and recovery data feed into the activity log.' },
  { icon: 'sprout', name: 'PuraRaíz', area: 'Herbal remedies', detail: 'Ingredients are checked against current medications.' },
  { icon: 'dumbbell', name: 'KineticLab', area: 'Sports nutrition', detail: 'Creatine and electrolyte schedules become smart reminders.' },
]

export default function App() {
  const [activeScreen, setActiveScreen] = useState('home')
  const [showQR, setShowQR] = useState(false)
  const current = SCREENS.find(s => s.id === activeScreen)

  const [partnerSubmitted, setPartnerSubmitted] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showTour, setShowTour] = useState(false)

  // Handle the URL hash on load: open the tour for #tour, otherwise scroll to the
  // shared section — re-running after the window fully loads so large images/video
  // above the target don't throw off the landing position.
  useEffect(() => {
    const hash = window.location.hash
    if (hash === '#tour') { setShowTour(true); return }
    if (hash.length > 1) {
      const scrollToTarget = () => {
        const el = document.getElementById(decodeURIComponent(hash.slice(1)))
        if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' })
      }
      requestAnimationFrame(() => setTimeout(scrollToTarget, 0))
      window.addEventListener('load', scrollToTarget, { once: true })
      return () => window.removeEventListener('load', scrollToTarget)
    }
  }, [])

  // Reveal elements as they scroll into view (skipped when reduced motion is preferred).
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(e => e.classList.add('is-visible'))
      return
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target) }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
    els.forEach(e => io.observe(e))
    return () => io.disconnect()
  }, [])

  // On mobile, open the demo directly — no need to scan a QR code from the same device.
  const handleStart = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches) {
      window.open(DEMO_URL, '_blank', 'noopener,noreferrer')
    } else {
      setShowQR(true)
    }
  }

  // Submit the partnership form to Netlify Forms (no custom backend needed).
  const handlePartnerSubmit = (e) => {
    e.preventDefault()
    const data = new FormData(e.target)
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(data).toString(),
    })
      .then(() => setPartnerSubmitted(true))
      .catch(() => setPartnerSubmitted(true))
  }

  return (
    <div className="app">
      {showQR && <QRModal onClose={() => setShowQR(false)} />}
      {showReport && <ReportModal onClose={() => setShowReport(false)} />}
      {showTour && <Tour onClose={() => setShowTour(false)} />}
      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner container">
          <span className="nav-logo">
            <img className="logo-img" src="/logo.png" alt="" /> MedPal
          </span>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#screens">App</a>
            <a href="#patients">Patients</a>
            <a href="#doctors">Doctors</a>
            <a href="#caregivers">Caregivers</a>
            <a href="#team">Team</a>
            <a href="#partnerships">Partners</a>
            <a href="#download">Pricing</a>
          </div>
          <button className="btn btn-ghost btn-sm nav-tour" onClick={() => setShowTour(true)}>Guided tour</button>
          <a href="#download" className="btn btn-primary btn-sm">Get Started</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner container">
          <div className="hero-text">
            <span className="eyebrow">Human-first healthcare</span>
            <h1>Care that<br /><span className="accent">understands you.</span></h1>
            <p className="hero-sub">MedPal keeps your medication on track, your doctor informed, and the people you love at ease — every single day.</p>
            <div className="hero-actions">
              <a href="#download" className="btn btn-primary">Start for €3.99/month</a>
              <a href="#screens" className="btn btn-ghost">See how it works</a>
            </div>
            <p className="hero-gift"><Icon name="gift" className="ic-inline" /> Subscribe and the <strong>MedPal Smart Box</strong> ships to you free.</p>
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
              <img src="/screens/home.png" alt="MedPal app" />
            </div>
          </div>
        </div>
      </section>

      {/* VIDEO */}
      <section className="video-section section" id="video">
        <div className="container">
          <div className="section-header reveal">
            <span className="eyebrow">See it in action</span>
            <h2>Watch how MedPal works.</h2>
            <p>From scanning a prescription to sharing a report with your doctor.</p>
          </div>
          <div className="video-wrapper reveal">
            <video controls playsInline className="promo-video">
              <source src="/medpal-promo.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features section" id="features">
        <div className="container">
          <div className="section-header reveal">
            <span className="eyebrow">Everything included</span>
            <h2>Nine systems. One subscription.</h2>
            <p>Everything you need to manage medication well, in a single app.</p>
          </div>
          <div className="features-grid">
            {FEATURE_GROUPS.map((g, i) => (
              <div className={`feature-card reveal${i === 0 ? ' feature-card-lead' : ''}`} key={g.category}>
                <span className="feature-icon"><Icon name={g.icon} /></span>
                <h3>{g.category}</h3>
                <ul className="feature-list">
                  {g.features.map(f => (
                    <li key={f}><Icon name="check" className="feat-check" />{f}</li>
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
            {TRUST.map((t, i) => (
              <div className="trust-item" key={t.title}>
                <Icon name={t.icon} className="trust-icon" />
                <strong>{t.title}</strong>
                <span className="trust-sub">{t.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT BOX */}
      <section className="product section" id="product">
        <div className="container">
          <div className="product-inner reveal">
            <div className="product-images">
              <img className="product-img-main" src="/screens/box1.png" alt="MedPal Smart Box" />
            </div>
            <div className="product-info">
              <span className="eyebrow">Free with your plan</span>
              <h2>Subscribe and the box is on us.</h2>
              <p className="product-lead">Every MedPal subscription ships with the <strong>MedPal Smart Box</strong> — a 28-slot pill organiser, one compartment per day. It pairs with the app at no extra cost.</p>
              <ul className="product-features">
                <li><Icon name="check" className="feat-check" /> 28 numbered compartments, one per day</li>
                <li><Icon name="check" className="feat-check" /> Scan the box to check each slot is filled right</li>
                <li><Icon name="check" className="feat-check" /> Compact, travel-friendly, translucent lid</li>
                <li><Icon name="check" className="feat-check" /> Yours free with any MedPal plan</li>
                <li><Icon name="check" className="feat-check" /> Medical support team included</li>
              </ul>
              <div className="product-price-block">
                <div className="product-price">
                  <span className="price-strike">€19.99</span>
                  <span className="price-value">Free</span>
                  <span className="price-note">Included with your MedPal subscription.</span>
                </div>
                <a href="#download" className="btn btn-primary">See plans</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* APP SCREENS */}
      <section className="screens section" id="screens">
        <div className="container">
          <div className="section-header reveal">
            <span className="eyebrow">The app</span>
            <h2>Designed for real life.</h2>
            <p>Built to be used in seconds, morning or night.</p>
          </div>
          <div className="screens-showcase reveal">
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
                <div className="screen-cta">
                  <span className="screen-brand"><img className="logo-img" src="/logo.png" alt="" /> MedPal</span>
                  <button className="btn btn-primary" onClick={handleStart}>Try the app</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PATIENT BENEFITS */}
      <section className="benefits section" id="patients">
        <div className="container">
          <div className="benefits-inner reveal">
            <div className="benefits-image">
              <div className="phone-frame phone-frame-sm">
                <img src="/screens/home.png" alt="Patient view" />
              </div>
            </div>
            <div className="benefits-text">
              <span className="eyebrow">For patients</span>
              <h2>Your health back in your hands.</h2>
              <p className="benefits-lead">A smart assistant that understands and protects every step of your treatment.</p>
              <ul className="benefit-list">
                {PATIENT_BENEFITS.map(b => (
                  <li key={b.title} className="benefit-item">
                    <span className="benefit-icon"><Icon name={b.icon} /></span>
                    <div>
                      <strong>{b.title}</strong>
                      <p>{b.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <button className="btn btn-primary" onClick={handleStart}>Start now</button>
            </div>
          </div>
        </div>
      </section>

      {/* CAREGIVER BENEFITS */}
      <section className="benefits benefits-sage section" id="caregivers">
        <div className="container">
          <div className="benefits-inner reveal">
            <div className="benefits-text">
              <span className="eyebrow">For caregivers and family</span>
              <h2>Peace of mind that they are well.</h2>
              <p className="benefits-lead">Follow the health routine of the people you love, with safety and clarity.</p>
              <ul className="benefit-list">
                {CAREGIVER_BENEFITS.map(b => (
                  <li key={b.title} className="benefit-item">
                    <span className="benefit-icon"><Icon name={b.icon} /></span>
                    <div>
                      <strong>{b.title}</strong>
                      <p>{b.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <button className="btn btn-primary" onClick={handleStart}>Start now</button>
            </div>
            <div className="benefits-image">
              <div className="phone-frame phone-frame-sm">
                <img src="/screens/yourbox.png" alt="Caregiver view" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DOCTOR BENEFITS */}
      <section className="benefits benefits-dark section" id="doctors">
        <div className="container">
          <div className="benefits-inner benefits-inner-reverse reveal">
            <div className="benefits-text">
              <span className="eyebrow eyebrow-light">For healthcare professionals</span>
              <h2>Precise data for safe decisions.</h2>
              <p className="benefits-lead">Real-time insight into the treatment journey — empathy backed by real data.</p>
              <ul className="benefit-list">
                {DOCTOR_BENEFITS.map(b => (
                  <li key={b.title} className="benefit-item">
                    <span className="benefit-icon"><Icon name={b.icon} /></span>
                    <div>
                      <strong>{b.title}</strong>
                      <p>{b.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <a href="#download" className="btn btn-outline-light">Request early access</a>
            </div>
            <div className="benefits-image">
              <div className="phone-frame phone-frame-sm">
                <img src="/screens/prescriptions.png" alt="Doctor view" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="testimonial section">
        <div className="container">
          <div className="testimonial-card reveal">
            <span className="quote-mark">&ldquo;</span>
            <blockquote>MedPal changed the way I care for my parents. I no longer call every day to check if they took their medication — the app tells me automatically, and a box running low is never a surprise. It is a huge relief.</blockquote>
            <div className="testimonial-author">
              <div className="author-avatar">M</div>
              <div>
                <strong>Mariana S.</strong>
                <span>Daughter and primary carer</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO WE ARE */}
      <section className="team section" id="team">
        <div className="container">
          <div className="section-header reveal">
            <span className="eyebrow">Who we are</span>
            <h2>The people behind MedPal.</h2>
            <p>A small team building MedPal — caught here in our natural habitat.</p>
          </div>
          <div className="reveal">
            <TeamPool />
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section className="demo section" id="demo">
        <div className="container">
          <div className="section-header reveal">
            <span className="eyebrow">Try it first</span>
            <h2>Explore MedPal.</h2>
            <p>See how it works before you sign up.</p>
          </div>
          <div className="demo-inner reveal">
            <div className="demo-phone">
              <div className="phone-frame">
                <img src="/screens/upload.png" alt="MedPal demo mode" />
              </div>
            </div>
            <div className="demo-cards">
              {DEMO_CARDS.map(c => (
                <button
                  type="button"
                  className="demo-card"
                  key={c.title}
                  onClick={() => c.action === 'report' ? setShowReport(true) : handleStart()}
                >
                  <span className="demo-icon"><Icon name={c.icon} /></span>
                  <div>
                    <strong>{c.title}</strong>
                    <p>{c.desc}</p>
                  </div>
                  <span className="demo-arrow" aria-hidden="true">→</span>
                </button>
              ))}
              <button className="btn btn-primary" style={{marginTop: '8px'}} onClick={handleStart}>Create my account</button>
            </div>
          </div>
        </div>
      </section>

      {/* PARTNERSHIPS */}
      <section className="partners section" id="partnerships">
        <div className="container">
          <div className="section-header reveal">
            <span className="eyebrow">Partnerships</span>
            <h2>Brands that already work with MedPal.</h2>
            <p>Partner with us and we load your product data into the app — dosage, timing and interactions. When a user adds your product, they get accurate reminders and safety checks straight away.</p>
          </div>
          <div className="partner-grid">
            {PARTNERS.map(p => (
              <div className="partner-card reveal" key={p.name}>
                <span className="partner-icon"><Icon name={p.icon} /></span>
                <h3 className="partner-name">{p.name}</h3>
                <span className="partner-area">{p.area}</span>
                <p className="partner-detail">{p.detail}</p>
                <span className="partner-tag"><Icon name="check" className="partner-tag-check" /> Already integrated</span>
              </div>
            ))}
          </div>
          <div className="partner-cta reveal">
            {partnerSubmitted ? (
              <div className="partner-thanks">
                <Icon name="check-circle" className="partner-thanks-icon" />
                <h3>Thanks — we will be in touch.</h3>
                <p>Our partnerships team has your details and will reach out about integrating your products.</p>
              </div>
            ) : (
              <>
                <h3>Have a product? Integrate with MedPal.</h3>
                <p className="partner-cta-sub">Tell us about your brand and we will show you how your products plug into the app.</p>
                <form
                  className="partner-form"
                  name="partnerships"
                  method="POST"
                  data-netlify="true"
                  netlify-honeypot="bot-field"
                  onSubmit={handlePartnerSubmit}
                >
                  <input type="hidden" name="form-name" value="partnerships" />
                  <p hidden>
                    <label>Don't fill this out: <input name="bot-field" /></label>
                  </p>
                  <div className="partner-form-row">
                    <input type="text" name="company" placeholder="Brand / company name" required />
                    <input type="text" name="name" placeholder="Your name" required />
                  </div>
                  <input type="email" name="email" placeholder="Work email" required />
                  <select name="category" defaultValue="">
                    <option value="" disabled>Product category…</option>
                    <option>Vegan supplements</option>
                    <option>Vitamins</option>
                    <option>Fitness equipment</option>
                    <option>Herbal &amp; natural</option>
                    <option>Sports nutrition</option>
                    <option>Other</option>
                  </select>
                  <textarea name="message" rows="4" placeholder="Tell us about your products"></textarea>
                  <button type="submit" className="btn btn-primary">Request integration</button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="download section" id="download">
        <div className="container">
          <div className="section-header reveal">
            <span className="eyebrow">Simple pricing</span>
            <h2>One plan. Everything included.</h2>
            <p>The app, the medical support team and a free Smart Box, in one subscription. Cancel anytime.</p>
          </div>
          <div className="pricing-grid">
            <div className="price-card reveal">
              <span className="price-card-name">Free</span>
              <div className="price-card-amount"><strong>€0</strong><span>/forever</span></div>
              <p className="price-card-billing">Ad-supported · no card needed</p>
              <ul className="price-card-list">
                <li><Icon name="check" className="pc-check" /> Core reminders, tracking and AI chat</li>
                <li><Icon name="check" className="pc-check" /> Emergency button included</li>
                <li><Icon name="megaphone" className="pc-muted" /> Shows occasional ads</li>
                <li><Icon name="minus" className="pc-muted" /> Smart Box not included</li>
              </ul>
              <button className="btn btn-ghost" onClick={handleStart}>Start free</button>
            </div>
            <div className="price-card reveal">
              <span className="price-card-name">Monthly</span>
              <div className="price-card-amount"><strong>€3.99</strong><span>/month</span></div>
              <p className="price-card-billing">Billed monthly · cancel anytime</p>
              <ul className="price-card-list">
                <li><Icon name="check" className="pc-check" /> Full app — all nine systems, ad-free</li>
                <li><Icon name="check" className="pc-check" /> 24/7 medical support team</li>
                <li><Icon name="gift" className="pc-gift" /> Free MedPal Smart Box</li>
              </ul>
              <button className="btn btn-primary" onClick={handleStart}>Start monthly</button>
            </div>
            <div className="price-card price-card-featured reveal">
              <span className="price-badge">Save 30%+</span>
              <span className="price-card-name">Annual</span>
              <div className="price-card-amount"><strong>€29.99</strong><span>/year</span></div>
              <p className="price-card-billing">Just €2.50/month · billed yearly</p>
              <ul className="price-card-list">
                <li><Icon name="check" className="pc-check" /> Everything in Monthly</li>
                <li><Icon name="check" className="pc-check" /> More than 30% off vs paying monthly</li>
                <li><Icon name="gift" className="pc-gift" /> Free MedPal Smart Box</li>
              </ul>
              <button className="btn btn-primary" onClick={handleStart}>Start annual — best value</button>
            </div>
          </div>
          <div className="store-buttons">
            <a href="#" className="store-btn">
              <Icon name="apple" className="store-icon" />
              <div><span>Download on the</span><strong>App Store</strong></div>
            </a>
            <a href="#" className="store-btn">
              <Icon name="play" className="store-icon" />
              <div><span>Get it on</span><strong>Google Play</strong></div>
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container footer-inner">
          <span className="nav-logo"><img className="logo-img" src="/logo.png" alt="" /> MedPal</span>
          <p className="footer-copy">© 2026 MedPal Health. Human-first medication management.</p>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#download">Pricing</a>
            <a href="#partnerships">Partners</a>
            <a href="#screens">App</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
