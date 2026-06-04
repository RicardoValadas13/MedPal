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
    setDays(prev =>
      prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
    )
  }

  function toggleTime(t: string) {
    setTimes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    )
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
    <div className="px-4 pt-6 pb-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 mb-4">
        <ChevronLeft size={16} />
        {pt.common.back}
      </button>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">{pt.addMedication.title}</h1>

      {/* Drug search */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={selected ? selected.name : query}
          onChange={e => { setQuery(e.target.value); setSelected(null) }}
          placeholder={pt.addMedication.searchPlaceholder}
          className="w-full pl-9 pr-4 py-3 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>

      {/* Search results */}
      {results.length > 0 && !selected && (
        <div className="bg-white border-[0.5px] border-gray-200 rounded-2xl mb-4 overflow-hidden">
          {results.map(drug => (
            <button
              key={drug.id}
              onClick={() => { setSelected(drug); setQuery(''); setResults([]) }}
              className="w-full text-left px-4 py-3 text-sm border-b border-gray-100 last:border-0 hover:bg-gray-50 active:bg-gray-100"
            >
              <span className="font-medium text-gray-900">{drug.name}</span>
              {drug.strength && <span className="text-gray-400 ml-2">{drug.strength}</span>}
              {drug.form && <span className="text-gray-400 ml-1">· {drug.form}</span>}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="bg-green-50 border-[0.5px] border-green-200 rounded-2xl px-4 py-3 mb-6">
          <p className="text-sm font-semibold text-green-800">{selected.name}</p>
          {selected.active_substance && (
            <p className="text-xs text-green-600 mt-0.5">{selected.active_substance}</p>
          )}
        </div>
      )}

      {/* Dose */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {pt.addMedication.doseLabel}
        </label>
        <input
          type="text"
          value={dose}
          onChange={e => setDose(e.target.value)}
          placeholder={selected?.strength ?? ''}
          className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>

      {/* Times */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {pt.addMedication.hoursLabel}
        </label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_TIMES.map(t => (
            <button
              key={t}
              onClick={() => toggleTime(t)}
              className={`px-4 py-2 text-sm rounded-xl border transition min-h-[44px] ${
                times.includes(t)
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
          {times.filter(t => !DEFAULT_TIMES.includes(t)).map(t => (
            <button
              key={t}
              onClick={() => toggleTime(t)}
              className="px-4 py-2 text-sm rounded-xl border bg-green-600 text-white border-green-600 min-h-[44px]"
            >
              {t}
            </button>
          ))}
          <div className="flex gap-1">
            <input
              type="time"
              value={customTime}
              onChange={e => setCustomTime(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 min-h-[44px]"
            />
            <button
              onClick={addCustomTime}
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 min-h-[44px]"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Days */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className={`flex-1 py-2.5 text-xs font-medium rounded-xl border transition min-h-[44px] ${
                  active
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {pt.addMedication.days[d]}
              </button>
            )
          })}
        </div>
      </div>

      {/* With food */}
      <div className="flex items-center justify-between mb-8 py-3 border-t border-b border-gray-100">
        <span className="text-sm font-medium text-gray-700">{pt.addMedication.withFoodLabel}</span>
        <button
          onClick={() => setWithFood(p => !p)}
          className={`relative w-12 h-6 rounded-full transition ${withFood ? 'bg-green-500' : 'bg-gray-200'}`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              withFood ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {error && <p className="text-red-600 text-xs mb-4">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving || !selected || times.length === 0 || days.length === 0}
        className="w-full py-4 bg-green-600 text-white text-sm font-semibold rounded-2xl hover:bg-green-700 active:scale-[0.98] transition disabled:opacity-40 min-h-[44px]"
      >
        {saving ? pt.common.loading : pt.addMedication.saveButton}
      </button>
    </div>
  )
}
