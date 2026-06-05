import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Check, Pill, Sun, Sunrise, Sunset, Pencil, Bell, X, Download, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { usePWAInstall } from '../hooks/usePWAInstall'
import { pt } from '../i18n/pt'
import type { UserMedication, Schedule, IntakeEvent } from '../types/database'

interface ScheduledDose {
  med: UserMedication
  schedule: Schedule
  scheduledAt: Date
  taken: boolean
  intakeEventId?: string
}

type TimeGroup = 'morning' | 'afternoon' | 'evening'

function getTimeGroup(date: Date): TimeGroup {
  const h = date.getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

function buildScheduledAt(timeOfDay: string): Date {
  const [hh, mm, ss] = timeOfDay.split(':').map(Number)
  const d = new Date()
  d.setHours(hh, mm, ss ?? 0, 0)
  return d
}

function getDiffMin(scheduledAt: Date, now: Date) {
  return Math.round((scheduledAt.getTime() - now.getTime()) / 60000)
}

function timeLabel(scheduledAt: Date) {
  return scheduledAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const GROUP_META: Record<TimeGroup, { label: string; Icon: React.FC<{ size: number; className: string }>; iconBg: string; iconColor: string }> = {
  morning:   { label: 'Morning',   Icon: Sunrise, iconBg: 'bg-[#fef3c7]', iconColor: 'text-[#d97706]' },
  afternoon: { label: 'Afternoon', Icon: Sun,     iconBg: 'bg-[#dbeafe]', iconColor: 'text-[#2563eb]' },
  evening:   { label: 'Evening',   Icon: Sunset,  iconBg: 'bg-[#ede9fe]', iconColor: 'text-[#7c3aed]' },
}

function getMedIconBg(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes('vitamin') || lower.includes('vitamina')) return 'bg-[#fef3c7]'
  if (lower.includes('night') || lower.includes('noite') || lower.includes('sleep')) return 'bg-[#ede9fe]'
  return 'bg-[#cbebcd]'
}

function getMedIconColor(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes('vitamin') || lower.includes('vitamina')) return 'text-[#d97706]'
  if (lower.includes('night') || lower.includes('noite') || lower.includes('sleep')) return 'text-[#7c3aed]'
  return 'text-[#49654d]'
}

function SkeletonRow() {
  return (
    <div className="px-4 py-3.5 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#efeeea] animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-[#efeeea] rounded animate-pulse w-40" />
        <div className="h-3 bg-[#efeeea] rounded animate-pulse w-24" />
      </div>
      <div className="w-8 h-8 rounded-full bg-[#efeeea] animate-pulse" />
    </div>
  )
}

interface DoseRowProps {
  dose: ScheduledDose
  now: Date
  marking: string | null
  onMark: (dose: ScheduledDose) => void
  dimmed?: boolean
}

