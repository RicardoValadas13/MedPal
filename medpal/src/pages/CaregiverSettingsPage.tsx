import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Lock,
  Plus,
  ShieldCheck,
  Square,
  Trash2,
  Volume2,
} from 'lucide-react'
import {
  clearEmergencyAnnouncementCache,
  playTestAnnouncement,
  type AnnouncementPlayback,
} from '../lib/emergencyVoice'
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
import type {
  CaregiverSettings,
  ContactRelationship,
  FamilyContact,
  PatientProfile,
  UserMedication,
} from '../types/database'

const MAX_CONTACTS = 5
const RELATIONSHIPS: ContactRelationship[] = ['son', 'daughter', 'partner', 'friend', 'caregiver']

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
  const [contacts, setContacts] = useState<FamilyContact[]>([])
  const deletedContactIds = useRef<string[]>([])
  const dragIndex = useRef<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Voice test playback
  const [voiceTest, setVoiceTest] = useState<'idle' | 'loading' | 'playing'>('idle')
  const [voiceTestError, setVoiceTestError] = useState(false)
  const testPlaybackRef = useRef<AnnouncementPlayback | null>(null)

  // Demo caregiver call simulation
  const [testCall, setTestCall] = useState<'idle' | 'calling' | 'done' | 'error'>('idle')

  // Stop a running test when leaving the page
  useEffect(() => () => testPlaybackRef.current?.stop(), [])

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
    const [{ data: cs }, { data: pp }, { data: meds }, { data: fc }] = await Promise.all([
      supabase
        .from('caregiver_settings')
        .select('missed_med_alert, emergency_voice, critical_med_ids')
        .maybeSingle(),
      supabase.from('patient_profiles').select('*').maybeSingle(),
      supabase.from('user_medications').select('*').eq('is_active', true),
      supabase
        .from('family_contacts')
        .select('*')
        .order('priority', { ascending: true }),
    ])
    setSettings(
      cs ?? { missed_med_alert: true, emergency_voice: true, critical_med_ids: [] }
    )
    if (pp) setProfile(pp)
    setMedications((meds as UserMedication[]) ?? [])
    setContacts((fc as FamilyContact[]) ?? [])
    deletedContactIds.current = []
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

  async function handleTestCall() {
    if (testCall === 'calling') return
    setTestCall('calling')

    const { data, error } = await supabase.functions.invoke('caregiver-call-demo')
    if (error) {
      setTestCall('error')
      return
    }

    if (data instanceof Blob && data.type.startsWith('audio/')) {
      const url = URL.createObjectURL(data)
      const audio = new Audio(url)
      await new Promise<void>(resolve => {
        audio.onended = () => resolve()
        audio.onerror = () => resolve()
        audio.play().catch(() => resolve())
      })
      URL.revokeObjectURL(url)
      setTestCall('done')
      return
    }

    // ElevenLabs unavailable — speak the script with the browser's
    // built-in voice so the demo always completes
    const payload = data as { fallback?: boolean; script?: string; locale?: string }
    if (payload?.fallback && payload.script && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(payload.script)
      utterance.lang = payload.locale?.startsWith('pt') ? 'pt-PT' : 'en-GB'
      utterance.rate = 0.95
      await new Promise<void>(resolve => {
        utterance.onend = () => resolve()
        utterance.onerror = () => resolve()
        window.speechSynthesis.speak(utterance)
      })
      setTestCall('done')
      return
    }

    setTestCall('error')
  }

  async function handleVoiceTest() {
    if (voiceTest === 'playing') {
      testPlaybackRef.current?.stop()
      return
    }
    if (voiceTest === 'loading') return
    setVoiceTestError(false)
    setVoiceTest('loading')
    const playback = await playTestAnnouncement()
    if (!playback) {
      setVoiceTest('idle')
      setVoiceTestError(true)
      return
    }
    testPlaybackRef.current = playback
    setVoiceTest('playing')
    await playback.finished
    setVoiceTest('idle')
  }

  function addContact() {
    if (!user || contacts.length >= MAX_CONTACTS) return
    setContacts([
      ...contacts,
      {
        id: crypto.randomUUID(),
        user_id: user.id,
        name: '',
        relationship: 'caregiver',
        phone: '',
        priority: contacts.length + 1,
        notify_missed_meds: true,
        notify_emergency: true,
        created_at: new Date().toISOString(),
      },
    ])
  }

  function updateContact(id: string, patch: Partial<FamilyContact>) {
    setContacts(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)))
  }

  function removeContact(id: string) {
    deletedContactIds.current.push(id)
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  function moveContact(from: number, to: number) {
    if (to < 0 || to >= contacts.length || from === to) return
    setContacts(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
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
    // Persist contacts: priority follows the list order; only rows with
    // a name and phone are saved.
    const validContacts = contacts.filter(c => c.name.trim() && c.phone.trim())
    const contactOps = Promise.all([
      deletedContactIds.current.length > 0
        ? supabase.from('family_contacts').delete().in('id', deletedContactIds.current)
        : Promise.resolve({ error: null }),
      validContacts.length > 0
        ? supabase.from('family_contacts').upsert(
            validContacts.map((c, i) => ({
              id: c.id,
              user_id: user.id,
              name: c.name.trim(),
              relationship: c.relationship,
              phone: c.phone.trim(),
              priority: i + 1,
              notify_missed_meds: c.notify_missed_meds,
              notify_emergency: c.notify_emergency,
            }))
          )
        : Promise.resolve({ error: null }),
    ])

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
    const [{ error: e3 }, { error: e4 }] = await contactOps

    setSaving(false)
    if (e1 || e2 || e3 || e4) {
      setSaveMessage(pt.caregiver.errorSave)
    } else {
      setSaveMessage(pt.caregiver.saved)
      deletedContactIds.current = []
      // Reflect the persisted priorities in local state
      setContacts(validContacts.map((c, i) => ({ ...c, priority: i + 1 })))
      // The address/name may have changed — drop any cached voice clip
      clearEmergencyAnnouncementCache()
    }
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

        {/* Voice test — plays the announcement without calling 112 */}
        <div className="bg-white rounded-2xl border border-[#c3c7ca]/40 px-4 py-4">
          <button
            onClick={handleVoiceTest}
            disabled={voiceTest === 'loading'}
            className={`w-full min-h-[52px] flex items-center justify-center gap-2 rounded-xl text-base font-semibold transition disabled:opacity-60 ${
              voiceTest === 'playing'
                ? 'bg-[#ba1a1a] text-white hover:opacity-[0.88]'
                : 'bg-[#cbebcd] text-[#192830] hover:bg-[#afceb2]'
            }`}
          >
            {voiceTest === 'playing' ? (
              <>
                <Square size={18} aria-hidden />
                {pt.caregiver.voiceTestStop}
              </>
            ) : (
              <>
                <Volume2 size={18} aria-hidden />
                {voiceTest === 'loading'
                  ? pt.caregiver.voiceTestLoading
                  : pt.caregiver.voiceTest}
              </>
            )}
          </button>
          <p className="text-sm text-[#43474a] mt-2">{pt.caregiver.voiceTestHint}</p>
          {voiceTestError && (
            <p className="text-sm font-medium text-[#ba1a1a] mt-2">
              {pt.caregiver.voiceTestError}
            </p>
          )}
        </div>

        {/* Demo: simulated caregiver call (orange — test, not a real emergency) */}
        <div className="bg-white rounded-2xl border border-[#c3c7ca]/40 px-4 py-4">
          <button
            onClick={handleTestCall}
            disabled={testCall === 'calling'}
            className="w-full min-h-[52px] flex items-center justify-center gap-2 rounded-xl text-base font-semibold bg-[#ea580c] text-white border-b-4 border-[#9a3412] hover:opacity-[0.92] active:translate-y-[2px] active:border-b-2 transition disabled:opacity-60"
          >
            {pt.caregiver.testCallButton}
          </button>
          <p className="text-sm text-[#43474a] mt-2">{pt.caregiver.testCallHint}</p>
        </div>
      </section>

      {testCall !== 'idle' && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
        >
          <div className="w-full max-w-[340px] bg-white rounded-3xl p-6 text-center shadow-2xl">
            {testCall === 'calling' && (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-[#ffdbd2] flex items-center justify-center mb-4">
                  <span className="text-3xl animate-pulse">📞</span>
                </div>
                <p className="text-xl font-bold text-[#192830] mb-1">
                  {pt.caregiver.testCallCalling}
                </p>
                <p className="text-base text-[#43474a]">
                  {pt.caregiver.testCallCallingTo}{' '}
                  {contacts[0]?.name?.trim() || 'Thomas Müller'}…
                </p>
              </>
            )}
            {testCall === 'done' && (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-[#cbebcd] flex items-center justify-center mb-4">
                  <ShieldCheck size={30} className="text-[#49654d]" aria-hidden />
                </div>
                <p className="text-xl font-bold text-[#192830] mb-4">
                  ✅ {pt.caregiver.testCallDone}
                </p>
                <button
                  onClick={() => setTestCall('idle')}
                  className="w-full min-h-[52px] bg-[#192830] text-white text-base font-semibold rounded-xl hover:opacity-[0.88] transition"
                >
                  {pt.caregiver.testCallClose}
                </button>
              </>
            )}
            {testCall === 'error' && (
              <>
                <p className="text-base font-semibold text-[#ba1a1a] mb-4">
                  {pt.caregiver.testCallError}
                </p>
                <button
                  onClick={() => setTestCall('idle')}
                  className="w-full min-h-[52px] bg-[#efeeea] text-[#192830] text-base font-semibold rounded-xl hover:bg-[#e9e8e4] transition"
                >
                  {pt.caregiver.testCallClose}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Family contacts */}
      <section>
        <h2 className="text-lg font-semibold text-[#192830] mb-1">
          {pt.caregiver.contactsTitle}
        </h2>
        <p className="text-sm text-[#43474a] mb-3">{pt.caregiver.contactsHint}</p>
        <div className="space-y-3">
          {contacts.map((contact, i) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              index={i}
              total={contacts.length}
              onChange={patch => updateContact(contact.id, patch)}
              onRemove={() => removeContact(contact.id)}
              onMove={to => moveContact(i, to)}
              onDragStart={() => (dragIndex.current = i)}
              onDropOn={() => {
                if (dragIndex.current !== null) moveContact(dragIndex.current, i)
                dragIndex.current = null
              }}
            />
          ))}
        </div>
        {contacts.length < MAX_CONTACTS ? (
          <button
            onClick={addContact}
            className="mt-3 w-full min-h-[48px] flex items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-[#c3c7ca] text-base font-semibold text-[#49654d] hover:bg-[#f4f4f0] transition"
          >
            <Plus size={18} />
            {pt.caregiver.contactsAdd}
          </button>
        ) : (
          <p className="mt-3 text-sm text-[#73787b] text-center">{pt.caregiver.contactsMax}</p>
        )}
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

function ContactCard({
  contact,
  index,
  total,
  onChange,
  onRemove,
  onMove,
  onDragStart,
  onDropOn,
}: {
  contact: FamilyContact
  index: number
  total: number
  onChange: (patch: Partial<FamilyContact>) => void
  onRemove: () => void
  onMove: (to: number) => void
  onDragStart: () => void
  onDropOn: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={e => e.preventDefault()}
      onDrop={onDropOn}
      className="bg-white rounded-2xl border border-[#c3c7ca]/40 p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <GripVertical size={18} className="text-[#73787b] cursor-grab shrink-0" aria-hidden />
        <span className="w-7 h-7 rounded-full bg-[#cbebcd] text-[#49654d] text-sm font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        <span className="flex-1" />
        <button
          onClick={() => onMove(index - 1)}
          disabled={index === 0}
          aria-label="Move up"
          className="w-9 h-9 flex items-center justify-center rounded-full text-[#192830] hover:bg-[#efeeea] disabled:opacity-30 transition"
        >
          <ChevronUp size={18} />
        </button>
        <button
          onClick={() => onMove(index + 1)}
          disabled={index === total - 1}
          aria-label="Move down"
          className="w-9 h-9 flex items-center justify-center rounded-full text-[#192830] hover:bg-[#efeeea] disabled:opacity-30 transition"
        >
          <ChevronDown size={18} />
        </button>
        <button
          onClick={onRemove}
          aria-label={pt.caregiver.contactRemove}
          className="w-9 h-9 flex items-center justify-center rounded-full text-[#ba1a1a] hover:bg-[#ffdad6]/50 transition"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label={pt.caregiver.contactName}
          value={contact.name}
          onChange={v => onChange({ name: v })}
        />
        <Field
          label={pt.caregiver.contactPhone}
          type="tel"
          value={contact.phone}
          onChange={v => onChange({ phone: v })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#43474a] mb-1">
          {pt.caregiver.contactRelationship}
        </label>
        <select
          value={contact.relationship}
          onChange={e => onChange({ relationship: e.target.value as ContactRelationship })}
          className={inputClass}
        >
          {RELATIONSHIPS.map(r => (
            <option key={r} value={r}>
              {pt.caregiver.relationships[r]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm font-medium text-[#43474a] cursor-pointer">
          <input
            type="checkbox"
            checked={contact.notify_missed_meds}
            onChange={e => onChange({ notify_missed_meds: e.target.checked })}
            className="w-5 h-5 accent-[#49654d]"
          />
          {pt.caregiver.notifyMissedShort}
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-[#43474a] cursor-pointer">
          <input
            type="checkbox"
            checked={contact.notify_emergency}
            onChange={e => onChange({ notify_emergency: e.target.checked })}
            className="w-5 h-5 accent-[#ba1a1a]"
          />
          {pt.caregiver.notifyEmergencyShort}
        </label>
      </div>
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
