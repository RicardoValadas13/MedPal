import { NavLink } from 'react-router-dom'
import { Home, FileText, Pill, Heart } from 'lucide-react'
import { pt } from '../i18n/pt'

const links = [
  { to: '/', label: pt.nav.home, Icon: Home, end: true },
  { to: '/prescriptions', label: pt.nav.prescriptions, Icon: FileText, end: false },
  { to: '/medications', label: pt.nav.medications, Icon: Pill, end: false },
  { to: '/checkin', label: pt.nav.checkin, Icon: Heart, end: false },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 flex z-40">
      {links.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[11px] font-medium transition-colors min-h-[56px] ${
              isActive ? 'text-green-600' : 'text-gray-400'
            }`
          }
        >
          <Icon size={22} strokeWidth={1.8} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
