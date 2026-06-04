import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Check, ChevronRight, CalendarDays, StickyNote, Pill, Sun, Moon, Clock3 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'
import type { UserMedication, IntakeEvent } from '../types/database'

interface TodayMedication extends UserMedication {
  taken_today?: boolean
  next_time?: string
  scheduled_time?: string  // time of the event (pending or taken)
  notes?: string | null
}

function getMedIcon(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes('vitamin') || lower.includes('vitamina')) return <Sun size={18} className="text-[#f59e0b]" />
  if (lower.includes('night') || lower.includes('noite') || lower.includes('sleep')) return <Moon size={18} className="text-[#6366f1]" />
  return <Pill size={18} className="text-[#49654d]" />
}

function getMedIconBg(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes('vitamin') || lower.includes('vitamina')) return 'bg-[#fef3c7]'
  if (lower.includes('night') || lower.includes('noite') || lower.includes('sleep')) return 'bg-[#ede9fe]'
  return 'bg-[#d1fae5]'
}

export function HomePage() {
  const { user } = useAuth()
  const [medications, setMedications] = useState<TodayMedication[]>([])
  const [takenCount, setTakenCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadTodayMedications()
  }, [user])

  async function loadTodayMedications() {
    const today = new Date().toISOString().split('T')[0]

    const { data: meds } = await supabase
      .from('user_medications')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_active', true)

    const { data: events } = await supabase
      .from('intake_events')
      .select('*')
      .gte('scheduled_at', `${today}T00:00:00`)
      .lte('scheduled_at', `${today}T23:59:59`)

    if (meds) {
      const allEvents = (events ?? []) as IntakeEvent[]
      const takenEvents = allEvents.filter(e => e.status === 'taken')
      const takenIds = new Set(takenEvents.map(e => e.user_medication_id))
      const pending = allEvents.filter(e => e.status === 'pending')

      setTakenCount(takenIds.size)
      setTotalCount(meds.length)

      setMedications(
        meds.map(m => {
          const pendingEvent = pending.find(e => e.user_medication_id === m.id)
          const takenEvent = takenEvents.find(e => e.user_medication_id === m.id)
          return {
            ...m,
            taken_today: takenIds.has(m.id),
            next_time: pendingEvent?.scheduled_at,
            scheduled_time: (pendingEvent ?? takenEvent)?.scheduled_at,
          }
        })
      )
    }

    setLoading(false)
  }

  async function handleToggleTaken(med: TodayMedication) {
    if (med.taken_today) return
    const now = new Date().toISOString()
    const { data: schedules } = await supabase
      .from('schedules')
      .select('id')
      .eq('user_medication_id', med.id)
      .limit(1)
    const scheduleId = schedules?.[0]?.id
    if (!scheduleId) return
    await supabase.from('intake_events').insert({
      user_medication_id: med.id,
      schedule_id: scheduleId,
      scheduled_at: med.next_time ?? now,
      status: 'taken',
      responded_at: now,
    })
    loadTodayMedications()
  }

  const pending = medications.filter(m => !m.taken_today)
  const taken = medications.filter(m => m.taken_today)

  return (
    <div className="px-5 py-4 flex flex-col gap-5 pb-8">

      {/* Medications to take */}
      {!loading && medications.length === 0 ? (
        <div className="text-center py-14 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#efeeea] flex items-center justify-center">
            <Pill size={28} className="text-[#43474a]" />
          </div>
          <p className="text-base text-[#43474a]">{pt.home.noMedications}</p>
          <Link
            to="/medications/add"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#192830] text-white text-sm font-semibold rounded-xl min-h-[48px] hover:opacity-[0.88] transition"
          >
            <Plus size={18} />
            {pt.home.addManual}
          </Link>
        </div>
      ) : (
        <>
          {/* Pending medications */}
          {(loading || pending.length > 0) && (
            <section>
              <h2 className="text-base font-semibold text-[#43474a] mb-3">Medications to take</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-[#e9e8e4] overflow-hidden divide-y divide-[#f4f3f0]">
                {loading ? (
                  [0, 1, 2].map(i => (
                    <div key={i} className="px-4 py-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#efeeea] animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 bg-[#efeeea] rounded animate-pulse w-32" />
                        <div className="h-3 bg-[#efeeea] rounded animate-pulse w-20" />
                      </div>
                      <div className="w-6 h-6 rounded-full bg-[#efeeea] animate-pulse" />
                    </div>
                  ))
                ) : (
                  pending.map(med => (
                    <div key={med.id} className="px-4 py-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${getMedIconBg(med.display_name)} flex items-center justify-center shrink-0`}>
                        {getMedIcon(med.display_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#192830] truncate">{med.display_name}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                          {med.scheduled_time && (
                            <span className="flex items-center gap-1 text-xs text-[#192830] font-medium">
                              <Clock3 size={11} className="text-[#49654d]" />
                              {new Date(med.scheduled_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {med.dosage && (
                            <span className="text-xs text-[#43474a] bg-[#f4f3f0] px-1.5 py-0.5 rounded-md">
                              {med.dosage}
                            </span>
                          )}
                          {med.notes && (
                            <span className="text-xs text-[#43474a] truncate max-w-[120px]">{med.notes}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleTaken(med)}
                        className="w-7 h-7 rounded-full border-2 border-[#c3c7ca] flex items-center justify-center shrink-0 hover:border-[#49654d] transition-colors active:scale-95"
                        aria-label="Mark as taken"
                      />
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* Taken medications */}
          {taken.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-[#43474a] mb-3">Taken</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-[#e9e8e4] overflow-hidden divide-y divide-[#f4f3f0]">
                {taken.map(med => (
                  <div key={med.id} className="px-4 py-4 flex items-center gap-3 opacity-60">
                    <div className={`w-10 h-10 rounded-full ${getMedIconBg(med.display_name)} flex items-center justify-center shrink-0`}>
                      {getMedIcon(med.display_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#192830] truncate line-through">{med.display_name}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                        <span className="text-xs text-[#49654d] font-medium">Taken</span>
                        {med.scheduled_time && (
                          <span className="flex items-center gap-1 text-xs text-[#43474a]">
                            <Clock3 size={11} />
                            {new Date(med.scheduled_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {med.dosage && (
                          <span className="text-xs text-[#43474a] bg-[#f4f3f0] px-1.5 py-0.5 rounded-md line-through">
                            {med.dosage}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[#d1fae5] border-2 border-[#49654d] flex items-center justify-center shrink-0">
                      <Check size={14} className="text-[#49654d]" strokeWidth={2.5} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Progress summary row */}
      {!loading && medications.length > 0 && (
        <div className="flex gap-3">
          <div className="flex-1 bg-white rounded-2xl border border-[#e9e8e4] px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#d1fae5] flex items-center justify-center shrink-0">
              <Check size={16} className="text-[#49654d]" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs text-[#43474a]">Taken</p>
              <p className="text-lg font-bold text-[#192830] leading-tight">{takenCount}</p>
            </div>
          </div>
          <div className="flex-1 bg-white rounded-2xl border border-[#e9e8e4] px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#fef3c7] flex items-center justify-center shrink-0">
              <Clock3 size={16} className="text-[#d97706]" strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs text-[#43474a]">Remaining</p>
              <p className="text-lg font-bold text-[#192830] leading-tight">{totalCount - takenCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Appointments card */}
      <section>
        <div className="bg-white rounded-2xl border border-[#e9e8e4] shadow-sm px-4 py-4 flex items-center gap-3 cursor-pointer hover:bg-[#faf9f5] transition-colors active:scale-[0.99]">
          <div className="w-10 h-10 rounded-xl bg-[#dbeafe] flex items-center justify-center shrink-0">
            <CalendarDays size={20} className="text-[#2563eb]" strokeWidth={1.8} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#192830]">Appointments</p>
            <p className="text-xs text-[#43474a] mt-0.5">No upcoming appointments</p>
          </div>
          <ChevronRight size={18} className="text-[#c3c7ca]" />
        </div>
      </section>

      {/* Notes card */}
      <section>
        <div className="bg-white rounded-2xl border border-[#e9e8e4] shadow-sm px-4 py-4 flex items-center gap-3 cursor-pointer hover:bg-[#faf9f5] transition-colors active:scale-[0.99]">
          <div className="w-10 h-10 rounded-xl bg-[#fef9c3] flex items-center justify-center shrink-0">
            <StickyNote size={20} className="text-[#ca8a04]" strokeWidth={1.8} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#192830]">Notes</p>
            <p className="text-xs text-[#43474a] mt-0.5">Add a note</p>
          </div>
          <ChevronRight size={18} className="text-[#c3c7ca]" />
        </div>
      </section>

    </div>
  )
}
