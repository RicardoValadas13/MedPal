import { Bell, HelpCircle, Inbox } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWalkthrough } from '../contexts/WalkthroughContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'
import { EmergencyButton } from './EmergencyButton'
import { useEmergencySettings } from '../lib/emergencySettings'

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
  const [displayName, setDisplayName] = useState('MedPal User')
  const initial = displayName.split(' ').map(w => w[0]).join('')
  const [imgFailed, setImgFailed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const { enabled: emergencyEnabled } = useEmergencySettings()

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('is_admin, full_name')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setIsAdmin(data?.is_admin ?? false)
        if (data?.full_name) setDisplayName(data.full_name)
      })
  }, [user])

  return (
    <header className="sticky top-0 z-40 bg-[#faf9f5] px-5 pb-4" style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-11 h-11 rounded-full bg-[#cbebcd] flex items-center justify-center text-[#49654d] font-bold text-lg shrink-0 shadow-sm active:scale-95 transition-transform overflow-hidden"
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
            <p className="text-xs text-[#43474a] leading-tight">{getGreeting()}</p>
            <p className="text-lg font-bold text-[#192830] leading-tight">{displayName}</p>
          </div>
        </div>
        <div className="flex items-center">
          {isAdmin && (
            <Link
              to="/admin"
              aria-label={pt.admin.title}
              className="w-10 h-10 flex items-center justify-center rounded-full text-[#43474a] hover:bg-[#efeeea] transition-colors active:scale-95"
            >
              <Inbox size={20} strokeWidth={1.8} />
            </Link>
          )}
          {emergencyEnabled && <EmergencyButton variant="inline" />}
          <button
            aria-label="Notifications"
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#43474a] hover:bg-[#efeeea] transition-colors active:scale-95"
          >
            <Bell size={20} strokeWidth={1.8} />
          </button>
          <button
            onClick={start}
            aria-label="Start tour"
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#43474a] hover:bg-[#efeeea] transition-colors active:scale-95"
          >
            <HelpCircle size={20} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </header>
  )
}
