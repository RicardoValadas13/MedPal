import { Bell, ShieldCheck, HelpCircle, Inbox } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWalkthrough } from '../contexts/WalkthroughContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 18) return 'Good afternoon,'
  return 'Good evening,'
}

const AVATAR_URL = '/avatar-user.jpg'

export function TopBar() {
  const navigate = useNavigate()
  const { start } = useWalkthrough()
  const { user } = useAuth()
  const displayName = 'Mary Johnson'
  const initial = displayName.split(' ').map(w => w[0]).join('')
  const [imgFailed, setImgFailed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(data?.is_admin ?? false))
  }, [user])

  return (
    <header className="sticky top-0 z-40 bg-[#faf9f5] px-5 pb-4" style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/analytics')}
            className="w-12 h-12 rounded-full bg-[#cbebcd] flex items-center justify-center text-[#49654d] font-bold text-lg shrink-0 shadow-sm active:scale-95 transition-transform overflow-hidden"
          >
            {imgFailed ? initial : (
              <img
                src={AVATAR_URL}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={() => setImgFailed(true)}
              />
            )}
          </button>
          <div>
            <p className="text-sm text-[#43474a] leading-tight">{getGreeting()}</p>
            <p className="text-xl font-bold text-[#192830] leading-tight">{displayName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <Link
              to="/admin"
              aria-label={pt.admin.title}
              className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full text-[#192830] hover:bg-[#efeeea] transition-colors active:scale-95"
            >
              <Inbox size={22} strokeWidth={1.8} />
            </Link>
          )}
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
          <button
            onClick={start}
            aria-label="Start tour"
            className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full text-[#192830] hover:bg-[#efeeea] transition-colors active:scale-95"
          >
            <HelpCircle size={22} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </header>
  )
}
