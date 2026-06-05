import { createContext, useContext, useState, useCallback } from 'react'

export interface WalkthroughStep {
  id: string
  route?: string
  target?: string
  title: string
  description: string
  position: 'top' | 'bottom' | 'center'
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to MedPal',
    description: "Let's take a quick tour and show you the key features so you can start managing your medications with confidence.",
    position: 'center',
  },
  {
    id: 'home-progress',
    route: '/',
    target: '[data-walkthrough="home-progress"]',
    title: "Today's progress",
    description: "This card tracks your daily doses. See how many you've taken, how many are left, and your overall completion percentage.",
    position: 'bottom',
  },
  {
    id: 'home-quick-actions',
    route: '/',
    target: '[data-walkthrough="home-quick-actions"]',
    title: 'Quick actions',
    description: 'Add a new prescription or medication directly from the home screen without going anywhere else.',
    position: 'top',
  },
  {
    id: 'nav-prescriptions',
    target: '[data-walkthrough="nav-prescriptions"]',
    title: 'Prescriptions',
    description: 'Tap here to manage your prescriptions. Upload a photo and MedPal will automatically extract your medications.',
    position: 'top',
  },
  {
    id: 'prescriptions-new',
    route: '/prescriptions',
    target: '[data-walkthrough="prescriptions-new"]',
    title: 'Add a prescription',
    description: "Tap 'New' to scan your prescription with your camera. All medications are extracted automatically for you to review.",
    position: 'bottom',
  },
  {
    id: 'nav-medications',
    target: '[data-walkthrough="nav-medications"]',
    title: 'My Medications',
    description: 'View and manage all your active medications. Edit schedules, dosages, and add medications manually if needed.',
    position: 'top',
  },
  {
    id: 'medications-scan',
    route: '/medications',
    target: '[data-walkthrough="medications-scan"]',
    title: 'Scan Prescription',
    description: 'This button is always accessible — tap it at any time to quickly scan and add a new prescription.',
    position: 'top',
  },
  {
    id: 'nav-assistant',
    target: '[data-walkthrough="nav-assistant"]',
    title: 'AI Assistant',
    description: 'Have questions about your medications or side effects? Your personal AI health assistant is always here to help.',
    position: 'top',
  },
  {
    id: 'done',
    title: "You're all set!",
    description: "Start by uploading a prescription or adding your medications manually. MedPal will remind you when it's time to take them.",
    position: 'center',
  },
]

interface WalkthroughContextValue {
  isActive: boolean
  currentIndex: number
  currentStep: WalkthroughStep | null
  start: () => void
  next: () => void
  back: () => void
  stop: () => void
}

const WalkthroughContext = createContext<WalkthroughContextValue | null>(null)

export function WalkthroughProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const currentStep = isActive ? (WALKTHROUGH_STEPS[currentIndex] ?? null) : null

  const start = useCallback(() => {
    setCurrentIndex(0)
    setIsActive(true)
  }, [])

  const next = useCallback(() => {
    setCurrentIndex(i => {
      const n = i + 1
      if (n >= WALKTHROUGH_STEPS.length) {
        setIsActive(false)
        return 0
      }
      return n
    })
  }, [])

  const back = useCallback(() => {
    setCurrentIndex(i => Math.max(0, i - 1))
  }, [])

  const stop = useCallback(() => {
    setIsActive(false)
    setCurrentIndex(0)
  }, [])

  return (
    <WalkthroughContext.Provider value={{ isActive, currentIndex, currentStep, start, next, back, stop }}>
      {children}
    </WalkthroughContext.Provider>
  )
}

export function useWalkthrough() {
  const ctx = useContext(WalkthroughContext)
  if (!ctx) throw new Error('useWalkthrough must be used within WalkthroughProvider')
  return ctx
}
