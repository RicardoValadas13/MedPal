import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ScanLine, MoreVertical, Pencil, Trash2, Utensils,
  Download, ChevronDown, ChevronUp, Sunrise, Sun, Sunset,
  Moon, Plus, History, Pill, type LucideIcon,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'
import type { UserMedication, Schedule } from '../types/database'

interface MedicationWithSchedule extends UserMedication {
  schedules?: Schedule[]
}

type SlotKey = 'morning' | 'afternoon' | 'evening' | 'night'

const SLOTS: { key: SlotKey; label: string; Icon: LucideIcon; iconColor: string }[] = [
  { key: 'morning',   label: 'Morning',   Icon: Sunrise, iconColor: '#d97706' },
  { key: 'afternoon', label: 'Afternoon', Icon: Sun,     iconColor: '#2563eb' },
  { key: 'evening',   label: 'Evening',   Icon: Sunset,  iconColor: '#ea580c' },
  { key: 'night',     label: 'Night',     Icon: Moon,    iconColor: '#7c3aed' },
]

function getSlot(time: string): SlotKey {
  const h = parseInt(time.split(':')[0])
  if (h >= 6  && h < 12) return 'morning'
  if (h >= 12 && h < 18) return 'afternoon'
  if (h >= 18 && h < 22) return 'evening'
  return 'night'
}

type SlotEntry = { med: MedicationWithSchedule; slotTimes: string[] }

function buildSlots(meds: MedicationWithSchedule[]) {
  const map: Record<SlotKey, SlotEntry[]> = { morning: [], afternoon: [], evening: [], night: [] }
  const unscheduled: MedicationWithSchedule[] = []

  for (const med of meds) {
    const schedules = med.schedules ?? []
    if (!schedules.length) { unscheduled.push(med); continue }

    const bySlot: Partial<Record<SlotKey, string[]>> = {}
    for (const s of schedules) {
      const slot = getSlot(s.time_of_day)
      ;(bySlot[slot] = bySlot[slot] ?? []).push(s.time_of_day)
    }
    for (const [slot, times] of Object.entries(bySlot) as [SlotKey, string[]][]) {
      map[slot].push({ med, slotTimes: [...times].sort() })
    }
  }

  return { map, unscheduled }
}

