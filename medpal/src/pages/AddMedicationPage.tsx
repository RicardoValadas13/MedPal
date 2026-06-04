import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'
import type { Drug } from '../types/database'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const DAY_INDICES: Record<typeof DAYS[number], number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0,
}
const DEFAULT_TIMES = ['08:00', '20:00']

export function AddMedicationPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Drug[]>([])
  const [selected, setSelected] = useState<Drug | null>(null)
  const [dose, setDose] = useState('')
  const [times, setTimes] = useState<string[]>(['08:00'])
  const [customTime, setCustomTime] = useState('')
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [withFood, setWithFood] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  function addCustomTime() {
    if (customTime && !times.includes(customTime)) {
      setTimes(prev => [...prev, customTime].sort())
      setCustomTime('')
    }
  }

  async function handleSave() {
    if (!user || !selected || times.length === 0 || days.length === 0) return
    setSaving(true)
    setError(null)

    try {
      const { data: med, error: medError } = await supabase
        .from('user_medications')
        .insert({
          user_id: user.id,
          drug_id: selected.id,
          prescription_item_id: null,
          display_name: selected.name,
          dosage: dose || selected.strength,
          start_date: new Date().toISOString().split('T')[0],
          source: 'manual',
          is_active: true,
        })
        .select()
        .single()

      if (medError) throw medError

      for (const time of times) {
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
      console.error(err)
      setError(pt.common.error)
      setSaving(false)
    }
  }

  return (
    <div className="px-5 pt-8 pb-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-base font-medium text-[#43474a] mb-6 min-h-[48px]">
        <ChevronLeft size={18} />
        {pt.common.back}
      </button>
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#192830] mb-8">{pt.addMedication.title}</h1>

      {/* Drug search */}
      <div className="relative mb-3">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#73787b]" />
        <input
          type="text"
          value={selected ? selected.name : query}
          onChange={e => { setQuery(e.target.value); setSelected(null) }}
          placeholder={pt.addMedication.searchPlaceholder}
          className="w-full min-h-[48px] pl-11 pr-4 py-3 text-lg rounded-lg border-[1.5px] border-[#c3c7ca] bg-white text-[#1b1c1a] placeholder:text-[#73787b] focus:outline-none focus:border-[#49654d] focus:shadow-[0_0_0_3px_rgba(73,101,77,0.12)] transition"
        />
      </div>

      {/* Search results */}
      {results.length > 0 && !selected && (
        <div className="bg-white border border-[#c3c7ca] rounded-2xl mb-5 overflow-hidden">
          {results.map(drug => (
            <button
              key={drug.id}
              onClick={() => { setSelected(drug); setQuery(''); setResults([]) }}
              className="w-full text-left px-5 py-4 text-lg border-b border-[#e9e8e4] last:border-0 hover:bg-[#f4f4f0] active:bg-[#e9e8e4] transition"
            >
              <span className="font-semibold text-[#1b1c1a]">{drug.name}</span>
              {drug.strength && <span className="text-[#43474a] ml-2">{drug.strength}</span>}
              {drug.form && <span className="text-[#73787b] ml-1">· {drug.form}</span>}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="bg-[#cbebcd] border border-[#49654d]/30 rounded-2xl px-5 py-4 mb-6">
          <p className="text-lg font-semibold text-[#192830]">{selected.name}</p>
          {selected.active_substance && (
            <p className="text-sm font-medium text-[#49654d] mt-0.5">{selected.active_substance}</p>
          )}
        </div>
      )}

      {/* Dose */}
      <div className="mb-6">
        <label className="block text-base font-semibold text-[#1b1c1a] mb-2">
          {pt.addMedication.doseLabel}
        </label>
        <input
          type="text"
          value={dose}
          onChange={e => setDose(e.target.value)}
          placeholder={selected?.strength ?? ''}
          className="w-full min-h-[48px] px-4 py-3 text-lg rounded-lg border-[1.5px] border-[#c3c7ca] bg-white text-[#1b1c1a] placeholder:text-[#73787b] focus:outline-none focus:border-[#49654d] focus:shadow-[0_0_0_3px_rgba(73,101,77,0.12)] transition"
        />
      </div>

      {/* Times */}
      <div className="mb-6">
        <label className="block text-base font-semibold text-[#1b1c1a] mb-3">
          {pt.addMedication.hoursLabel}
        </label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_TIMES.map(t => (
            <button
              key={t}
              onClick={() => toggleTime(t)}
              className={`px-5 py-2.5 text-base font-semibold rounded-lg border-[1.5px] transition min-h-[48px] ${
                times.includes(t)
                  ? 'bg-[#192830] text-white border-[#192830]'
                  : 'bg-white text-[#1b1c1a] border-[#c3c7ca] hover:bg-[#f4f4f0]'
              }`}
            >
              {t}
            </button>
          ))}
          {times.filter(t => !DEFAULT_TIMES.includes(t)).map(t => (
            <button
              key={t}
              onClick={() => toggleTime(t)}
              className="px-5 py-2.5 text-base font-semibold rounded-lg border-[1.5px] bg-[#192830] text-white border-[#192830] min-h-[48px]"
            >
              {t}
            </button>
          ))}
          <div className="flex gap-2">
            <input
              type="time"
              value={customTime}
              onChange={e => setCustomTime(e.target.value)}
              className="px-4 py-2.5 text-lg rounded-lg border-[1.5px] border-[#c3c7ca] bg-white text-[#1b1c1a] focus:outline-none focus:border-[#49654d] focus:shadow-[0_0_0_3px_rgba(73,101,77,0.12)] min-h-[48px] transition"
            />
            <button
              onClick={addCustomTime}
              className="px-4 py-2.5 text-lg font-semibold rounded-lg border-[1.5px] border-[#c3c7ca] bg-white text-[#1b1c1a] hover:bg-[#f4f4f0] min-h-[48px] transition"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Days */}
      <div className="mb-6">
        <label className="block text-base font-semibold text-[#1b1c1a] mb-3">
          {pt.addMedication.daysLabel}
        </label>
        <div className="flex gap-1.5">
          {DAYS.map(d => {
            const idx = DAY_INDICES[d]
            const active = days.includes(idx)
            return (
              <button
                key={d}
                onClick={() => toggleDay(idx)}
                className={`flex-1 py-3 text-sm font-semibold rounded-lg border-[1.5px] transition min-h-[48px] ${
                  active
                    ? 'bg-[#192830] text-white border-[#192830]'
                    : 'bg-white text-[#43474a] border-[#c3c7ca] hover:bg-[#f4f4f0]'
                }`}
              >
                {pt.addMedication.days[d]}
              </button>
            )
          })}
        </div>
      </div>

      {/* With food */}
      <div className="flex items-center justify-between mb-8 py-4 border-t border-b border-[#e9e8e4]">
        <span className="text-base font-semibold text-[#1b1c1a]">{pt.addMedication.withFoodLabel}</span>
        <button
          onClick={() => setWithFood(p => !p)}
          className={`relative w-12 h-7 rounded-full transition ${withFood ? 'bg-[#49654d]' : 'bg-[#c3c7ca]'}`}
        >
          <span
            className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              withFood ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {error && <p className="text-[#ba1a1a] text-base mb-4">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving || !selected || times.length === 0 || days.length === 0}
        className="w-full min-h-[48px] py-3 bg-[#192830] text-white text-base font-semibold rounded-lg hover:opacity-[0.88] hover:-translate-y-px active:scale-[0.98] transition disabled:opacity-40 shadow-[0_4px_16px_rgba(25,40,48,0.12)]"
      >
        {saving ? pt.common.loading : pt.addMedication.saveButton}
      </button>
    </div>
  )
}
