import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Calendar, Download, Pill, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { UserMedication, Schedule, IntakeEvent } from '../types/database'

interface MedAdherence {
  med: UserMedication
  schedules: Schedule[]
  takenCount: number
  expectedCount: number
  pct: number
}

interface WeekBar {
  label: string
  taken: number
  expected: number
  pct: number
}

function subDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - n)
  return d
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function adherenceColor(pct: number) {
  if (pct >= 80) return 'bg-[#49654d]'
  if (pct >= 50) return 'bg-[#d97706]'
  return 'bg-[#ba1a1a]'
}

function adherenceTextColor(pct: number) {
  if (pct >= 80) return 'text-[#49654d]'
  if (pct >= 50) return 'text-[#d97706]'
  return 'text-[#ba1a1a]'
}

export function AnalyticsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [medAdherence, setMedAdherence] = useState<MedAdherence[]>([])
  const [weekBars, setWeekBars] = useState<WeekBar[]>([])
  const [streak, setStreak] = useState(0)
  const [overallPct, setOverallPct] = useState(0)
  const [totalTaken, setTotalTaken] = useState(0)
  const [totalExpected, setTotalExpected] = useState(0)
  const [printDate] = useState(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }))

  useEffect(() => {
    if (!user) return
    loadAnalytics()
  }, [user])

  async function loadAnalytics() {
    const today = startOfDay(new Date())
    const from = subDays(today, 27)

    const { data: meds } = await supabase
      .from('user_medications')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_active', true)

    if (!meds || meds.length === 0) {
      setLoading(false)
      return
    }

    const medIds = meds.map((m: UserMedication) => m.id)

    const { data: schedulesRaw } = await supabase
      .from('schedules')
      .select('*')
      .in('user_medication_id', medIds)

    const { data: eventsRaw } = await supabase
      .from('intake_events')
      .select('*')
      .in('user_medication_id', medIds)
      .gte('scheduled_at', from.toISOString())
      .lt('scheduled_at', new Date().toISOString())

    const allSchedules: Schedule[] = schedulesRaw ?? []
    const allEvents: IntakeEvent[] = eventsRaw ?? []

    const adherence: MedAdherence[] = meds.map((med: UserMedication) => {
      const medSchedules = allSchedules.filter(s => s.user_medication_id === med.id)
      const medEvents = allEvents.filter(e => e.user_medication_id === med.id)

      let expectedCount = 0
      let takenCount = 0

      for (let i = 0; i < 28; i++) {
        const day = subDays(from, -i)
        if (day > today) break
        const dayOfWeek = day.getDay()
        const dayStr = isoDate(day)

        for (const sched of medSchedules) {
          const applies = sched.days_of_week.length === 0 || sched.days_of_week.includes(dayOfWeek)
          if (!applies) continue

          const medStart = med.start_date ? startOfDay(new Date(med.start_date)) : null
          const medEnd = med.end_date ? startOfDay(new Date(med.end_date)) : null
          if (medStart && day < medStart) continue
          if (medEnd && day > medEnd) continue

          expectedCount++

          const taken = medEvents.some(
            e => e.schedule_id === sched.id && e.scheduled_at.slice(0, 10) === dayStr && e.status === 'taken'
          )
          if (taken) takenCount++
        }
      }

      const pct = expectedCount > 0 ? Math.round((takenCount / expectedCount) * 100) : 0
      return { med, schedules: medSchedules, takenCount, expectedCount, pct }
    })

    setMedAdherence(adherence)

    const sumExpected = adherence.reduce((s, a) => s + a.expectedCount, 0)
    const sumTaken = adherence.reduce((s, a) => s + a.takenCount, 0)
    setTotalExpected(sumExpected)
    setTotalTaken(sumTaken)
    setOverallPct(sumExpected > 0 ? Math.round((sumTaken / sumExpected) * 100) : 0)

    const bars: WeekBar[] = []
    for (let w = 0; w < 4; w++) {
      const weekStart = subDays(from, -(w * 7))
      let weekExpected = 0
      let weekTaken = 0

      for (let d = 0; d < 7; d++) {
        const day = subDays(weekStart, -d)
        if (day > today) break
        const dayOfWeek = day.getDay()
        const dayStr = isoDate(day)

        for (const sched of allSchedules) {
          const applies = sched.days_of_week.length === 0 || sched.days_of_week.includes(dayOfWeek)
          if (!applies) continue

          const med = meds.find((m: UserMedication) => m.id === sched.user_medication_id)
          if (!med) continue
          const medStart = med.start_date ? startOfDay(new Date(med.start_date)) : null
          const medEnd = med.end_date ? startOfDay(new Date(med.end_date)) : null
          if (medStart && day < medStart) continue
          if (medEnd && day > medEnd) continue

          weekExpected++

          const taken = allEvents.some(
            e => e.schedule_id === sched.id && e.scheduled_at.slice(0, 10) === dayStr && e.status === 'taken'
          )
          if (taken) weekTaken++
        }
      }

      bars.push({
        label: `Wk ${w + 1}`,
        taken: weekTaken,
        expected: weekExpected,
        pct: weekExpected > 0 ? Math.round((weekTaken / weekExpected) * 100) : 0,
      })
    }
    setWeekBars(bars)

    let streakCount = 0
    for (let i = 1; i <= 365; i++) {
      const day = subDays(today, i)
      const dayOfWeek = day.getDay()
      const dayStr = isoDate(day)

      let expectedForDay = 0
      let takenForDay = 0

      for (const sched of allSchedules) {
        const applies = sched.days_of_week.length === 0 || sched.days_of_week.includes(dayOfWeek)
        if (!applies) continue

        const med = meds.find((m: UserMedication) => m.id === sched.user_medication_id)
        if (!med) continue
        const medStart = med.start_date ? startOfDay(new Date(med.start_date)) : null
        const medEnd = med.end_date ? startOfDay(new Date(med.end_date)) : null
        if (medStart && day < medStart) continue
        if (medEnd && day > medEnd) continue

        expectedForDay++

        const taken = allEvents.some(
          e => e.schedule_id === sched.id && e.scheduled_at.slice(0, 10) === dayStr && e.status === 'taken'
        )
        if (taken) takenForDay++
      }

      if (expectedForDay === 0) continue

      if (takenForDay === expectedForDay) {
        streakCount++
      } else {
        break
      }
    }
    setStreak(streakCount)

    setLoading(false)
  }

  return (
    <>
      <style>{`
        @media print {
          .analytics-no-print { display: none !important; }
          .analytics-print-header { display: block !important; }
          body { background: white !important; }
        }
      `}</style>

      <div
        className="px-5 py-md flex flex-col gap-md"
        style={{ paddingBottom: 'max(140px, calc(100px + env(safe-area-inset-bottom)))' }}
      >
        {/* Nav header */}
        <div className="flex items-center gap-3 analytics-no-print">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#efeeea] transition text-[#192830] active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h2 className="text-display-lg font-bold tracking-[-0.02em] text-[#192830]">Analytics</h2>
            <p className="text-body-md text-[#43474a] mt-0.5">Last 28 days · adherence overview</p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#efeeea] transition text-[#192830] active:scale-95"
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl bg-[#192830] text-white text-sm font-semibold active:scale-95 transition-transform shrink-0"
          >
            <Download size={16} />
            PDF
          </button>
        </div>

        {/* Print-only header */}
        <div className="analytics-print-header hidden">
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>MedPal — Medication Report</h1>
          <p style={{ color: '#43474a', fontSize: 14 }}>Generated on {printDate} · Last 28 days</p>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-[#efeeea] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : totalExpected === 0 ? (
          <div className="text-center py-16">
            <TrendingUp size={48} className="text-[#c3c7ca] mx-auto mb-4" />
            <p className="text-body-md text-[#43474a]">No dose data yet.</p>
            <p className="text-sm text-[#73787b] mt-1">Start tracking doses on the home screen.</p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border border-[#e9e8e4] shadow-sm px-4 py-4 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#43474a] uppercase tracking-wider">
                  <TrendingUp size={12} className="text-[#49654d]" />
                  Adherence
                </div>
                <p className={`text-4xl font-bold mt-1 ${adherenceTextColor(overallPct)}`}>{overallPct}%</p>
                <p className="text-xs text-[#73787b]">{totalTaken} of {totalExpected} doses</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#e9e8e4] shadow-sm px-4 py-4 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#43474a] uppercase tracking-wider">
                  <Calendar size={12} className="text-[#49654d]" />
                  Streak
                </div>
                <p className="text-4xl font-bold mt-1 text-[#192830]">{streak}</p>
                <p className="text-xs text-[#73787b]">{streak === 1 ? 'day' : 'days'} in a row</p>
              </div>
            </div>

            {/* Weekly bar chart */}
            <section className="bg-white rounded-2xl border border-[#e9e8e4] shadow-sm px-4 py-4 flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-[#192830]">Weekly Adherence</h3>
              <div className="flex items-end gap-3" style={{ height: 96 }}>
                {weekBars.map((bar, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                    <span className={`text-xs font-semibold ${adherenceTextColor(bar.pct)}`}>{bar.pct}%</span>
                    <div className="w-full bg-[#f4f3f0] rounded-lg overflow-hidden" style={{ height: 56 }}>
                      <div
                        className={`w-full rounded-lg transition-all ${adherenceColor(bar.pct)}`}
                        style={{ height: `${Math.max(bar.pct, bar.expected > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#73787b]">{bar.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 flex-wrap text-xs text-[#43474a]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#49654d] inline-block" />
                  ≥80% Good
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#d97706] inline-block" />
                  50–79% Fair
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#ba1a1a] inline-block" />
                  &lt;50% Low
                </span>
              </div>
            </section>

            {/* Per-medication breakdown */}
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-[#192830] flex items-center gap-1.5">
                <Pill size={14} className="text-[#49654d]" />
                By Medication
              </h3>
              {medAdherence.map(({ med, takenCount, expectedCount, pct }) => (
                <div
                  key={med.id}
                  className="bg-white rounded-2xl border border-[#e9e8e4] shadow-sm px-4 py-3.5 flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#192830] leading-snug">{med.display_name}</p>
                      {med.dosage && <p className="text-xs text-[#73787b]">{med.dosage}</p>}
                    </div>
                    <span className={`text-base font-bold shrink-0 ${adherenceTextColor(pct)}`}>{pct}%</span>
                  </div>
                  <div className="h-2 bg-[#f4f3f0] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${adherenceColor(pct)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#73787b]">{takenCount} of {expectedCount} doses taken in 28 days</p>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </>
  )
}
