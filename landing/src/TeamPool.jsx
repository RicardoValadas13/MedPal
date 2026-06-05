import { useState } from 'react'
import './TeamPool.css'

// Fun reveal: the team photo was taken in a drained pool. "Pour the water"
// and the underwater version rises in from the bottom to fill the pool.
const BUBBLES = [
  { left: '12%', size: 10, delay: 0.1, dur: 3.2 },
  { left: '24%', size: 6, delay: 0.9, dur: 2.6 },
  { left: '38%', size: 14, delay: 0.4, dur: 3.8 },
  { left: '52%', size: 8, delay: 1.4, dur: 3.0 },
  { left: '63%', size: 11, delay: 0.7, dur: 3.5 },
  { left: '77%', size: 7, delay: 1.1, dur: 2.8 },
  { left: '88%', size: 12, delay: 0.2, dur: 3.6 },
]

export default function TeamPool() {
  const [filled, setFilled] = useState(false)
  const level = filled ? 100 : 0

  return (
    <div className="pool">
      <div className={`pool-frame ${filled ? 'is-filled' : ''}`}>
        <img className="pool-dry" src="/team.jpeg" alt="The MedPal team in a drained pool" />
        <img
          className="pool-wet"
          src="/team_water.jpeg"
          alt="The MedPal team underwater"
          style={{ clipPath: `inset(${100 - level}% 0 0 0)` }}
        />
        <div className="pool-surface" style={{ bottom: `${level}%`, opacity: filled ? 1 : 0 }} />
        <div className="pool-bubbles" style={{ opacity: filled ? 1 : 0 }}>
          {BUBBLES.map((b, i) => (
            <span
              key={i}
              className="pool-bubble"
              style={{ left: b.left, width: b.size, height: b.size, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }}
            />
          ))}
        </div>
      </div>

      <button className="btn btn-primary pool-btn" onClick={() => setFilled(f => !f)}>
        {filled ? 'Drain the pool' : 'Pour the water'}
      </button>
      <p className="pool-caption">
        This photo was taken in a drained pool. Pour the water to meet us in our natural habitat.
      </p>
    </div>
  )
}
