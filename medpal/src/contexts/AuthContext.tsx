import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

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
  return (
    <AuthContext.Provider value={{ session: null, user: DEMO_USER, loading: false, signOut: async () => {} }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
