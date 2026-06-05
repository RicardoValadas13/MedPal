import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Mode = 'signup' | 'signin'

const inputClass =
  'w-full h-12 px-4 text-base rounded-xl border border-[#e4e4de] bg-[#fafaf7] text-[#1b1c1a] ' +
  'placeholder:text-[#b8bbbe] focus:outline-none focus:border-[#49654d] focus:bg-white ' +
  'focus:shadow-[0_0_0_3px_rgba(73,101,77,0.10)] transition'

export function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your full name.')
        return
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }
    }

    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } },
        })
        if (signUpError) throw signUpError
        if (!data.session || !data.user) {
          throw new Error('Account created but no session — check Supabase autoconfirm settings.')
        }
        // The handle_new_user trigger creates the profiles row; stamp the name on it
        await supabase
          .from('profiles')
          .upsert({ id: data.user.id, full_name: name.trim() }, { onConflict: 'id' })
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (signInError) throw signInError
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-svh bg-[#faf9f5] flex flex-col max-w-[430px] mx-auto px-5">
      <header className="pt-5 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium text-[#43474a] min-h-[44px] -ml-1 px-1"
        >
          <ChevronLeft size={18} />
          Back
        </button>
      </header>

      <div className="flex-1 flex flex-col justify-center pb-16">
        <div className="mb-8 text-center">
          <span className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-[#cbebcd] text-2xl mb-4">
            💊
          </span>
          <h1 className="text-2xl font-bold text-[#192830]">
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-[#43474a] mt-1">
            {mode === 'signup'
              ? 'Your own medications, reminders and caregivers.'
              : 'Sign in to your MedPal account.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name"
              autoComplete="name"
              className={inputClass}
            />
          )}
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
            className={inputClass}
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Password (min 8 characters)' : 'Password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ba0a3] hover:text-[#43474a] transition"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p className="text-sm font-medium text-[#ba1a1a] bg-[#fff0f0] border border-[#f5b8b8] rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="w-full h-14 bg-[#192830] text-white text-base font-semibold rounded-2xl hover:opacity-90 active:scale-[0.98] transition disabled:opacity-35"
          >
            {loading ? 'Please wait…' : mode === 'signup' ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(m => (m === 'signup' ? 'signin' : 'signup'))
            setError(null)
          }}
          className="mt-5 text-sm font-semibold text-[#49654d] hover:opacity-80 transition text-center"
        >
          {mode === 'signup'
            ? 'Already have an account? Sign in'
            : 'New to MedPal? Create account'}
        </button>

        <button
          onClick={() => navigate('/')}
          className="mt-3 text-sm font-medium text-[#8a8f93] hover:text-[#43474a] transition text-center"
        >
          Continue with the demo account
        </button>
      </div>
    </div>
  )
}
