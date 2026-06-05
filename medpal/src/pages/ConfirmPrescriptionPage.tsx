import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, AlertTriangle, ExternalLink, ChevronLeft, Plus, Trash2, Save, Loader2 } from 'lucide-react'
import { TimePickerField } from '../components/TimePickerField'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'
import type { PrescriptionItem, Drug } from '../types/database'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const DAY_INDICES: Record<typeof DAYS[number], number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0,
}
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
const INTERVAL_OPTIONS = [4, 6, 8, 12, 24]

type ScheduleType = 'fixed' | 'interval'

interface OcrSchedule {
  type: ScheduleType
  times: string[]
  days: string[]
  take_with_food: boolean
  interval_hours?: number
  first_dose?: string
  duration_days?: number | null
}

interface ItemWithCandidates extends PrescriptionItem {
  candidates?: Drug[]
  selectedDrugId?: string | null
  _scheduleType: ScheduleType
  _times: string[]
  _days: number[]
  _withFood: boolean
  _intervalHours: number
  _firstDose: string
  _startDate: string
  _endDate: string
  _hasEndDate: boolean
}

interface ManualItem {
  id: string
  name: string
  dosage: string
  scheduleType: ScheduleType
  times: string[]
  days: number[]
  withFood: boolean
  intervalHours: number
  firstDose: string
  startDate: string
  endDate: string
  hasEndDate: boolean
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function addDays(date: string, n: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function dayNameToIndex(name: string): number {
  return DAY_INDICES[name as typeof DAYS[number]] ?? 0
}

function intervalToTimes(intervalHours: number, firstDose: string): string[] {
  const [h, m] = firstDose.split(':').map(Number)
  const count = Math.floor(24 / intervalHours)
  const times: string[] = []
  let minutes = h * 60 + (m || 0)
  for (let i = 0; i < count; i++) {
    times.push(
      `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
    )
    minutes += intervalHours * 60
  }
  return times
}

function scheduleToState(sched: OcrSchedule | null, t0: string): Partial<ItemWithCandidates> {
  const durationDays = sched?.duration_days ?? null
  if (!sched) {
    return {
      _scheduleType: 'fixed',
      _times: ['08:00'],
      _days: ALL_DAYS,
      _withFood: false,
      _intervalHours: 8, _firstDose: '08:00',
      _startDate: t0,
      _hasEndDate: false,
      _endDate: addDays(t0, 30),
    }
  }
  const days = sched.days?.length ? sched.days.map(dayNameToIndex) : ALL_DAYS
  const base = {
    _days: days,
    _withFood: sched.take_with_food ?? false,
    _customHour: '', _customMin: '',
    _startDate: t0,
    _hasEndDate: durationDays !== null,
    _endDate: durationDays !== null ? addDays(t0, durationDays) : addDays(t0, 30),
  }
  if (sched.type === 'interval') {
    return {
      ...base,
      _scheduleType: 'interval',
      _intervalHours: sched.interval_hours ?? 8,
      _firstDose: sched.first_dose ?? '08:00',
      _times: intervalToTimes(sched.interval_hours ?? 8, sched.first_dose ?? '08:00'),
    }
  }
  return {
    ...base,
    _scheduleType: 'fixed',
    _times: sched.times?.length ? sched.times : ['08:00'],
    _intervalHours: 8, _firstDose: '08:00',
  }
}

function resolvedTimes(item: { _scheduleType: ScheduleType; _times: string[]; _intervalHours: number; _firstDose: string }): string[] {
  if (item._scheduleType === 'interval') return intervalToTimes(item._intervalHours, item._firstDose)
  return item._times.length > 0 ? item._times : ['08:00']
}

export function ConfirmPrescriptionPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<ItemWithCandidates[]>([])
  const [manualItems, setManualItems] = useState<ManualItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadItems() {
    setLoading(true)
    const t0 = today()

    const { data: prescription } = await supabase
      .from('prescriptions')
      .select('raw_extraction')
      .eq('id', id!)
      .single()

    const rawExtraction = prescription?.raw_extraction as {
      items?: Array<{
        name: string
        dosage: string | null
        duration_days: number | null
        schedule: OcrSchedule | null
      }>
    } | null
    const { data, error } = await supabase
      .from('prescription_items')
      .select('*')
      .eq('prescription_id', id!)

    if (error || !data) {
      setError(pt.common.error)
      setLoading(false)
      return
    }

    // Fallback: build from raw OCR if no DB items
    if (data.length === 0 && rawExtraction?.items?.length) {
      const synthetic: ItemWithCandidates[] = rawExtraction.items.map((item, i) => ({
        id: `synthetic-${i}`,
        prescription_id: id!,
        drug_id: null,
        extracted_name: item.name,
        extracted_dosage: item.dosage ?? null,
        extracted_form: null,
        quantity: null,
        posology_text: null,
        posology_structured: null,
        match_confidence: null,
        match_status: 'unmatched',
        field_confidences: null,
        created_at: new Date().toISOString(),
        selectedDrugId: null,
        ...scheduleToState(item.schedule, t0),
      } as ItemWithCandidates))
      setItems(synthetic)
      setLoading(false)
      return
    }

    const enriched: ItemWithCandidates[] = await Promise.all(
      data.map(async (item) => {
        const sched = item.posology_structured as OcrSchedule | null
        const base: ItemWithCandidates = {
          ...item,
          selectedDrugId: item.drug_id,
          ...scheduleToState(sched, t0),
        } as ItemWithCandidates

        if (item.match_status === 'ambiguous' && item.extracted_name) {
          const { data: candidates } = await supabase
            .from('drugs').select('*')
            .ilike('name', `%${item.extracted_name.split(' ')[0]}%`)
            .limit(5)
          return { ...base, candidates: candidates ?? [] }
        }
        return base
      })
    )

    setItems(enriched)
    setLoading(false)
  }

  function updateItem(index: number, patch: Partial<ItemWithCandidates>) {
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function updateItemTimes(index: number, newTimes: string[]) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, _times: newTimes } : item))
  }

  function toggleItemDay(index: number, idx: number) {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const days = item._days.includes(idx) ? item._days.filter(d => d !== idx) : [...item._days, idx]
      return { ...item, _days: days }
    }))
  }

  function addManualItem() {
    const t0 = today()
    setManualItems(prev => [...prev, {
      id: crypto.randomUUID(),
      name: '', dosage: '',
      scheduleType: 'fixed',
      times: ['08:00'], days: ALL_DAYS, withFood: false,
      intervalHours: 8, firstDose: '08:00',
      startDate: t0, endDate: addDays(t0, 30), hasEndDate: false,
    }])
  }

  function updateManualItem(id: string, patch: Partial<ManualItem>) {
    setManualItems(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)))
  }

  function updateManualTimes(id: string, newTimes: string[]) {
    updateManualItem(id, { times: newTimes })
  }

  function toggleManualDay(id: string, idx: number) {
    setManualItems(prev => prev.map(m => {
      if (m.id !== id) return m
      const days = m.days.includes(idx) ? m.days.filter(d => d !== idx) : [...m.days, idx]
      return { ...m, days }
    }))
  }

  function removeManualItem(id: string) {
    setManualItems(prev => prev.filter(m => m.id !== id))
  }

  async function handleConfirm() {
    if (!user || !id) return
    setSaving(true)
    setError(null)

    try {
      const validManual = manualItems.filter(m => m.name.trim())
      for (const m of validManual) {
        const times = m.scheduleType === 'interval'
          ? intervalToTimes(m.intervalHours, m.firstDose)
          : (m.times.length > 0 ? m.times : ['08:00'])

        const { data: pi, error: piErr } = await supabase
          .from('prescription_items')
          .insert({
            prescription_id: id!,
            extracted_name: m.name.trim(),
            extracted_dosage: m.dosage.trim() || null,
            quantity: null,
            match_status: 'unmatched',
            posology_text: null,
            posology_structured: null,
            extracted_form: null,
            field_confidences: null,
          })
          .select().single()
        if (piErr) throw piErr

        const { data: med, error: medErr } = await supabase
          .from('user_medications')
          .insert({
            user_id: user.id,
            drug_id: null,
            prescription_item_id: pi.id,
            display_name: m.name.trim(),
            dosage: m.dosage.trim() || null,
            start_date: m.startDate,
            end_date: m.hasEndDate ? m.endDate : null,
            source: 'prescription',
            is_active: true,
          })
          .select().single()
        if (medErr) throw medErr

        for (const time of times) {
          await supabase.from('schedules').insert({
            user_medication_id: med.id,
            time_of_day: time,
            days_of_week: m.days.length > 0 ? m.days : ALL_DAYS,
            dose_amount: null, dose_unit: null,
            with_food: m.withFood,
          })
        }
      }

      for (const item of items) {
        const isSynthetic = item.id.startsWith('synthetic-')
        const drugId = item.selectedDrugId ?? item.drug_id
        const times = resolvedTimes(item)

        let prescriptionItemId = isSynthetic ? null : item.id
        if (isSynthetic) {
          const { data: pi, error: piErr } = await supabase
            .from('prescription_items')
            .insert({
              prescription_id: id!,
              extracted_name: item.extracted_name,
              extracted_dosage: item.extracted_dosage ?? null,
              extracted_form: null,
              quantity: null,
              posology_text: null,
              posology_structured: null,
              match_status: 'unmatched',
              field_confidences: null,
            })
            .select().single()
          if (piErr) throw piErr
          prescriptionItemId = pi.id
        }

        const { data: med, error: medError } = await supabase
          .from('user_medications')
          .insert({
            user_id: user.id,
            drug_id: drugId,
            prescription_item_id: prescriptionItemId,
            display_name: item.extracted_name,
            dosage: item.extracted_dosage,
            description: item.description ?? null,
            start_date: item._startDate,
            end_date: item._hasEndDate ? item._endDate : null,
            source: 'prescription',
            is_active: true,
          })
          .select().single()
        if (medError) throw medError

        for (const time of times) {
          await supabase.from('schedules').insert({
            user_medication_id: med.id,
            time_of_day: time,
            days_of_week: item._days.length > 0 ? item._days : ALL_DAYS,
            dose_amount: null, dose_unit: null,
            with_food: item._withFood,
          })
        }

        if (!isSynthetic && drugId !== item.drug_id) {
          await supabase.from('prescription_items')
            .update({ drug_id: drugId, match_status: 'manual' })
            .eq('id', item.id)
        }
      }

      await supabase.from('prescriptions').update({ status: 'confirmed' }).eq('id', id)
      navigate('/')
    } catch (err) {
      console.error(err)
      setError(pt.confirm.errorConfirm)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-lg text-[#43474a]">{pt.common.loading}</p>
      </div>
    )
  }

  return (
    <>
    <div className="px-5 pt-8 pb-[152px]">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-base font-medium text-[#43474a] mb-6 min-h-[48px]">
        <ChevronLeft size={18} />{pt.common.back}
      </button>

      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#192830]">{pt.confirm.title}</h1>
      <p className="text-lg text-[#43474a] mt-2 mb-8">{pt.confirm.subtitle}</p>


      {/* Empty state */}
      {items.length === 0 && manualItems.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertTriangle size={36} className="text-[#f3896d]" />
          <p className="text-lg font-semibold text-[#192830]">No medications found</p>
          <p className="text-base text-[#43474a]">The OCR could not read the prescription. Add medications manually below.</p>
        </div>
      )}

      {/* Manual cards */}
      {manualItems.length > 0 && (
        <div className="space-y-4 mb-4">
          {manualItems.map(m => (
            <div key={m.id} className="bg-white rounded-2xl border border-[#e9e8e4] p-5 space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#43474a] uppercase tracking-[0.05em]">Manual entry</p>
                <button onClick={() => removeManualItem(m.id)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[#ba1a1a] hover:bg-[#fff5f5] transition"><Trash2 size={18} /></button>
              </div>
              <input type="text" placeholder="Medication name *" value={m.name}
                onChange={e => updateManualItem(m.id, { name: e.target.value })}
                className="w-full min-h-[48px] px-4 py-2.5 text-base rounded-lg border-[1.5px] border-[#d0d4d7] bg-white text-[#192830] focus:outline-none focus:border-[#49654d] focus:shadow-[0_0_0_3px_rgba(73,101,77,0.12)] transition" />
              <div>
                <label className="block text-base font-semibold text-[#192830] mb-2">{pt.addMedication.doseLabel}</label>
                <input type="text" value={m.dosage} onChange={e => updateManualItem(m.id, { dosage: e.target.value })}
                  className="w-full min-h-[48px] px-4 py-2.5 text-base rounded-lg border-[1.5px] border-[#d0d4d7] bg-white text-[#192830] focus:outline-none focus:border-[#49654d] focus:shadow-[0_0_0_3px_rgba(73,101,77,0.12)] transition" />
              </div>
              <ScheduleFields
                scheduleType={m.scheduleType} times={m.times} days={m.days} withFood={m.withFood}
                intervalHours={m.intervalHours} firstDose={m.firstDose}
                startDate={m.startDate} endDate={m.endDate} hasEndDate={m.hasEndDate}
                onScheduleTypeChange={v => updateManualItem(m.id, { scheduleType: v })}
                onTimesChange={newTimes => updateManualTimes(m.id, newTimes)}
                onToggleDay={idx => toggleManualDay(m.id, idx)}
                onToggleWithFood={() => updateManualItem(m.id, { withFood: !m.withFood })}
                onIntervalHoursChange={v => updateManualItem(m.id, { intervalHours: v })}
                onFirstDoseChange={v => updateManualItem(m.id, { firstDose: v })}
                onStartDateChange={v => updateManualItem(m.id, { startDate: v })}
                onEndDateChange={v => updateManualItem(m.id, { endDate: v })}
                onToggleHasEndDate={() => updateManualItem(m.id, { hasEndDate: !m.hasEndDate })}
              />
            </div>
          ))}
        </div>
      )}

      <button onClick={addManualItem}
        className="w-full flex items-center justify-center gap-2 min-h-[48px] py-3 rounded-lg border-2 border-dashed border-[#c3c7ca] text-base font-semibold text-[#43474a] hover:border-[#49654d] hover:text-[#49654d] transition mb-6">
        <Plus size={18} />Add medication
      </button>

      {/* OCR items */}
      <div className="space-y-4">
        {items.map((item, index) => {
          const isMatched = item.match_status === 'matched'
          const isAmbiguous = item.match_status === 'ambiguous'
          const isUnmatched = item.match_status === 'unmatched' || item.match_status === 'manual'
          const confidenceFlags = item.field_confidences as Record<string, number> | null

          return (
            <div key={item.id} className={`bg-white rounded-2xl border border-[#e9e8e4] p-6 space-y-5 transition hover:shadow-[0_8px_32px_rgba(25,40,48,0.08)] ${
              isMatched ? 'border-l-4 border-l-[#49654d]' : isAmbiguous ? 'border-l-4 border-l-[#f3896d]' : 'border-l-4 border-l-[#c3c7ca]'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-[#192830]">{item.extracted_name}</p>
                  {item.extracted_form && <p className="text-sm font-medium text-[#43474a] mt-0.5">{item.extracted_form}</p>}
                </div>
                {isMatched && <span className="shrink-0 inline-flex items-center gap-1.5 bg-[#cbebcd] text-[#49654d] text-sm font-semibold px-3 py-1 rounded-full"><CheckCircle size={14} />{pt.confirm.matchedChip}</span>}
                {isAmbiguous && <span className="shrink-0 inline-flex items-center gap-1.5 bg-[#ffdad6] text-[#93000a] text-sm font-semibold px-3 py-1 rounded-full"><AlertTriangle size={14} />{pt.confirm.reviewChip}</span>}
                {isUnmatched && <span className="shrink-0 inline-flex items-center gap-1.5 bg-[#e9e8e4] text-[#43474a] text-sm font-semibold px-3 py-1 rounded-full">{pt.confirm.unmatchedChip}</span>}
              </div>

              {isAmbiguous && item.candidates && item.candidates.length > 0 && (
                <select value={item.selectedDrugId ?? ''}
                  onChange={e => updateItem(index, { selectedDrugId: e.target.value || null })}
                  className="w-full min-h-[48px] text-base px-4 py-2.5 rounded-lg border-[1.5px] border-[#f3896d] bg-[#ffdad6]/30 text-[#192830] focus:outline-none focus:border-[#49654d] focus:shadow-[0_0_0_3px_rgba(73,101,77,0.12)] transition">
                  <option value="">{pt.confirm.drugSelectPlaceholder}</option>
                  {item.candidates.map(c => <option key={c.id} value={c.id}>{c.name}{c.strength ? ` (${c.strength})` : ''}</option>)}
                </select>
              )}

              <div>
                <label className="block text-base font-semibold text-[#192830] mb-2">
                  {pt.addMedication.doseLabel}
                  {confidenceFlags?.extracted_dosage != null && confidenceFlags.extracted_dosage < 0.8 && <span className="ml-1 text-[#f3896d]">⚠</span>}
                </label>
                <input type="text" value={item.extracted_dosage ?? ''}
                  onChange={e => updateItem(index, { extracted_dosage: e.target.value || null })}
                  className="w-full min-h-[48px] px-4 py-2.5 text-base rounded-lg border-[1.5px] border-[#d0d4d7] bg-white text-[#192830] focus:outline-none focus:border-[#49654d] focus:shadow-[0_0_0_3px_rgba(73,101,77,0.12)] transition" />
              </div>

              <ScheduleFields
                scheduleType={item._scheduleType} times={item._times} days={item._days} withFood={item._withFood}
                intervalHours={item._intervalHours} firstDose={item._firstDose}
                startDate={item._startDate} endDate={item._endDate} hasEndDate={item._hasEndDate}
                onScheduleTypeChange={v => updateItem(index, { _scheduleType: v })}
                onTimesChange={newTimes => updateItemTimes(index, newTimes)}
                onToggleDay={idx => toggleItemDay(index, idx)}
                onToggleWithFood={() => updateItem(index, { _withFood: !item._withFood })}
                onIntervalHoursChange={v => updateItem(index, { _intervalHours: v })}
                onFirstDoseChange={v => updateItem(index, { _firstDose: v })}
                onStartDateChange={v => updateItem(index, { _startDate: v })}
                onEndDateChange={v => updateItem(index, { _endDate: v })}
                onToggleHasEndDate={() => updateItem(index, { _hasEndDate: !item._hasEndDate })}
              />

              <LeafletLink drugId={item.selectedDrugId ?? item.drug_id} />
            </div>
          )
        })}
      </div>

    </div>

    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 pt-8 z-30"
      style={{ paddingBottom: 'calc(max(8px, env(safe-area-inset-bottom)) + 80px)', background: 'linear-gradient(to top, #faf9f5 60%, transparent)' }}
    >
      {error && (
        <p className="text-[#ba1a1a] text-sm font-medium text-center mb-2">{error}</p>
      )}
      <button
        onClick={handleConfirm}
        disabled={saving || (items.length === 0 && manualItems.filter(m => m.name.trim()).length === 0)}
        className="w-full min-h-[56px] flex items-center justify-center gap-2.5 bg-[#49654d] text-white text-base font-bold rounded-2xl active:scale-[0.97] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_24px_rgba(73,101,77,0.35)] border-b-[4px] border-[#2e4231] active:border-b-[1px] active:translate-y-[3px]"
      >
        {saving
          ? <><Loader2 size={18} className="animate-spin" />{pt.confirm.confirmingButton}</>
          : <><Save size={18} strokeWidth={2.2} />{pt.confirm.confirmButton}</>
        }
      </button>
    </div>
    </>
  )
}

// ── ScheduleFields ────────────────────────────────────────────────────────────

interface ScheduleFieldsProps {
  scheduleType: ScheduleType
  times: string[]
  days: number[]
  withFood: boolean
  intervalHours: number
  firstDose: string
  startDate: string
  endDate: string
  hasEndDate: boolean
  onScheduleTypeChange: (v: ScheduleType) => void
  onTimesChange: (times: string[]) => void
  onToggleDay: (idx: number) => void
  onToggleWithFood: () => void
  onIntervalHoursChange: (v: number) => void
  onFirstDoseChange: (v: string) => void
  onStartDateChange: (v: string) => void
  onEndDateChange: (v: string) => void
  onToggleHasEndDate: () => void
}

function ScheduleFields(p: ScheduleFieldsProps) {
  return (
    <div className="space-y-5">
      {/* Times */}
      <div>
        <label className="block text-base font-semibold text-[#192830] mb-3">{pt.addMedication.hoursLabel}</label>

        {/* Mode toggle */}
        <div className="flex rounded-xl border border-[#e9e8e4] overflow-hidden mb-3 w-fit">
          {(['fixed', 'interval'] as ScheduleType[]).map(mode => (
            <button key={mode} type="button" onClick={() => p.onScheduleTypeChange(mode)}
              className={`px-4 py-2 text-sm font-semibold transition ${
                p.scheduleType === mode
                  ? 'bg-[#192830] text-white'
                  : 'bg-white text-[#43474a] hover:bg-[#f4f4f0]'
              }`}>
              {mode === 'fixed' ? 'Fixed times' : 'Every N hours'}
            </button>
          ))}
        </div>

        {p.scheduleType === 'fixed' ? (
          <TimePickerField times={p.times} onChange={p.onTimesChange} />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-base text-[#43474a]">Every</span>
              <select value={p.intervalHours} onChange={e => p.onIntervalHoursChange(Number(e.target.value))}
                className="min-h-[48px] px-4 py-2 text-base font-semibold rounded-lg border-[1.5px] border-[#d0d4d7] bg-white text-[#192830] focus:outline-none focus:border-[#49654d] transition">
                {INTERVAL_OPTIONS.map(h => <option key={h} value={h}>{h}h</option>)}
              </select>
              <span className="text-base text-[#43474a]">hours</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-base text-[#43474a]">First dose</span>
              <input type="time" value={p.firstDose} onChange={e => p.onFirstDoseChange(e.target.value)}
                className="min-h-[48px] px-4 py-2 text-base font-semibold rounded-lg border-[1.5px] border-[#d0d4d7] bg-white text-[#192830] focus:outline-none focus:border-[#49654d] transition" />
            </div>
            {/* Preview */}
            <p className="text-sm text-[#73787b]">
              Times: {intervalToTimes(p.intervalHours, p.firstDose).join(', ')}
            </p>
          </div>
        )}
      </div>

      {/* Days */}
      <div>
        <label className="block text-base font-semibold text-[#192830] mb-3">{pt.addMedication.daysLabel}</label>
        <div className="flex gap-1.5">
          {DAYS.map(d => {
            const idx = DAY_INDICES[d]
            const active = p.days.includes(idx)
            return (
              <button key={d} type="button" onClick={() => p.onToggleDay(idx)}
                className={`flex-1 py-3 text-sm font-semibold rounded-lg border-[1.5px] transition min-h-[48px] ${
                  active ? 'bg-[#192830] text-white border-[#192830]' : 'bg-white text-[#43474a] border-[#c3c7ca] hover:bg-[#f4f4f0]'
                }`}>{pt.addMedication.days[d]}</button>
            )
          })}
        </div>
      </div>

      {/* Take with food */}
      <div className="flex items-center justify-between py-4 border-t border-[#e9e8e4]">
        <span className="text-base font-semibold text-[#192830]">{pt.addMedication.withFoodLabel}</span>
        <button type="button" onClick={p.onToggleWithFood}
          className={`relative w-12 h-7 rounded-full transition ${p.withFood ? 'bg-[#49654d]' : 'bg-[#c3c7ca]'}`}>
          <span className={`absolute top-1 left-0 w-5 h-5 bg-white rounded-full shadow transition-transform ${p.withFood ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Duration */}
      <div className="space-y-3 pt-1">
        <div>
          <label className="block text-base font-semibold text-[#192830] mb-2">Start date</label>
          <input type="date" value={p.startDate} onChange={e => p.onStartDateChange(e.target.value)}
            className="w-full min-h-[48px] px-4 py-2.5 text-base rounded-lg border-[1.5px] border-[#d0d4d7] bg-white text-[#192830] focus:outline-none focus:border-[#49654d] focus:shadow-[0_0_0_3px_rgba(73,101,77,0.12)] transition" />
        </div>

        <div className="flex items-center justify-between py-4 border-t border-b border-[#e9e8e4]">
          <div>
            <span className="text-base font-semibold text-[#192830]">Ongoing</span>
            <p className="text-sm text-[#73787b]">No fixed end date</p>
          </div>
          <button type="button" onClick={p.onToggleHasEndDate}
            className={`relative w-12 h-7 rounded-full transition ${!p.hasEndDate ? 'bg-[#49654d]' : 'bg-[#c3c7ca]'}`}>
            <span className={`absolute top-1 left-0 w-5 h-5 bg-white rounded-full shadow transition-transform ${!p.hasEndDate ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {p.hasEndDate && (
          <div>
            <label className="block text-base font-semibold text-[#192830] mb-2">End date</label>
            <input type="date" value={p.endDate} min={p.startDate} onChange={e => p.onEndDateChange(e.target.value)}
              className="w-full min-h-[48px] px-4 py-2.5 text-base rounded-lg border-[1.5px] border-[#d0d4d7] bg-white text-[#192830] focus:outline-none focus:border-[#49654d] focus:shadow-[0_0_0_3px_rgba(73,101,77,0.12)] transition" />
          </div>
        )}
      </div>
    </div>
  )
}

function LeafletLink({ drugId }: { drugId: string | null }) {
  const [leafletUrl, setLeafletUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!drugId) return
    supabase.from('drugs').select('leaflet_url').eq('id', drugId).single()
      .then(({ data }) => setLeafletUrl(data?.leaflet_url ?? null))
  }, [drugId])
  if (!leafletUrl) return null
  return (
    <a href={leafletUrl} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-base font-semibold text-[#49654d] hover:opacity-75 transition">
      <ExternalLink size={16} />{pt.confirm.leafletLink}
    </a>
  )
}
