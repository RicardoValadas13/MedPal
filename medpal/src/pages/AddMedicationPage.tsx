import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Search, X, Plus, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'
import type { Drug } from '../types/database'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const DAY_INDICES: Record<typeof DAYS[number], number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0,
}
const PRESET_TIMES = ['08:00', '12:00', '20:00', '22:00']
const INTERVAL_OPTIONS = [4, 6, 8, 12, 24]

type ScheduleType = 'fixed' | 'interval'

function intervalToTimes(intervalHours: number, firstDose: string): string[] {
  const [h, m] = firstDose.split(':').map(Number)
  const count = Math.floor(24 / intervalHours)
  const times: string[] = []
  let minutes = h * 60 + (m || 0)
  for (let i = 0; i < count; i++) {
    times.push(`${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`)
    minutes += intervalHours * 60
  }
  return times
}

export function AddMedicationPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Drug[]>([])
  const [selected, setSelected] = useState<Drug | null>(null)
  const [dose, setDose] = useState('')
  const [scheduleType, setScheduleType] = useState<ScheduleType>('fixed')
  const [times, setTimes] = useState<string[]>(['08:00'])
  const [customHour, setCustomHour] = useState('')
  const [customMin, setCustomMin] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [intervalHours, setIntervalHours] = useState(8)
  const [firstDose, setFirstDose] = useState('08:00')
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [withFood, setWithFood] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hourRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('drugs')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(8)
      setResults(data ?? [])
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  function toggleDay(idx: number) {
    setDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx])
  }

  function toggleTime(t: string) {
    setTimes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  function removeTime(t: string) {
    setTimes(prev => prev.filter(x => x !== t))
  }

  function addCustomTime() {
    const h = customHour.padStart(2, '0')
    const m = (customMin || '00').padStart(2, '0')
    if (!customHour) return
    const t = `${h}:${m}`
    if (!times.includes(t)) setTimes(prev => [...prev, t].sort())
    setCustomHour('')
    setCustomMin('')
    setShowCustomInput(false)
  }

  const medicationName = selected ? selected.name : query.trim()

  const resolvedTimes = scheduleType === 'interval'
    ? intervalToTimes(intervalHours, firstDose)
    : times

  async function handleSave() {
    if (!user || !medicationName || resolvedTimes.length === 0 || days.length === 0) return
    setSaving(true)
    setError(null)

    try {
      await supabase.from('profiles').upsert({ id: user.id }, { onConflict: 'id' })

      const { data: med, error: medError } = await supabase
        .from('user_medications')
        .insert({
          user_id: user.id,
          drug_id: selected?.id ?? null,
          prescription_item_id: null,
          display_name: medicationName,
          dosage: dose || selected?.strength || null,
          start_date: new Date().toISOString().split('T')[0],
          source: 'manual',
          is_active: true,
        })
        .select()
        .single()

      if (medError) throw medError
      if (!med) throw new Error('No medication returned after insert')

      for (const time of resolvedTimes) {
        const { error: schedError } = await supabase.from('schedules').insert({
          user_medication_id: med.id,
          time_of_day: time,
          days_of_week: days,
          dose_amount: dose ? parseFloat(dose) : null,
          dose_unit: null,
          with_food: withFood,
        })
        if (schedError) throw schedError
      }

      navigate('/')
    } catch (err) {
      console.error('Save medication error:', err)
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message
      setError(msg || pt.common.error)
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex flex-col">
      {/* Header */}
      <div className="px-5 pt-8 pb-4 bg-[#f5f5f0]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium text-[#43474a] mb-5 min-h-[44px] -ml-1 px-1"
        >
          <ChevronLeft size={18} />
          {pt.common.back}
        </button>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#192830]">
          {pt.addMedication.title}
        </h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto px-5 pb-32 space-y-4">

        {/* Search card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="relative">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ba0a3] pointer-events-none" />
            <input
              type="text"
              value={selected ? selected.name : query}
              onChange={e => { setQuery(e.target.value); setSelected(null) }}
              placeholder={pt.addMedication.searchPlaceholder}
              className="w-full h-14 pl-11 pr-4 text-base text-[#1b1c1a] placeholder:text-[#9ba0a3] bg-transparent focus:outline-none"
            />
            {(selected || query) && (
              <button
                onClick={() => { setSelected(null); setQuery('') }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9ba0a3] hover:text-[#43474a] transition"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Dropdown results */}
          {results.length > 0 && !selected && (
            <div className="border-t border-[#f0f0ec]">
              {results.map(drug => (
                <button
                  key={drug.id}
                  onClick={() => { setSelected(drug); setQuery(''); setResults([]) }}
                  className="w-full text-left px-4 py-3.5 border-b border-[#f0f0ec] last:border-0 hover:bg-[#fafaf7] active:bg-[#f0f0ec] transition"
                >
                  <span className="font-semibold text-[#1b1c1a] text-sm">{drug.name}</span>
                  {drug.strength && <span className="text-[#43474a] text-sm ml-2">{drug.strength}</span>}
                  {drug.form && <span className="text-[#9ba0a3] text-sm ml-1">· {drug.form}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Selected drug badge */}
          {selected && (
            <div className="border-t border-[#f0f0ec] px-4 py-3 bg-[#f0f7f1]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#49654d] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#192830] truncate">{selected.name}</p>
                  {selected.active_substance && (
                    <p className="text-xs text-[#49654d] mt-0.5">{selected.active_substance}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dose card */}
        <div className="bg-white rounded-2xl shadow-sm px-4 py-4">
          <label className="block text-sm font-semibold text-[#43474a] mb-2">
            {pt.addMedication.doseLabel}
          </label>
          <input
            type="text"
            value={dose}
            onChange={e => setDose(e.target.value)}
            placeholder={selected?.strength ?? 'e.g. 500mg'}
            className="w-full h-11 px-3 text-base rounded-xl border border-[#e4e4de] bg-[#fafaf7] text-[#1b1c1a] placeholder:text-[#b8bbbe] focus:outline-none focus:border-[#49654d] focus:bg-white focus:shadow-[0_0_0_3px_rgba(73,101,77,0.10)] transition"
          />
        </div>

        {/* Times card */}
        <div className="bg-white rounded-2xl shadow-sm px-4 py-4">
          <label className="block text-sm font-semibold text-[#43474a] mb-3">
            {pt.addMedication.hoursLabel}
          </label>

          {/* Mode toggle */}
          <div className="flex rounded-xl border border-[#e4e4de] overflow-hidden mb-3 w-fit">
            {(['fixed', 'interval'] as ScheduleType[]).map(mode => (
              <button key={mode} type="button" onClick={() => setScheduleType(mode)}
                className={`px-4 py-2 text-sm font-semibold transition ${
                  scheduleType === mode ? 'bg-[#192830] text-white' : 'bg-[#fafaf7] text-[#43474a] hover:bg-[#f0f0ec]'
                }`}>
                {mode === 'fixed' ? 'Fixed times' : 'Every N hours'}
              </button>
            ))}
          </div>

          {scheduleType === 'fixed' ? (<>
            {/* Preset times grid */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {PRESET_TIMES.map(t => (
                <button key={t} onClick={() => toggleTime(t)}
                  className={`h-11 text-sm font-semibold rounded-xl border transition ${
                    times.includes(t)
                      ? 'bg-[#192830] text-white border-[#192830]'
                      : 'bg-[#fafaf7] text-[#43474a] border-[#e4e4de] hover:border-[#192830] hover:text-[#192830]'
                  }`}>{t}</button>
              ))}
            </div>

            {times.filter(t => !PRESET_TIMES.includes(t)).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {times.filter(t => !PRESET_TIMES.includes(t)).map(t => (
                  <div key={t} className="flex items-center gap-1.5 h-9 pl-3 pr-2 bg-[#192830] text-white text-sm font-semibold rounded-xl">
                    <Clock size={13} className="opacity-70" />{t}
                    <button onClick={() => removeTime(t)} className="ml-0.5 opacity-60 hover:opacity-100 transition"><X size={13} /></button>
                  </div>
                ))}
              </div>
            )}

            {showCustomInput ? (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 flex-1 h-11 border border-[#49654d] rounded-xl bg-[#f0f7f1] px-3 shadow-[0_0_0_3px_rgba(73,101,77,0.10)]">
                  <input ref={hourRef} type="number" min={0} max={23} value={customHour}
                    onChange={e => setCustomHour(e.target.value.slice(-2))} placeholder="HH"
                    className="w-8 text-center text-base font-semibold text-[#192830] bg-transparent focus:outline-none placeholder:text-[#b8bbbe] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                  <span className="text-base font-bold text-[#9ba0a3]">:</span>
                  <input type="number" min={0} max={59} value={customMin}
                    onChange={e => setCustomMin(e.target.value.slice(-2))} placeholder="MM"
                    onKeyDown={e => e.key === 'Enter' && addCustomTime()}
                    className="w-8 text-center text-base font-semibold text-[#192830] bg-transparent focus:outline-none placeholder:text-[#b8bbbe] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                </div>
                <button onClick={addCustomTime} className="h-11 px-4 bg-[#192830] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition">Add</button>
                <button onClick={() => { setShowCustomInput(false); setCustomHour(''); setCustomMin('') }}
                  className="h-11 w-11 flex items-center justify-center rounded-xl border border-[#e4e4de] text-[#9ba0a3] hover:text-[#43474a] transition"><X size={16} /></button>
              </div>
            ) : (
              <button onClick={() => { setShowCustomInput(true); setTimeout(() => hourRef.current?.focus(), 50) }}
                className="flex items-center gap-2 h-10 px-3 text-sm font-medium text-[#49654d] rounded-xl border border-dashed border-[#49654d]/40 hover:bg-[#f0f7f1] transition w-full justify-center">
                <Plus size={15} />Add custom time
              </button>
            )}
          </>) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#43474a]">Every</span>
                <select value={intervalHours} onChange={e => setIntervalHours(Number(e.target.value))}
                  className="h-11 px-3 text-sm font-semibold rounded-xl border border-[#e4e4de] bg-[#fafaf7] text-[#1b1c1a] focus:outline-none focus:border-[#49654d] transition">
                  {INTERVAL_OPTIONS.map(h => <option key={h} value={h}>{h}h</option>)}
                </select>
                <span className="text-sm text-[#43474a]">hours</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#43474a]">First dose</span>
                <input type="time" value={firstDose} onChange={e => setFirstDose(e.target.value)}
                  className="h-11 px-3 text-sm font-semibold rounded-xl border border-[#e4e4de] bg-[#fafaf7] text-[#1b1c1a] focus:outline-none focus:border-[#49654d] transition" />
              </div>
              <p className="text-xs text-[#9ba0a3]">Times: {intervalToTimes(intervalHours, firstDose).join(', ')}</p>
            </div>
          )}
        </div>

        {/* Days card */}
        <div className="bg-white rounded-2xl shadow-sm px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-[#43474a]">
              {pt.addMedication.daysLabel}
            </label>
            <button
              onClick={() => setDays(days.length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6])}
              className="text-xs font-semibold text-[#49654d] hover:opacity-70 transition"
            >
              {days.length === 7 ? 'Clear all' : 'Select all'}
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map(d => {
              const idx = DAY_INDICES[d]
              const active = days.includes(idx)
              return (
                <button
                  key={d}
                  onClick={() => toggleDay(idx)}
                  className={`flex flex-col items-center justify-center h-12 rounded-xl border text-xs font-semibold transition ${
                    active
                      ? 'bg-[#192830] text-white border-[#192830]'
                      : 'bg-[#fafaf7] text-[#43474a] border-[#e4e4de] hover:border-[#192830] hover:text-[#192830]'
                  }`}
                >
                  {pt.addMedication.days[d]}
                </button>
              )
            })}
          </div>
        </div>

        {/* With food card */}
        <div className="bg-white rounded-2xl shadow-sm px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1b1c1a]">{pt.addMedication.withFoodLabel}</p>
              <p className="text-xs text-[#9ba0a3] mt-0.5">Take this medication with a meal</p>
            </div>
            <button
              onClick={() => setWithFood(p => !p)}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${withFood ? 'bg-[#49654d]' : 'bg-[#d4d7d9]'}`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  withFood ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-[#fff0f0] border border-[#f5b8b8] rounded-2xl px-4 py-3">
            <p className="text-sm text-[#ba1a1a] font-medium">{error}</p>
          </div>
        )}
      </div>

      {/* Sticky save button */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-4 bg-gradient-to-t from-[#f5f5f0] via-[#f5f5f0] to-transparent">
        <button
          onClick={handleSave}
          disabled={saving || !medicationName || resolvedTimes.length === 0 || days.length === 0}
          className="w-full h-14 bg-[#192830] text-white text-base font-semibold rounded-2xl hover:opacity-90 active:scale-[0.98] transition disabled:opacity-35 shadow-[0_4px_20px_rgba(25,40,48,0.18)]"
        >
          {saving ? pt.common.loading : pt.addMedication.saveButton}
        </button>
      </div>
    </div>
  )
}
