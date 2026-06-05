import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Inbox, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'

export function TopBar() {
  const { user } = useAuth()
  const initial = (user?.email ?? 'M')[0].toUpperCase()
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
    <header className="sticky top-0 z-40 bg-[#faf9f5] flex justify-between items-center w-full px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#cbebcd] flex items-center justify-center text-[#49654d] font-semibold text-base shrink-0">
          {initial}
        </div>
        <div>
          <p className="text-sm font-medium text-[#43474a] leading-tight">Good day,</p>
          <p className="text-base font-semibold text-[#192830] leading-tight capitalize">
            {user?.email?.split('@')[0] ?? 'User'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {isAdmin && (
          <Link
            to="/admin"
            aria-label={pt.admin.title}
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#192830] hover:bg-[#efeeea] transition-colors active:scale-95"
          >
            <Inbox size={20} strokeWidth={2} />
          </Link>
        )}
        <Link
          to="/caregiver"
          aria-label={pt.caregiver.title}
          className="w-10 h-10 flex items-center justify-center rounded-full text-[#192830] hover:bg-[#efeeea] transition-colors active:scale-95"
        >
          <ShieldCheck size={20} strokeWidth={2} />
        </Link>
        <button className="w-10 h-10 flex items-center justify-center rounded-full text-[#192830] hover:bg-[#efeeea] transition-colors active:scale-95">
          <Bell size={20} strokeWidth={2} />
        </button>
      </div>
    </header>
  )
}
