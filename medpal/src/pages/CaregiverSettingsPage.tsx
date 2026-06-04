import { useEffect, useState } from 'react'
import { Lock, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'
import {
  clearAttempts,
  hashPin,
  isValidPin,
  lockRemainingMs,
  recordFailedAttempt,
  verifyPin,
} from '../lib/pin'
import type { CaregiverSettings, PatientProfile, UserMedication } from '../types/database'

type Stage = 'loading' | 'create' | 'confirm' | 'enter' | 'unlocked'

const inputClass =
  'w-full px-4 py-3 text-base rounded-lg border-[1.5px] border-[#c3c7ca] bg-white text-[#1b1c1a] ' +
  'placeholder:text-[#73787b] focus:outline-none focus:border-[#49654d] ' +
  'focus:shadow-[0_0_0_3px_rgba(73,101,77,0.12)] transition'

export function CaregiverSettingsPage() {
  const { user } = useAuth()
  const [stage, setStage] = useState<Stage>('loading')
  const [storedHash, setStoredHash] = useState<string | null>(null)

  // PIN entry state
  const [pin, setPin] = useState('')
  const [firstPin, setFirstPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [lockSeconds, setLockSeconds] = useState(0)

  // Settings state
  const [settings, setSettings] = useState<Pick<
    CaregiverSettings,
    'missed_med_alert' | 'emergency_voice' | 'critical_med_ids'
  > | null>(null)
  const [profile, setProfile] = useState<Partial<PatientProfile>>({ country: 'Portugal' })
  const [medications, setMedications] = useState<UserMedication[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      const { data } = await supabase
        .from('caregiver_settings')
        .select('pin_hash')
        .maybeSingle()
      if (cancelled) return
      if (data?.pin_hash) {
        setStoredHash(data.pin_hash)
        setStage('enter')
      } else {
        setStage('create')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  // Lock countdown ticker
  useEffect(() => {
    if (lockSeconds <= 0) return
    const t = setTimeout(() => setLockSeconds(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [lockSeconds])

  async function loadProtectedData() {
    const [{ data: cs }, { data: pp }, { data: meds }] = await Promise.all([
      supabase
        .from('caregiver_settings')
        .select('missed_med_alert, emergency_voice, critical_med_ids')
        .maybeSingle(),
      supabase.from('patient_profiles').select('*').maybeSingle(),
      supabase.from('user_medications').select('*').eq('is_active', true),
    ])
    setSettings(
      cs ?? { missed_med_alert: true, emergency_voice: true, critical_med_ids: [] }
    )
    if (pp) setProfile(pp)
    setMedications((meds as UserMedication[]) ?? [])
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPinError(null)
    if (!isValidPin(pin)) return

    if (stage === 'create') {
      setFirstPin(pin)
      setPin('')
      setStage('confirm')
      return
    }

    if (stage === 'confirm') {
      if (pin !== firstPin) {
        setPin('')
        setFirstPin('')
        setStage('create')
        setPinError(pt.caregiver.pinMismatch)
        return
      }
      const pin_hash = await hashPin(pin)
      const { error } = await supabase
        .from('caregiver_settings')
        .insert({ user_id: user!.id, pin_hash })
      if (error) {
        setPinError(pt.common.error)
        return
      }
      setStoredHash(pin_hash)
      setPin('')
      clearAttempts()
      await loadProtectedData()
      setStage('unlocked')
      return
    }

    // stage === 'enter'
    const remaining = lockRemainingMs()
    if (remaining > 0) {
      setLockSeconds(Math.ceil(remaining / 1000))
      setPin('')
      return
    }

    const ok = await verifyPin(pin, storedHash!)
    if (ok) {
      clearAttempts()
      setPin('')
      await loadProtectedData()
      setStage('unlocked')
    } else {
      const lockMs = recordFailedAttempt()
      setPin('')
      if (lockMs > 0) {
        setLockSeconds(Math.ceil(lockMs / 1000))
      } else {
        setPinError(pt.caregiver.pinWrong)
      }
    }
  }

  function toggleCritical(medId: string) {
    if (!settings) return
    const ids = settings.critical_med_ids.includes(medId)
      ? settings.critical_med_ids.filter(id => id !== medId)
      : [...settings.critical_med_ids, medId]
    setSettings({ ...settings, critical_med_ids: ids })
  }

  async function handleSave() {
    if (!user || !settings) return
    setSaving(true)
    setSaveMessage(null)

    const now = new Date().toISOString()
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase
        .from('caregiver_settings')
        .update({ ...settings, updated_at: now })
        .eq('user_id', user.id),
      supabase.from('patient_profiles').upsert({
        id: user.id,
        full_name: profile.full_name ?? null,
        address: profile.address ?? null,
        floor: profile.floor ?? null,
        emergency_contact_name: profile.emergency_contact_name ?? null,
        emergency_contact_phone: profile.emergency_contact_phone ?? null,
        caregiver_contact_name: profile.caregiver_contact_name ?? null,
        caregiver_contact_phone: profile.caregiver_contact_phone ?? null,
        country: profile.country || 'Portugal',
        updated_at: now,
      }),
    ])

    setSaving(false)
    setSaveMessage(e1 || e2 ? pt.caregiver.errorSave : pt.caregiver.saved)
  }

  if (stage === 'loading') {
    return <p className="px-5 py-10 text-center text-sm text-[#73787b]">{pt.common.loading}</p>
  }

  // --- PIN screens ---
  if (stage !== 'unlocked') {
    const title =
      stage === 'create'
        ? pt.caregiver.pinCreateTitle
        : stage === 'confirm'
          ? pt.caregiver.pinConfirmTitle
          : pt.caregiver.pinEnterTitle

    return (
      <div className="flex flex-col items-center px-5 pt-16 pb-6">
        <div className="w-16 h-16 rounded-full bg-[#cbebcd] flex items-center justify-center mb-5">
          <Lock size={28} className="text-[#49654d]" />
        </div>
        <h1 className="text-2xl font-semibold text-[#192830] mb-1">{title}</h1>
        {stage === 'create' && (
          <p className="text-sm text-[#43474a] mb-6 text-center">{pt.caregiver.pinCreateHint}</p>
        )}

        <form onSubmit={handlePinSubmit} className="w-full max-w-[260px] mt-4">
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            disabled={lockSeconds > 0}
            autoFocus
            aria-label={title}
            className="w-full text-center text-4xl tracking-[0.6em] font-bold px-4 py-4 rounded-2xl border-[1.5px] border-[#c3c7ca] bg-white focus:outline-none focus:border-[#49654d] disabled:opacity-40 transition"
          />
          {pinError && (
            <p className="text-sm font-medium text-[#ba1a1a] text-center mt-3">{pinError}</p>
          )}
          {lockSeconds > 0 && (
            <p className="text-sm font-medium text-[#ba1a1a] text-center mt-3">
              {pt.caregiver.pinLockedPrefix} {lockSeconds}s
            </p>
          )}
          <button
            type="submit"
            disabled={!isValidPin(pin) || lockSeconds > 0}
            className="w-full min-h-[52px] mt-5 bg-[#192830] text-white text-base font-semibold rounded-lg hover:opacity-[0.88] transition disabled:opacity-40"
          >
            {pt.caregiver.pinContinue}
          </button>
        </form>
      </div>
    )
  }

  // --- Unlocked settings ---
  return (
    <div className="px-5 py-6 space-y-8 pb-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={24} className="text-[#49654d]" />
          <h1 className="text-2xl font-semibold text-[#192830]">{pt.caregiver.title}</h1>
        </div>
        <button
          onClick={() => setStage('enter')}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#49654d] hover:opacity-[0.88] transition"
        >
          <Lock size={16} />
          {pt.caregiver.lock}
        </button>
      </div>

      {/* Toggles */}
      <section className="space-y-3">
        <ToggleRow
          label={pt.caregiver.alertsLabel}
          hint={pt.caregiver.alertsHint}
          checked={settings?.missed_med_alert ?? true}
          onChange={v => settings && setSettings({ ...settings, missed_med_alert: v })}
        />
        <ToggleRow
          label={pt.caregiver.voiceLabel}
          hint={pt.caregiver.voiceHint}
          checked={settings?.emergency_voice ?? true}
          onChange={v => settings && setSettings({ ...settings, emergency_voice: v })}
        />
      </section>

      {/* Critical medications */}
      <section>
        <h2 className="text-lg font-semibold text-[#192830] mb-1">{pt.caregiver.criticalTitle}</h2>
        <p className="text-sm text-[#43474a] mb-3">{pt.caregiver.criticalHint}</p>
        {medications.length === 0 ? (
          <p className="text-sm text-[#73787b]">{pt.caregiver.noMedications}</p>
        ) : (
          <div className="bg-white rounded-2xl border border-[#c3c7ca]/40 divide-y divide-[#efeeea] overflow-hidden">
            {medications.map(med => (
              <label
                key={med.id}
                className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-[#faf9f5] transition"
              >
                <span>
                  <span className="block text-base font-semibold text-[#192830]">
                    {med.display_name}
                  </span>
                  {med.dosage && (
                    <span className="block text-sm text-[#43474a]">{med.dosage}</span>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={settings?.critical_med_ids.includes(med.id) ?? false}
                  onChange={() => toggleCritical(med.id)}
                  className="w-5 h-5 accent-[#49654d]"
                />
              </label>
            ))}
          </div>
        )}
      </section>

      {/* Patient information */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#192830]">{pt.caregiver.patientTitle}</h2>
        <Field
          label={pt.caregiver.fullName}
          value={profile.full_name ?? ''}
          onChange={v => setProfile(p => ({ ...p, full_name: v }))}
        />
        <Field
          label={pt.caregiver.address}
          value={profile.address ?? ''}
          onChange={v => setProfile(p => ({ ...p, address: v }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={pt.caregiver.floor}
            value={profile.floor ?? ''}
            onChange={v => setProfile(p => ({ ...p, floor: v }))}
          />
          <Field
            label={pt.caregiver.country}
            value={profile.country ?? 'Portugal'}
            onChange={v => setProfile(p => ({ ...p, country: v }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={pt.caregiver.emergencyContactName}
            value={profile.emergency_contact_name ?? ''}
            onChange={v => setProfile(p => ({ ...p, emergency_contact_name: v }))}
          />
          <Field
            label={pt.caregiver.emergencyContactPhone}
            type="tel"
            value={profile.emergency_contact_phone ?? ''}
            onChange={v => setProfile(p => ({ ...p, emergency_contact_phone: v }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={pt.caregiver.caregiverContactName}
            value={profile.caregiver_contact_name ?? ''}
            onChange={v => setProfile(p => ({ ...p, caregiver_contact_name: v }))}
          />
          <Field
            label={pt.caregiver.caregiverContactPhone}
            type="tel"
            value={profile.caregiver_contact_phone ?? ''}
            onChange={v => setProfile(p => ({ ...p, caregiver_contact_phone: v }))}
          />
        </div>
      </section>

      {saveMessage && (
        <p
          className={`text-sm font-medium text-center ${
            saveMessage === pt.caregiver.saved ? 'text-[#49654d]' : 'text-[#ba1a1a]'
          }`}
        >
          {saveMessage}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full min-h-[52px] bg-[#192830] text-white text-base font-semibold rounded-lg hover:opacity-[0.88] transition disabled:opacity-40"
      >
        {saving ? pt.caregiver.saving : pt.caregiver.save}
      </button>
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-4 bg-white rounded-2xl border border-[#c3c7ca]/40 px-4 py-4 cursor-pointer">
      <span>
        <span className="block text-base font-semibold text-[#192830]">{label}</span>
        <span className="block text-sm text-[#43474a] mt-0.5">{hint}</span>
      </span>
      <span className="relative inline-flex shrink-0 mt-1">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="w-12 h-7 rounded-full bg-[#c3c7ca] peer-checked:bg-[#49654d] transition-colors" />
        <span className="absolute left-1 top-1 w-5 h-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#43474a] mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className={inputClass} />
    </div>
  )
}
