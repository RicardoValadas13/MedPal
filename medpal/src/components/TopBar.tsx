import { Bell, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 18) return 'Good afternoon,'
  return 'Good evening,'
}

export function TopBar() {
  const navigate = useNavigate()
  const initial = 'U'
  const displayName = 'User'

  return (
    <header className="sticky top-0 z-40 bg-[#faf9f5] px-5 pb-4" style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-12 h-12 rounded-full bg-[#cbebcd] flex items-center justify-center text-[#49654d] font-bold text-lg shrink-0 shadow-sm active:scale-95 transition-transform"
          >
            {initial}
          </button>
          <div>
            <p className="text-sm text-[#43474a] leading-tight">{getGreeting()}</p>
            <p className="text-xl font-bold text-[#192830] leading-tight">{displayName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/caregiver"
            aria-label="Caregiver"
            className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full text-[#192830] hover:bg-[#efeeea] transition-colors active:scale-95"
          >
            <ShieldCheck size={22} strokeWidth={1.8} />
          </Link>
          <button
            aria-label="Notifications"
            className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full text-[#192830] hover:bg-[#efeeea] transition-colors active:scale-95"
          >
            <Bell size={22} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </header>
  )
}
