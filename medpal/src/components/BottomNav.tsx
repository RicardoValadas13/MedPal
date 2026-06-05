import { NavLink } from 'react-router-dom'
import { Home, FileText, Pill, MessageCircle, Package } from 'lucide-react'
import { pt } from '../i18n/pt'

const links = [
  { to: '/', label: pt.nav.home, Icon: Home, end: true, walkId: 'nav-home' },
  { to: '/prescriptions', label: pt.nav.prescriptions, Icon: FileText, end: false, walkId: 'nav-prescriptions' },
  { to: '/box', label: pt.nav.yourBox, Icon: Package, end: false, walkId: 'nav-box' },
  { to: '/medications', label: pt.nav.medications, Icon: Pill, end: false, walkId: 'nav-medications' },
  { to: '/assistant', label: pt.nav.assistant, Icon: MessageCircle, end: false, walkId: 'nav-assistant' },
]

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#faf9f5] border-t border-[#c3c7ca]/40 flex z-40 px-2 pt-2"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
    >
      {links.map(({ to, label, Icon, end, walkId }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          data-walkthrough={walkId}
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