function DoseRow({ dose, now, marking, onMark, dimmed }: DoseRowProps) {
  const diffMin = getDiffMin(dose.scheduledAt, now)
  const isOverdue = diffMin < -1
  const isSoon = diffMin >= -1 && diffMin <= 30
  const isFuture = diffMin > 30

  const timeColor = isOverdue
    ? 'text-[#ba1a1a]'
    : isSoon
    ? 'text-[#d97706]'
    : 'text-[#8a8f93]'

  const fmtDuration = (mins: number) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h === 0) return `${m}min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}min`
  }

  const timeSuffix = isOverdue
    ? ` · ${fmtDuration(Math.abs(diffMin))} ago`
    : diffMin === 0
    ? ' · now'
    : isSoon
    ? ` · in ${fmtDuration(diffMin)}`
    : ''

  return (
    <div className={`px-4 py-3.5 flex items-start gap-3 transition-opacity ${dimmed ? 'opacity-45' : ''}`}>
      <div className={`w-10 h-10 rounded-full ${getMedIconBg(dose.med.display_name)} flex items-center justify-center shrink-0 mt-0.5`}>
        <Pill size={18} className={getMedIconColor(dose.med.display_name)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-snug ${dimmed ? 'line-through text-[#192830]' : 'text-[#192830]'}`}>
          {dose.med.display_name}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {dimmed ? (
            <span className="text-xs text-[#49654d] font-medium">Taken · {timeLabel(dose.scheduledAt)}</span>
          ) : (
            <span className={`text-xs font-medium ${timeColor}`}>
              {timeLabel(dose.scheduledAt)}{timeSuffix}
            </span>
          )}
          {dose.med.dosage && (
            <span className={`text-xs text-[#43474a] bg-[#f4f3f0] px-1.5 py-0.5 rounded-md ${dimmed ? 'line-through' : ''}`}>
              {dose.med.dosage}
            </span>
          )}
        </div>
      </div>
      {dimmed ? (
        <div className="w-7 h-7 rounded-full bg-[#cbebcd] border-2 border-[#49654d] flex items-center justify-center shrink-0 mt-1.5">
          <Check size={14} className="text-[#49654d]" strokeWidth={2.5} />
        </div>
      ) : isOverdue ? (
        <button
          onClick={() => onMark(dose)}
          disabled={!!marking}
          className="shrink-0 min-h-[44px] px-3 py-2 rounded-xl bg-[#192830] text-white text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
          aria-label="Mark as taken"
        >
          {marking === dose.schedule.id ? <Check size={14} className="text-white" strokeWidth={2.5} /> : 'Take'}
        </button>
      ) : (
        <button
          onClick={() => onMark(dose)}
          disabled={!!marking}
          className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-[#f4f3f0] active:scale-95 transition-all -mr-2 shrink-0"
          aria-label="Mark as taken"
        >
          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
            marking === dose.schedule.id
              ? 'border-[#49654d] bg-[#cbebcd]'
              : isFuture
              ? 'border-[#dde0e3]'
              : 'border-[#f5c97a] hover:border-[#d97706]'
          }`}>
            {marking === dose.schedule.id && <Check size={14} className="text-[#49654d]" strokeWidth={2.5} />}
          </div>
        </button>
      )}
    </div>
  )
}

export function HomePage() {
  const { user } = useAuth()
  const [doses, setDoses] = useState<ScheduledDose[]>([])
  const [unscheduledMeds, setUnscheduledMeds] = useState<UserMedication[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState<string | null>(null)
  const [dismissedNotifBanner, setDismissedNotifBanner] = useState(false)
  const [dismissedInstallBanner, setDismissedInstallBanner] = useState(
    () => localStorage.getItem('pwa-install-dismissed') === '1'
  )
  const { state: notifState, subscribe: subscribePush } = usePushNotifications()
  const { state: installState, install } = usePWAInstall()

  function dismissInstallBanner() {
    localStorage.setItem('pwa-install-dismissed', '1')
    setDismissedInstallBanner(true)
  }

  useEffect(() => {
    if (!user) return
    loadTodayMedications()
  }, [user])

  async function loadTodayMedications() {
    const now = new Date()
    const todayDow = now.getDay()

    // Use local midnight so timezone offsets (e.g. UTC+1) don't push
    // doses from 00:xx into yesterday's UTC range
    const localMidnight = new Date(now)
    localMidnight.setHours(0, 0, 0, 0)
    const localEndOfDay = new Date(now)
    localEndOfDay.setHours(23, 59, 59, 999)

    const [{ data: meds }, { data: scheduleRows }, { data: events }] = await Promise.all([
      supabase.from('user_medications').select('*').eq('user_id', user!.id).eq('is_active', true),
      supabase.from('schedules').select('*'),
      supabase.from('intake_events').select('*')
        .gte('scheduled_at', localMidnight.toISOString())
        .lte('scheduled_at', localEndOfDay.toISOString()),
    ])

    if (!meds) { setLoading(false); return }

    const allSchedules = (scheduleRows ?? []) as Schedule[]
    const allEvents = (events ?? []) as IntakeEvent[]
    const medMap = new Map(meds.map(m => [m.id, m]))
    const scheduledMedIds = new Set(allSchedules.map(s => s.user_medication_id))

    const todayDoses: ScheduledDose[] = []
    for (const sch of allSchedules) {
      const med = medMap.get(sch.user_medication_id)
      if (!med || !med.is_active) continue
      if (sch.days_of_week.length > 0 && !sch.days_of_week.includes(todayDow)) continue

      const scheduledAt = buildScheduledAt(sch.time_of_day)

      // If the medication was added today and this dose time has already passed,
      // the user never had a chance to take it — don't count it as overdue.
      const startedToday =
        med.start_date &&
        new Date(med.start_date + 'T00:00:00').toDateString() === now.toDateString()
      if (startedToday && scheduledAt < now) continue

      const takenEvent = allEvents.find(e => e.schedule_id === sch.id && e.status === 'taken')
      todayDoses.push({ med, schedule: sch, scheduledAt, taken: !!takenEvent, intakeEventId: takenEvent?.id })
    }

    todayDoses.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())

    setDoses(todayDoses)
    setUnscheduledMeds(meds.filter(m => !scheduledMedIds.has(m.id)))
    setLoading(false)
  }

  async function handleMarkTaken(dose: ScheduledDose) {
    if (dose.taken || marking) return
    setMarking(dose.schedule.id)
    const respondedAt = new Date().toISOString()
    const { error } = await supabase.from('intake_events').insert({
      user_medication_id: dose.med.id,
      schedule_id: dose.schedule.id,
      scheduled_at: dose.scheduledAt.toISOString(),
      status: 'taken',
      responded_at: respondedAt,
    })
    if (error) {
      console.error('Mark taken failed:', error)
      setMarking(null)
      return
    }
    await loadTodayMedications()
    setMarking(null)
  }

  const now = new Date()
  const pending = doses.filter(d => !d.taken)
  const taken = doses.filter(d => d.taken)
  const takenCount = taken.length
  const totalCount = doses.length
  const progress = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0
  const allDone = !loading && totalCount > 0 && takenCount === totalCount

  // All overdue doses (more than 1 min past their time)
  const overdueDoses = pending.filter(d => getDiffMin(d.scheduledAt, now) < -1)

  // Next upcoming dose within 60 min (not overdue)
  const nextUpDose = pending.find(d => {
    const diff = getDiffMin(d.scheduledAt, now)
    return diff >= -1 && diff <= 60
  }) ?? null

  const highlightedIds = new Set([
    ...overdueDoses.map(d => d.schedule.id),
    ...(nextUpDose ? [nextUpDose.schedule.id] : []),
  ])
  const restPending = pending.filter(d => !highlightedIds.has(d.schedule.id))

  const pendingGroups = (Object.keys(GROUP_META) as TimeGroup[])
    .map(g => ({ group: g, doses: restPending.filter(d => getTimeGroup(d.scheduledAt) === g) }))
    .filter(({ doses }) => doses.length > 0)

  return (
    <div className="flex flex-col gap-4 px-5 py-4" style={{ paddingBottom: 'max(120px, calc(88px + env(safe-area-inset-bottom)))' }}>

      {/* Push notification prompt */}
      {!loading && notifState === 'default' && !dismissedNotifBanner && (
        <div className="bg-[#192830] rounded-2xl px-4 py-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Bell size={16} className="text-white" />
              </div>
              <p className="text-sm font-semibold text-white leading-snug">Medication reminders</p>
            </div>
            <button
              onClick={() => setDismissedNotifBanner(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition shrink-0 -mt-0.5 -mr-1"
            >
              <X size={15} className="text-white/50" />
            </button>
          </div>
          <p className="text-xs text-white/60 mb-3 pl-[42px]">Receive an alert 15 min before each dose — even with the screen off.</p>
          <button
            onClick={() => subscribePush()}
            className="w-full bg-[#cbebcd] text-[#192830] text-sm font-bold py-2.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition"
          >
            Enable notifications
          </button>
        </div>
      )}

      {/* PWA install banner — native prompt (Android/Chrome) */}
      {!loading && installState === 'installable' && !dismissedInstallBanner && (
        <div className="bg-[#192830] rounded-2xl px-4 py-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Download size={16} className="text-white" />
              </div>
              <p className="text-sm font-semibold text-white leading-snug">Add to home screen</p>
            </div>
            <button
              onClick={dismissInstallBanner}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition shrink-0 -mt-0.5 -mr-1"
            >
              <X size={15} className="text-white/50" />
            </button>
          </div>
          <p className="text-xs text-white/60 mb-3 pl-[42px]">Install MedPal for quick access — works offline too.</p>
          <button
            onClick={install}
            className="w-full bg-[#cbebcd] text-[#192830] text-sm font-bold py-2.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition"
          >
            Install app
          </button>
        </div>
      )}

{/* Progress bar card */}
      {!loading && totalCount > 0 && (
        <Link to="/analytics" data-walkthrough="home-progress" className={`block rounded-2xl px-4 py-4 ${allDone ? 'bg-[#192830]' : 'bg-white border border-[#e9e8e4] shadow-sm'}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              {allDone ? (
                <>
                  <p className="text-base font-bold text-white">All done for today!</p>
                  <p className="text-xs text-[#cbebcd] mt-0.5">Great job keeping up with your medications.</p>
                </>
              ) : (
                <>
                  <p className="text-base font-bold text-[#192830]">{takenCount} of {totalCount} taken</p>
                  <p className="text-xs text-[#43474a] mt-0.5">
                    {totalCount - takenCount} remaining today
                  </p>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {allDone ? (
                <div className="w-10 h-10 rounded-full bg-[#cbebcd] flex items-center justify-center">
                  <Check size={20} className="text-[#192830]" strokeWidth={2.5} />
                </div>
              ) : (
                <span className="text-2xl font-bold text-[#192830]">{progress}%</span>
              )}
              <ChevronRight size={18} className={allDone ? 'text-[#cbebcd]' : 'text-[#c3c7ca]'} strokeWidth={2} />
            </div>
          </div>
          {!allDone && (
            <div className="h-2 rounded-full bg-[#f4f3f0] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#49654d] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </Link>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="bg-white rounded-2xl border border-[#e9e8e4] shadow-sm overflow-hidden divide-y divide-[#f4f3f0]">
          {[0, 1, 2].map(i => <SkeletonRow key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && doses.length === 0 && unscheduledMeds.length === 0 && (
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
      )}

      {/* Overdue doses */}
      {!loading && overdueDoses.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-6 h-6 rounded-full bg-[#ba1a1a] flex items-center justify-center">
              <Bell size={12} className="text-white" />
            </div>
            <h2 className="text-sm font-semibold text-[#ba1a1a]">Overdue</h2>
          </div>
          <div className="rounded-2xl border border-[#f4b8b8] bg-[#fff5f5] overflow-hidden divide-y divide-[#fde8e8]">
            {overdueDoses.map(dose => (
              <DoseRow key={dose.schedule.id} dose={dose} now={now} marking={marking} onMark={handleMarkTaken} />
            ))}
          </div>
        </section>
      )}

      {/* Next up — first upcoming dose within 60 min */}
      {!loading && nextUpDose && (
        <section>
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-6 h-6 rounded-full bg-[#192830] flex items-center justify-center">
              <Bell size={12} className="text-white" />
            </div>
            <h2 className="text-sm font-semibold text-[#192830]">Next up</h2>
          </div>
          <div className="rounded-2xl border border-[#b6d9b8] bg-[#f6faf6] overflow-hidden">
            <DoseRow dose={nextUpDose} now={now} marking={marking} onMark={handleMarkTaken} />
          </div>
        </section>
      )}

      {/* Remaining pending — grouped by time of day */}
      {!loading && pendingGroups.map(({ group, doses: groupDoses }) => {
        const meta = GROUP_META[group]
        const GroupIcon = meta.Icon
        return (
          <section key={group}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className={`w-6 h-6 rounded-full ${meta.iconBg} flex items-center justify-center`}>
                <GroupIcon size={13} className={meta.iconColor} />
              </div>
              <h2 className="text-sm font-semibold text-[#43474a]">{meta.label}</h2>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-[#e9e8e4] overflow-hidden divide-y divide-[#f4f3f0]">
              {groupDoses.map(dose => (
                <DoseRow key={dose.schedule.id} dose={dose} now={now} marking={marking} onMark={handleMarkTaken} />
              ))}
            </div>
          </section>
        )
      })}

      {/* Taken */}
      {!loading && taken.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[#43474a] mb-2 px-1">Taken</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-[#e9e8e4] overflow-hidden divide-y divide-[#f4f3f0]">
            {taken.map(dose => (
              <DoseRow key={dose.schedule.id} dose={dose} now={now} marking={marking} onMark={handleMarkTaken} dimmed />
            ))}
          </div>
        </section>
      )}

      {/* As needed */}
      {!loading && unscheduledMeds.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[#43474a] mb-2 px-1">As needed</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-[#e9e8e4] overflow-hidden divide-y divide-[#f4f3f0]">
            {unscheduledMeds.map(med => (
              <div key={med.id} className="px-4 py-3.5 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${getMedIconBg(med.display_name)} flex items-center justify-center shrink-0`}>
                  <Pill size={18} className={getMedIconColor(med.display_name)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#192830]">{med.display_name}</p>
                  <p className="text-xs text-[#43474a] mt-0.5">No schedule set</p>
                </div>
                <Link
                  to={`/medications/${med.id}/edit`}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-[#f4f3f0] hover:bg-[#e9e8e4] active:scale-95 transition-all shrink-0"
                  aria-label="Add schedule"
                >
                  <Pencil size={15} className="text-[#43474a]" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick actions */}
      {!loading && (
        <section data-walkthrough="home-quick-actions">
          <h2 className="text-sm font-semibold text-[#43474a] mb-2 px-1">Quick actions</h2>
          <Link
            to="/prescriptions/upload"
            className="bg-white rounded-2xl border border-[#e9e8e4] shadow-sm px-4 py-4 flex items-center gap-3 hover:bg-[#faf9f5] active:scale-[0.99] transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-[#cbebcd] flex items-center justify-center shrink-0">
              <Plus size={18} className="text-[#192830]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#192830]">Add prescription</p>
              <p className="text-xs text-[#43474a]">Scan or upload a new prescription</p>
            </div>
          </Link>
        </section>
      )}

    </div>
  )
}
