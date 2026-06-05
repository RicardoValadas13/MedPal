import { NavLink } from 'react-router-dom'
import { Home, FileText, Pill, Heart, MessageCircle, Mail } from 'lucide-react'
import { useSupportInbox } from '../lib/support'
import { pt } from '../i18n/pt'

const links = [
  { to: '/', label: pt.nav.home, Icon: Home, end: true },
  { to: '/prescriptions', label: pt.nav.prescriptions, Icon: FileText, end: false },
  { to: '/medications', label: pt.nav.medications, Icon: Pill, end: false },
  { to: '/checkin', label: pt.nav.checkin, Icon: Heart, end: false },
  { to: '/assistant', label: pt.nav.assistant, Icon: MessageCircle, end: false },
  { to: '/messages', label: pt.nav.messages, Icon: Mail, end: false },
]

export function BottomNav() {
  const unread = useSupportInbox()

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
              <span className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                {to === '/messages' && unread > 0 && (
                  <span
                    aria-label={`${unread} ${pt.admin.unreadSuffix}`}
                    className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ba1a1a] text-white text-[11px] font-bold flex items-center justify-center"
                  >
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-semibold leading-tight">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
