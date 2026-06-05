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
    id: 'topbar-emergency',
    target: '[data-walkthrough="topbar-emergency"]',
    title: 'Emergency call',
    description: 'Tap 112 to call emergency services. MedPal announces your name and location first, then automatically dials — and notifies your caregiver at the same time.',
    position: 'bottom',
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
    id: 'nav-box',
    target: '[data-walkthrough="nav-box"]',
    title: 'Your Box',
    description: 'View your active medications, manage your smart pill box, and track your daily intake schedule all in one place.',
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
    id: 'settings-emergency',
    route: '/settings',
    target: '[data-walkthrough="settings-emergency"]',
    title: 'Emergency settings',
    description: "Set your caregiver's phone number so they're notified when you call 112. You can also show or hide the emergency button from here.",
    position: 'bottom',
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
