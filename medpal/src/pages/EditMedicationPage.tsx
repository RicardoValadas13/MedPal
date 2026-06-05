import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { pt } from '../i18n/pt'
import { TimePickerField } from '../components/TimePickerField'
import type { Drug } from '../types/database'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const DAY_INDICES: Record<typeof DAYS[number], number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0,
}
const DEFAULT_TIMES = ['08:00', '20:00']
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

export function EditMedicationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Drug[]>([])
  const [selected, setSelected] = useState<Drug | null>(null)
  const [dose, setDose] = useState('')
  const [scheduleType, setScheduleType] = useState<ScheduleType>('fixed')
  const [times, setTimes] = useState<string[]>([])
  const [intervalHours, setIntervalHours] = useState(8)
  const [firstDose, setFirstDose] = useState('08:00')
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [withFood, setWithFood] = useState(false)
  const [scheduleIds, setScheduleIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    loadExisting()
  }, [id])

  async function loadExisting() {
    const { data: med } = await supabase
      .from('user_medications')
      .select('*')
      .eq('id', id)
      .single()

    if (!med) { navigate('/medications'); return }

    setQuery(med.display_name)
    setDose(med.dosage ?? '')

    const { data: scheds } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_medication_id', id)

    if (scheds && scheds.length > 0) {
      setTimes(scheds.map((s: { time_of_day: string }) => s.time_of_day.slice(0, 5)))
      setDays(scheds[0].days_of_week ?? [0, 1, 2, 3, 4, 5, 6])
      setWithFood(scheds[0].with_food ?? false)
      setScheduleIds(scheds.map((s: { id: string }) => s.id))
    }

    setLoading(false)
  }

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

  const medicationName = selected ? selected.name : query.trim()

  const resolvedTimes = scheduleType === 'interval'
    ? intervalToTimes(intervalHours, firstDose)
    : times

  async function handleSave() {
    if (!id || !medicationName || resolvedTimes.length === 0 || days.length === 0) return
    setSaving(true)
    setError(null)

    try {
      const { error: medError } = await supabase
        .from('user_medications')
        .update({
          display_name: medicationName,
          drug_id: selected?.id ?? undefined,
          dosage: dose || null,
        })
        .eq('id', id)

      if (medError) throw medError

      // Delete old schedules and re-create
      if (scheduleIds.length > 0) {
        await supabase.from('schedules').delete().in('id', scheduleIds)
      }

      for (const time of resolvedTimes) {
        const { error: schedError } = await supabase.from('schedules').insert({
          user_medication_id: id,
          time_of_day: time,
          days_of_week: days,
          dose_amount: dose ? parseFloat(dose) : null,
          dose_unit: null,
          with_food: withFood,
        })
        if (schedError) throw schedError
      }

      navigate('/medications')
    } catch (err) {
      console.error('Edit medication error:', err)
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message
      setError(msg || pt.common.error)
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="px-5 pt-8"><p className="text-[#43474a]">{pt.common.loading}</p></div>
  }

  return (
    <div className="px-5 pt-8 pb-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-base font-medium text-[#43474a] mb-6 min-h-[48px]">
        <ChevronLeft size={18} />
        {pt.common.back}
      </button>
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#192830] mb-8">Edit Medication</h1>

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
        <label className="block text-base font-semibold text-[#1b1c1a] mb-2">{pt.addMedication.doseLabel}</label>
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
        <label className="block text-base font-semibold text-[#1b1c1a] mb-3">{pt.addMedication.hoursLabel}</label>

        {/* Mode toggle */}
        <div className="flex rounded-xl border border-[#c3c7ca] overflow-hidden mb-3 w-fit">
          {(['fixed', 'interval'] as ScheduleType[]).map(mode => (
            <button key={mode} type="button" onClick={() => setScheduleType(mode)}
              className={`px-4 py-2 text-sm font-semibold transition ${
                scheduleType === mode ? 'bg-[#192830] text-white' : 'bg-white text-[#43474a] hover:bg-[#f4f4f0]'
              }`}>
              {mode === 'fixed' ? 'Fixed times' : 'Every N hours'}
            </button>
          ))}
        </div>

        {scheduleType === 'fixed' ? (
          <TimePickerField times={times} onChange={setTimes} />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-base text-[#43474a]">Every</span>
              <select value={intervalHours} onChange={e => setIntervalHours(Number(e.target.value))}
                className="min-h-[48px] px-4 py-2 text-base font-semibold rounded-lg border-[1.5px] border-[#c3c7ca] bg-white text-[#1b1c1a] focus:outline-none focus:border-[#49654d] transition">
                {INTERVAL_OPTIONS.map(h => <option key={h} value={h}>{h}h</option>)}
              </select>
              <span className="text-base text-[#43474a]">hours</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-base text-[#43474a]">First dose</span>
              <input type="time" value={firstDose} onChange={e => setFirstDose(e.target.value)}
                className="min-h-[48px] px-4 py-2 text-base font-semibold rounded-lg border-[1.5px] border-[#c3c7ca] bg-white text-[#1b1c1a] focus:outline-none focus:border-[#49654d] transition" />
            </div>
            <p className="text-sm text-[#73787b]">Times: {intervalToTimes(intervalHours, firstDose).join(', ')}</p>
          </div>
        )}
      </div>

      {/* Days */}
      <div className="mb-6">
        <label className="block text-base font-semibold text-[#1b1c1a] mb-3">{pt.addMedication.daysLabel}</label>
        <div className="flex gap-1.5">
          {DAYS.map(d => {
            const idx = DAY_INDICES[d]
            const active = days.includes(idx)
            return (
              <button
                key={d}
                onClick={() => toggleDay(idx)}
                className={`flex-1 py-3 text-sm font-semibold rounded-lg border-[1.5px] transition min-h-[48px] ${
                  active ? 'bg-[#192830] text-white border-[#192830]' : 'bg-white text-[#43474a] border-[#c3c7ca] hover:bg-[#f4f4f0]'
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
          <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${withFood ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {error && <p className="text-[#ba1a1a] text-base mb-4">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving || !medicationName || resolvedTimes.length === 0 || days.length === 0}
        className="w-full min-h-[48px] py-3 bg-[#192830] text-white text-base font-semibold rounded-lg hover:opacity-[0.88] hover:-translate-y-px active:scale-[0.98] transition disabled:opacity-40 shadow-[0_4px_16px_rgba(25,40,48,0.12)]"
      >
        {saving ? pt.common.loading : 'Save Changes'}
      </button>
    </div>
  )
}
