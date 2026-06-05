import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, LogOut, Lock, Mail, Eye, EyeOff, Phone, AlertCircle, UserPlus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useEmergencySettings } from '../lib/emergencySettings'

export function SettingsPage() {
  const { user, signOut, isDemo } = useAuth()
  const navigate = useNavigate()

  const [section, setSection] = useState<'main' | 'password' | 'email' | 'caregiver'>('main')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const { enabled: emergencyEnabled, setEnabled: setEmergencyEnabled, caregiverNumber, setCaregiverNumber } = useEmergencySettings()
  const [caregiverInput, setCaregiverInput] = useState(caregiverNumber)

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', msg: 'Passwords do not match.' })
      return
    }
    if (newPassword.length < 6) {
      setStatus({ type: 'error', msg: 'Password must be at least 6 characters.' })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (error) {
      setStatus({ type: 'error', msg: error.message })
    } else {
      setStatus({ type: 'success', msg: 'Password updated successfully.' })
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    if (!newEmail || !newEmail.includes('@')) {
      setStatus({ type: 'error', msg: 'Please enter a valid email address.' })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    setLoading(false)
    if (error) {
      setStatus({ type: 'error', msg: error.message })
    } else {
      setStatus({ type: 'success', msg: 'Confirmation sent to your new email address.' })
      setNewEmail('')
    }
  }

  const initial = (user?.email ?? 'M')[0].toUpperCase()
  const name = user?.email?.split('@')[0] ?? 'User'
  const displayName = name.charAt(0).toUpperCase() + name.slice(1)

  return (
    <div className="min-h-svh bg-[#faf9f5] flex flex-col max-w-[430px] mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#faf9f5] px-5 pt-5 pb-4 flex items-center gap-3">
        <button
          onClick={() => (section === 'main' ? navigate(-1) : (setSection('main'), setStatus(null)))}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full hover:bg-[#efeeea] transition-colors active:scale-95"
        >
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="text-xl font-bold text-[#192830]">
          {section === 'main' ? 'Settings' : section === 'password' ? 'Change Password' : section === 'email' ? 'Change Email' : 'Caregiver Number'}
        </h1>
      </header>

      <div className="flex-1 px-5 pb-8 space-y-4">
        {section === 'main' && (
          <>
            {/* Profile card */}
            <div className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-[#e9e8e4]">
              <div className="w-14 h-14 rounded-full bg-[#cbebcd] flex items-center justify-center text-[#49654d] font-bold text-xl shrink-0">
                {initial}
              </div>
              <div>
                <p className="font-semibold text-[#192830] text-base">{displayName}</p>
                <p className="text-sm text-[#43474a]">{user?.email}</p>
              </div>
            </div>

            {/* Account settings */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <p className="px-4 pt-4 pb-2 text-xs font-semibold text-[#8a8f93] uppercase tracking-widest">
                Account
              </p>
              {isDemo ? (
                <button
                  onClick={() => navigate('/auth')}
                  className="w-full flex items-center gap-3 px-4 min-h-[52px] hover:bg-[#f5f4f0] transition-colors active:bg-[#efeeea]"
                >
                  <UserPlus size={20} className="text-[#49654d]" strokeWidth={1.8} />
                  <span className="flex-1 text-left text-[#192830] font-medium">
                    Create Account / Sign In
                  </span>
                  <ChevronLeft size={18} className="text-[#43474a] rotate-180" />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => { setSection('email'); setStatus(null) }}
                    className="w-full flex items-center gap-3 px-4 min-h-[52px] hover:bg-[#f5f4f0] transition-colors active:bg-[#efeeea]"
                  >
                    <Mail size={20} className="text-[#49654d]" strokeWidth={1.8} />
                    <span className="flex-1 text-left text-[#192830] font-medium">Change Email</span>
                    <ChevronLeft size={18} className="text-[#43474a] rotate-180" />
                  </button>
                  <div className="h-px bg-[#efeeea] mx-4" />
                  <button
                    onClick={() => { setSection('password'); setStatus(null) }}
                    className="w-full flex items-center gap-3 px-4 min-h-[52px] hover:bg-[#f5f4f0] transition-colors active:bg-[#efeeea]"
                  >
                    <Lock size={20} className="text-[#49654d]" strokeWidth={1.8} />
                    <span className="flex-1 text-left text-[#192830] font-medium">Change Password</span>
                    <ChevronLeft size={18} className="text-[#43474a] rotate-180" />
                  </button>
                </>
              )}
            </div>

            {/* Emergency */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden" data-walkthrough="settings-emergency">
              <p className="px-4 pt-4 pb-2 text-xs font-semibold text-[#8a8f93] uppercase tracking-widest">
                Emergency
              </p>
              <button
                onClick={() => { setCaregiverInput(caregiverNumber); setSection('caregiver') }}
                className="w-full flex items-center gap-3 px-4 min-h-[52px] hover:bg-[#f5f4f0] transition-colors active:bg-[#efeeea]"
              >
                <Phone size={20} className="text-[#49654d]" strokeWidth={1.8} />
                <span className="flex-1 text-left text-[#192830] font-medium">Caregiver Number</span>
                <span className="text-sm text-[#8a8f93] mr-1">{caregiverNumber || 'Not set'}</span>
                <ChevronLeft size={18} className="text-[#43474a] rotate-180" />
              </button>
              <div className="h-px bg-[#efeeea] mx-4" />
              <div className="flex items-center gap-3 px-4 min-h-[52px]">
                <AlertCircle size={20} className="text-[#49654d]" strokeWidth={1.8} />
                <span className="flex-1 text-[#192830] font-medium">Show 112 button</span>
                <button
                  onClick={() => setEmergencyEnabled(!emergencyEnabled)}
                  aria-checked={emergencyEnabled}
                  role="switch"
                  className={`relative w-12 h-6 rounded-full transition-colors ${emergencyEnabled ? 'bg-[#49654d]' : 'bg-[#c3c7ca]'}`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${emergencyEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Sign out (real accounts only — demo has no session) */}
            {!isDemo && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 min-h-[52px] hover:bg-[#fff5f5] transition-colors active:bg-[#ffe8e8]"
                >
                  <LogOut size={20} className="text-[#ba1a1a]" strokeWidth={1.8} />
                  <span className="flex-1 text-left text-[#ba1a1a] font-medium">Sign Out</span>
                </button>
              </div>
            )}
          </>
        )}

        {section === 'password' && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#192830]">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full border border-[#c3c7ca] rounded-xl px-4 py-3 text-[#192830] text-base focus:outline-none focus:border-[#49654d] pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#43474a]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#192830]">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full border border-[#c3c7ca] rounded-xl px-4 py-3 text-[#192830] text-base focus:outline-none focus:border-[#49654d]"
                  required
                />
              </div>
            </div>

            {status && (
              <p className={`text-sm text-center font-medium ${status.type === 'success' ? 'text-[#49654d]' : 'text-[#ba1a1a]'}`}>
                {status.msg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#192830] text-white rounded-2xl py-4 font-semibold text-base disabled:opacity-50 active:scale-95 transition-transform"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        {section === 'caregiver' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-1.5">
              <label className="text-sm font-medium text-[#192830]">Phone number</label>
              <input
                type="tel"
                value={caregiverInput}
                onChange={e => setCaregiverInput(e.target.value)}
                placeholder="+351 900 000 000"
                className="w-full border border-[#c3c7ca] rounded-xl px-4 py-3 text-[#192830] text-base focus:outline-none focus:border-[#49654d]"
              />
            </div>
            <button
              onClick={() => { setCaregiverNumber(caregiverInput.trim()); setSection('main') }}
              className="w-full bg-[#192830] text-white rounded-2xl py-4 font-semibold text-base active:scale-95 transition-transform"
            >
              Save
            </button>
          </div>
        )}

        {section === 'email' && (
          <form onSubmit={handleChangeEmail} className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#192830]">Current Email</label>
                <p className="text-[#43474a] text-base px-1">{user?.email}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#192830]">New Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="new@email.com"
                  className="w-full border border-[#c3c7ca] rounded-xl px-4 py-3 text-[#192830] text-base focus:outline-none focus:border-[#49654d]"
                  required
                />
              </div>
            </div>

            {status && (
              <p className={`text-sm text-center font-medium ${status.type === 'success' ? 'text-[#49654d]' : 'text-[#ba1a1a]'}`}>
                {status.msg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#192830] text-white rounded-2xl py-4 font-semibold text-base disabled:opacity-50 active:scale-95 transition-transform"
            >
              {loading ? 'Sending...' : 'Update Email'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
