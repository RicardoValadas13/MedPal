import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'
import { useMedicationReminders } from '../lib/reminders'

export function AppShell() {
  useMedicationReminders()
  return (
    <div className="flex flex-col min-h-svh pb-[72px]">
      <TopBar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
