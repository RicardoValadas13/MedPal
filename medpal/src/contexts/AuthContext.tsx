import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  /** True when no real session exists and the shared demo user is active. */
  isDemo: boolean
  loading: boolean
  signOut: () => Promise<void>
}

// Without a real session the app runs as the shared demo user, so
// presentations keep working with zero setup.
const DEMO_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'demo@medpal.app',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '',
} as User

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? DEMO_USER,
        isDemo: !session,
        loading,
        signOut: async () => {
          await supabase.auth.signOut()
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
