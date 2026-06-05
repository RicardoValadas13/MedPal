import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ChevronRight, ChevronLeft, Pill } from 'lucide-react'
import { useWalkthrough, WALKTHROUGH_STEPS } from '../contexts/WalkthroughContext'

const PAD = 8
const GAP = 14

export function WalkthroughOverlay() {
  const { isActive, currentIndex, currentStep, next, back, stop } = useWalkthrough()
  const navigate = useNavigate()
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ top?: number; bottom?: number }>({})

  useEffect(() => {
    setRect(null)
    if (!isActive || !currentStep || currentStep.position === 'center') return

    const winH = window.innerHeight
    if (currentStep.position === 'top') {
      setTooltipPos({ top: winH - 220 })
    } else {
      setTooltipPos({ top: 80 })
    }

    const findEl = () => {
      if (!currentStep.target) return
      const el = document.querySelector(currentStep.target)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      setTimeout(() => {
        const r = el.getBoundingClientRect()
        setRect(r)
        if (currentStep.position === 'top') {
          setTooltipPos({ bottom: winH - r.top + PAD + GAP })
        } else {
          setTooltipPos({ top: r.bottom + PAD + GAP })
        }
      }, 120)
    }

    if (currentStep.route) {
      navigate(currentStep.route)
      const t = setTimeout(findEl, 420)
      return () => clearTimeout(t)
    }
    const t = setTimeout(findEl, 100)
    return () => clearTimeout(t)
  }, [currentStep, isActive, navigate])

  if (!isActive || !currentStep) return null

  const isCenter = currentStep.position === 'center'
  const total = WALKTHROUGH_STEPS.length
  const isLast = currentIndex === total - 1

  const Dots = () => (
    <div className="flex gap-1 items-center">
      {WALKTHROUGH_STEPS.map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === currentIndex ? 'w-4 bg-[#192830]' : 'w-1.5 bg-[#c3c7ca]'
          }`}
        />
      ))}
    </div>
  )

  if (isCenter) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#192830]/80" onClick={e => e.stopPropagation()}>
        <div
          className="absolute bg-white rounded-3xl p-6 shadow-2xl"
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(340px, calc(100vw - 40px))' }}
        >
          <div className="flex justify-between items-start mb-5">
            <div className="w-12 h-12 rounded-2xl bg-[#cbebcd] flex items-center justify-center">
              <Pill size={22} className="text-[#49654d]" />
            </div>
            <button
              onClick={stop}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f4f3f0] text-[#43474a] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <h2 className="text-xl font-bold text-[#192830] mb-2">{currentStep.title}</h2>
          <p className="text-sm text-[#43474a] leading-relaxed mb-6">{currentStep.description}</p>
          <div className="flex items-center justify-between">
            <Dots />
            <div className="flex items-center gap-2">
              {currentIndex > 0 && (
                <button
                  onClick={back}
                  className="min-h-[40px] px-4 rounded-xl border border-[#c3c7ca] text-sm font-semibold text-[#43474a] hover:bg-[#f4f3f0] transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={isLast ? stop : next}
                className="min-h-[40px] px-5 rounded-xl bg-[#192830] text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition flex items-center gap-1.5"
              >
                {isLast ? 'Done' : "Let's go"}
                {!isLast && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-[9997]" onClick={e => e.stopPropagation()} />

      {rect ? (
        <div
          style={{
            position: 'fixed',
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(25, 40, 48, 0.78)',
            borderRadius: 12,
            zIndex: 9998,
            pointerEvents: 'none',
            transition: 'top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease',
          }}
        />
      ) : (
        <div className="fixed inset-0 z-[9998] bg-[#192830]/78 pointer-events-none" />
      )}

      <div
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(360px, calc(100vw - 32px))',
          zIndex: 9999,
          transition: 'top 0.3s ease, bottom 0.3s ease',
          ...tooltipPos,
        }}
      >
        <div className="bg-white rounded-2xl p-5 shadow-2xl">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-base font-bold text-[#192830] flex-1 pr-2">{currentStep.title}</h3>
            <button
              onClick={stop}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f4f3f0] text-[#43474a] shrink-0 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-sm text-[#43474a] leading-relaxed mb-4">{currentStep.description}</p>
          <div className="flex items-center justify-between">
            <Dots />
            <div className="flex items-center gap-2">
              {currentIndex > 0 && (
                <button
                  onClick={back}
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-[#c3c7ca] text-[#43474a] hover:bg-[#f4f3f0] transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              <button
                onClick={isLast ? stop : next}
                className="min-h-[36px] px-4 rounded-xl bg-[#192830] text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition flex items-center gap-1"
              >
                {isLast ? 'Done' : 'Next'}
                {!isLast && <ChevronRight size={15} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