export function MedicationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [medications, setMedications] = useState<MedicationWithSchedule[]>([])
  const [pastMedications, setPastMedications] = useState<MedicationWithSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => { if (user) loadMedications() }, [user])

  async function loadMedications() {
    const { data: allMeds } = await supabase
      .from('user_medications')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })

    if (allMeds) {
      const enriched: MedicationWithSchedule[] = await Promise.all(
        allMeds.map(async (m: UserMedication) => {
          const { data: schedules } = await supabase.from('schedules').select('*').eq('user_medication_id', m.id)
          return { ...m, schedules: schedules ?? [] }
        })
      )
      setMedications(enriched.filter(m => m.is_active))
      setPastMedications(enriched.filter(m => !m.is_active))
    }
    setLoading(false)
  }

  async function handleDelete(medId: string) {
    setOpenMenuId(null)
    await supabase.from('user_medications').update({ is_active: false }).eq('id', medId)
    setMedications(prev => prev.filter(m => m.id !== medId))
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const { map: slotMap, unscheduled } = buildSlots(medications)
  const hasAny = medications.length > 0 || pastMedications.length > 0

  const MedCard = ({ med, slotTimes, showMenu }: {
    med: MedicationWithSchedule
    slotTimes?: string[]
    showMenu: boolean
  }) => {
    const schedules = med.schedules ?? []
    const relevantSchedules = slotTimes
      ? schedules.filter(s => slotTimes.includes(s.time_of_day))
      : schedules
    const withFood = relevantSchedules.some(s => s.with_food)

    return (
      <div className="bg-white rounded-2xl px-4 py-3.5 border border-[#e9e8e4] shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-[#192830] leading-snug">{med.display_name}</h4>
            {med.dosage && (
              <p className="text-xs text-[#73787b] mt-0.5">{med.dosage}</p>
            )}
          </div>
          {showMenu && (
            <div
              className="relative shrink-0"
              ref={openMenuId === med.id ? menuRef : undefined}
            >
              <button
                onClick={() => setOpenMenuId(openMenuId === med.id ? null : med.id)}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#efeeea] transition text-[#73787b]"
              >
                <MoreVertical size={18} />
              </button>
              {openMenuId === med.id && (
                <div className="absolute right-0 top-10 bg-white border border-[#e9e8e4] rounded-xl shadow-lg z-50 overflow-hidden min-w-[140px]">
                  <button
                    onClick={() => { setOpenMenuId(null); navigate(`/medications/${med.id}/edit`) }}
                    className="w-full flex items-center gap-2 px-4 min-h-[48px] text-sm font-semibold text-[#192830] hover:bg-[#f4f3f0] transition"
                  >
                    <Pencil size={15} /> Edit
                  </button>
                  <div className="h-px bg-[#f4f3f0]" />
                  <button
                    onClick={() => handleDelete(med.id)}
                    className="w-full flex items-center gap-2 px-4 min-h-[48px] text-sm font-semibold text-[#ba1a1a] hover:bg-[#fff5f5] transition"
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {slotTimes?.map(t => (
            <span key={t} className="bg-[#f4f3f0] text-[#43474a] px-2.5 py-1 rounded-full text-xs font-semibold">
              {t.slice(0, 5)}
            </span>
          ))}
          {withFood && (
            <span className="bg-[#f4f3f0] text-[#43474a] px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <Utensils size={11} /> With food
            </span>
          )}
          {med.source === 'prescription' && (
            <span className="bg-[#cbebcd] text-[#4f6b53] px-2.5 py-1 rounded-full text-xs font-semibold">
              Prescribed
            </span>
          )}
          {!med.is_active && (
            <span className="bg-[#f4f3f0] text-[#73787b] px-2.5 py-1 rounded-full text-xs font-semibold">
              {formatDate(med.start_date)} – {formatDate(med.end_date ?? med.created_at)}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media print {
          .meds-no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div
        className="px-5 py-md flex flex-col gap-6"
        style={{ paddingBottom: 'max(160px, calc(120px + env(safe-area-inset-bottom)))' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-display-lg font-bold tracking-[-0.02em] text-[#192830]">My Meds</h2>
            <p className="text-body-md text-[#43474a] mt-1">Your digital health cabinet.</p>
          </div>
          <div className="meds-no-print flex items-center gap-2 shrink-0 mt-1">
            <Link
              to="/medications/add"
              className="flex items-center gap-1.5 px-3 min-h-[40px] rounded-xl bg-[#192830] text-white text-xs font-semibold hover:opacity-90 transition active:scale-95"
            >
              <Plus size={14} /> Add
            </Link>
            {hasAny && (
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 min-h-[40px] rounded-xl border border-[#e9e8e4] text-xs font-semibold text-[#43474a] hover:bg-[#efeeea] transition active:scale-95"
              >
                <Download size={14} /> Export
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-body-md text-[#43474a]">{pt.common.loading}</p>
        ) : medications.length === 0 && pastMedications.length === 0 ? (
          <div className="text-center py-12">
            <Pill size={48} className="text-[#c3c7ca] mx-auto mb-4" />
            <p className="text-body-md text-[#43474a]">No active medications.</p>
          </div>
        ) : (
          <>
            {SLOTS.map(({ key, label, Icon, iconColor }) => {
              const entries = slotMap[key]
              if (!entries.length) return null
              return (
                <section key={key} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Icon size={18} className="" style={{ color: iconColor }} />
                    <h3 className="text-xs font-bold text-[#43474a] uppercase tracking-widest">{label}</h3>
                    <span className="text-xs font-semibold bg-[#efeeea] text-[#73787b] px-2 py-0.5 rounded-full">
                      {entries.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {entries.map(({ med, slotTimes }) => (
                      <MedCard key={`${med.id}-${key}`} med={med} slotTimes={slotTimes} showMenu />
                    ))}
                  </div>
                </section>
              )
            })}

            {unscheduled.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-[#73787b] uppercase tracking-widest">Unscheduled</h3>
                  <span className="text-xs font-semibold bg-[#efeeea] text-[#73787b] px-2 py-0.5 rounded-full">
                    {unscheduled.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {unscheduled.map(med => (
                    <MedCard key={med.id} med={med} showMenu />
                  ))}
                </div>
              </section>
            )}

            {pastMedications.length > 0 && (
              <section className="flex flex-col gap-3">
                <button
                  onClick={() => setShowPast(p => !p)}
                  className="flex items-center justify-between min-h-[44px] text-left"
                >
                  <div className="flex items-center gap-2">
                    <History size={18} className="text-[#73787b]" />
                    <h3 className="text-xs font-bold text-[#73787b] uppercase tracking-widest">Past</h3>
                    <span className="text-xs font-semibold bg-[#efeeea] text-[#73787b] px-2 py-0.5 rounded-full">
                      {pastMedications.length}
                    </span>
                  </div>
                  {showPast
                    ? <ChevronUp size={16} className="text-[#73787b] shrink-0" />
                    : <ChevronDown size={16} className="text-[#73787b] shrink-0" />
                  }
                </button>
                {showPast && (
                  <div className="flex flex-col gap-2.5 opacity-60">
                    {pastMedications.map(med => (
                      <MedCard key={med.id} med={med} showMenu={false} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      <div
        className="meds-no-print fixed z-40 right-5"
        style={{ bottom: 'calc(84px + env(safe-area-inset-bottom))' }}
      >
        <Link
          to="/prescriptions/upload"
          data-walkthrough="medications-scan"
          className="bg-[#192830] hover:bg-[#2f3e46] text-white rounded-full h-14 pl-4 pr-5 flex items-center gap-2.5 shadow-[0_12px_24px_rgba(47,62,70,0.2)] hover:scale-105 active:scale-95 transition-transform duration-200"
        >
          <ScanLine size={22} />
          <span className="text-sm font-semibold">Scan Prescription</span>
        </Link>
      </div>
    </>
  )
}
