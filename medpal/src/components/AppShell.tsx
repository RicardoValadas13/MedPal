import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'
import { useMedicationReminders } from '../lib/reminders'
import { WalkthroughOverlay } from './WalkthroughOverlay'
import { EmergencyButton } from './EmergencyButton'

export function AppShell() {
  useMedicationReminders()
  return (
    <div className="flex flex-col min-h-svh" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
      <TopBar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
      <EmergencyButton variant="floating" />
      <WalkthroughOverlay />
    </div>
  )
}
