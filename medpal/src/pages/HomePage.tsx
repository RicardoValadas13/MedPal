import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Clock, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'
import type { UserMedication, IntakeEvent } from '../types/database'

interface TodayMedication extends UserMedication {
  taken_today?: boolean
  next_time?: string
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
      const takenIds = new Set(allEvents.filter(e => e.status === 'taken').map(e => e.user_medication_id))
      const pending = allEvents.filter(e => e.status === 'pending')

      setTakenCount(takenIds.size)
      setTotalCount(meds.length)

      setMedications(
        meds.map(m => ({
          ...m,
          taken_today: takenIds.has(m.id),
          next_time: pending.find(e => e.user_medication_id === m.id)?.scheduled_at,
        }))
      )
    }

    setLoading(false)
  }

  const progressPct = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0
  const circumference = 2 * Math.PI * 40
  const strokeOffset = circumference - (progressPct / 100) * circumference

  const nextMed = medications.find(m => !m.taken_today)

  return (
    <div className="px-5 py-md flex flex-col gap-md">

      {/* Tip card */}
      <section className="bg-[#ffffff] rounded-2xl p-sm border border-[#c3c7ca]/30 flex items-start gap-sm">
        <div className="w-10 h-10 rounded-full bg-[#cbebcd] flex items-center justify-center shrink-0">
          <span className="text-lg">💧</span>
        </div>
        <div>
          <p className="text-label-lg font-semibold text-[#192830] leading-tight">Stay Hydrated</p>
          <p className="text-caption text-[#43474a] mt-0.5">Drink a glass of water with your morning medications.</p>
        </div>
      </section>

      {/* Progress bento */}
      <section className="grid grid-cols-2 gap-sm">
        {/* Circular progress */}
        <div className="bg-[#ffffff] rounded-2xl p-md border border-[#c3c7ca]/30 flex flex-col items-center justify-center text-center">
          {loading ? (
            <div className="w-24 h-24 bg-[#efeeea] rounded-full animate-pulse" />
          ) : (
            <div className="relative w-24 h-24 mb-sm">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  className="stroke-[#e9e8e4]"
                  cx="50" cy="50" r="40"
                  fill="transparent" strokeWidth="8"
                />
                <circle
                  className="stroke-[#49654d] progress-ring__circle"
                  cx="50" cy="50" r="40"
                  fill="transparent" strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-headline-mobile font-bold text-[#192830]">
                  {takenCount}/{totalCount}
                </span>
              </div>
            </div>
          )}
          <span className="text-caption text-[#43474a]">Daily Doses</span>
        </div>

        {/* Completed + Upcoming */}
        <div className="flex flex-col gap-sm">
          <div className="bg-[#ffffff] rounded-2xl p-sm border border-[#c3c7ca]/30 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-xs mb-1">
              <Check size={18} className="text-[#49654d]" />
              <span className="text-caption text-[#43474a]">Completed</span>
            </div>
            <span className="text-body-xl font-semibold text-[#192830]">{takenCount}</span>
          </div>
          <div className="bg-[#ffffff] rounded-2xl p-sm border border-[#c3c7ca]/30 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-xs mb-1">
              <Clock size={18} className="text-[#f3896d]" />
              <span className="text-caption text-[#43474a]">Upcoming</span>
            </div>
            <span className="text-body-xl font-semibold text-[#192830]">{totalCount - takenCount}</span>
          </div>
        </div>
      </section>

      {/* Next dose featured card */}
      {nextMed && (
        <section className="flex flex-col gap-sm">
          <h2 className="text-headline-mobile font-semibold text-[#192830]">Next Dose</h2>
          <div className="bg-[#ffffff] rounded-3xl p-md shadow-[0_8px_30px_rgba(47,62,70,0.08)] border-l-4 border-l-[#192830] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#d5e5ef]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            <div className="flex justify-between items-start mb-md relative z-10">
              <div>
                {nextMed.next_time && (
                  <div className="flex items-center gap-xs mb-xs">
                    <Clock size={16} className="text-[#192830]" />
                    <span className="text-caption text-[#43474a]">
                      {new Date(nextMed.next_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <h3 className="text-headline-mobile font-semibold text-[#192830] mb-xs">{nextMed.display_name}</h3>
                {nextMed.dosage && (
                  <div className="inline-flex items-center px-2 py-1 rounded-lg bg-[#efeeea] text-[#43474a] text-caption">
                    {nextMed.dosage}
                  </div>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#efeeea] flex items-center justify-center shrink-0">
                <span className="text-2xl">💊</span>
              </div>
            </div>
            <div className="flex gap-sm relative z-10">
              <button className="flex-1 min-h-[48px] bg-[#192830] text-white rounded-xl text-label-lg font-semibold flex items-center justify-center gap-xs hover:opacity-[0.88] transition">
                <Check size={18} />
                Take Now
              </button>
              <button className="flex-1 min-h-[48px] bg-[#efeeea] text-[#192830] rounded-xl text-label-lg font-semibold flex items-center justify-center gap-xs hover:bg-[#e9e8e4] transition">
                Snooze
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Completed today */}
      {medications.some(m => m.taken_today) && (
        <section className="flex flex-col gap-sm">
          <h2 className="text-headline-mobile font-semibold text-[#192830]">Completed Today</h2>
          <div className="bg-[#ffffff] rounded-2xl border border-[#c3c7ca]/30 overflow-hidden divide-y divide-[#efeeea]">
            {medications.filter(m => m.taken_today).map(med => (
              <div key={med.id} className="px-sm py-sm flex items-center gap-sm">
                <div className="w-10 h-10 rounded-full bg-[#cbebcd] flex items-center justify-center shrink-0">
                  <Check size={18} className="text-[#4f6b53]" />
                </div>
                <div className="flex-1">
                  <p className="text-label-lg font-semibold text-[#192830] line-through opacity-70">{med.display_name}</p>
                  {med.dosage && <p className="text-caption text-[#43474a]">{med.dosage}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!loading && medications.length === 0 && (
        <div className="text-center py-12">
          <p className="text-body-md text-[#43474a] mb-6">{pt.home.noMedications}</p>
          <Link
            to="/medications/add"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#192830] text-white text-label-lg font-semibold rounded-lg min-h-[48px] hover:opacity-[0.88] transition"
          >
            <Plus size={18} />
            {pt.home.addManual}
          </Link>
        </div>
      )}
    </div>
  )
}
