import { NavLink } from 'react-router-dom'
import { Home, FileText, Pill, Heart, MessageCircle } from 'lucide-react'
import { pt } from '../i18n/pt'

const links = [
  { to: '/', label: pt.nav.home, Icon: Home, end: true },
  { to: '/prescriptions', label: pt.nav.prescriptions, Icon: FileText, end: false },
  { to: '/medications', label: pt.nav.medications, Icon: Pill, end: false },
  { to: '/checkin', label: pt.nav.checkin, Icon: Heart, end: false },
  { to: '/assistant', label: pt.nav.assistant, Icon: MessageCircle, end: false },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#faf9f5] rounded-t-2xl border-t border-[#c3c7ca]/40 flex z-40 px-2 py-2">
      {links.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90 ${
              isActive
                ? 'bg-[#cbebcd] text-[#4f6b53] rounded-full py-1.5 px-2'
                : 'text-[#43474a] py-1.5 px-2'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="text-[12px] font-semibold leading-tight">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
