import { useState } from 'react'
import { Pill } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { pt } from '../i18n/pt'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col min-h-svh px-5 py-12 bg-[#faf9f5] justify-center">
      <div className="w-full mx-auto" style={{maxWidth: '384px'}}>
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#cbebcd] rounded-2xl mb-5">
            <Pill size={32} className="text-[#49654d]" />
          </div>
          <h1 className="text-[32px] font-bold tracking-[-0.02em] text-[#192830]">{pt.auth.title}</h1>
          <p className="text-[#43474a] mt-2 text-lg">{pt.auth.subtitle}</p>
        </div>

        {sent ? (
          <div className="bg-[#cbebcd] border border-[#49654d]/30 rounded-2xl p-6 text-center">
            <p className="text-[#49654d] text-lg font-medium">{pt.auth.magicLinkSent}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 w-full">
            <div>
              <label className="block text-base font-semibold text-[#1b1c1a] mb-2">
                {pt.auth.emailLabel}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={pt.auth.emailPlaceholder}
                className="w-full min-h-[48px] px-4 py-3 rounded-lg border-[1.5px] border-[#c3c7ca] bg-white text-lg text-[#1b1c1a] placeholder:text-[#73787b] focus:outline-none focus:border-[#49654d] focus:shadow-[0_0_0_3px_rgba(73,101,77,0.12)] transition"
              />
            </div>

            {error && (
              <p className="text-[#ba1a1a] text-base">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] py-3 bg-[#192830] text-white text-base font-semibold rounded-lg hover:opacity-[0.88] hover:-translate-y-px active:scale-[0.98] transition disabled:opacity-40 shadow-[0_4px_16px_rgba(25,40,48,0.12)]"
            >
              {loading ? pt.common.loading : pt.auth.magicLinkButton}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
