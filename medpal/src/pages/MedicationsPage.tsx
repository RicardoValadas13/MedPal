import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ScanLine, Pill, MoreVertical, Pencil, Trash2, Clock, Utensils, History, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'
import type { UserMedication, Schedule } from '../types/database'

interface MedicationWithSchedule extends UserMedication {
  schedules?: Schedule[]
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
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleDelete(medId: string) {
    setOpenMenuId(null)
    await supabase.from('user_medications').update({ is_active: false }).eq('id', medId)
    setMedications(prev => prev.filter(m => m.id !== medId))
  }

  useEffect(() => {
    if (!user) return
    loadMedications()
  }, [user])

  async function loadMedications() {
    const { data: allMeds } = await supabase
      .from('user_medications')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })

    if (allMeds) {
      const enriched: MedicationWithSchedule[] = await Promise.all(
        allMeds.map(async (m: UserMedication) => {
          const { data: schedules } = await supabase
            .from('schedules')
            .select('*')
            .eq('user_medication_id', m.id)
          return { ...m, schedules: schedules ?? [] }
        })
      )
      setMedications(enriched.filter(m => m.is_active))
      setPastMedications(enriched.filter(m => !m.is_active))
    }
    setLoading(false)
  }

  async function handleExportHistory() {
    window.print()
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const active = medications

  const MedCard = ({ med, showMenu }: { med: MedicationWithSchedule; showMenu: boolean }) => {
    const schedules = med.schedules ?? []
    const withFood = schedules.some(s => s.with_food)
    const timesPerDay = schedules.length

    return (
      <div className="bg-white rounded-2xl px-4 py-4 border border-[#e9e8e4] shadow-sm flex flex-col gap-3">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-[#192830] leading-snug">{med.display_name}</h4>
            <p className="text-xs text-[#43474a] mt-0.5">
              {[med.dosage, med.source === 'prescription' ? 'Prescription' : 'Manual'].filter(Boolean).join(' · ')}
            </p>
          </div>
          {showMenu && (
            <div className="flex items-center gap-1 shrink-0 relative" ref={openMenuId === med.id ? menuRef : undefined}>
              <div className="w-9 h-9 rounded-xl bg-[#cbebcd] flex items-center justify-center">
                <Pill size={18} className="text-[#49654d]" />
              </div>
              <button
                onClick={() => setOpenMenuId(openMenuId === med.id ? null : med.id)}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#efeeea] transition text-[#43474a]"
              >
                <MoreVertical size={20} />
              </button>
              {openMenuId === med.id && (
                <div className="absolute right-0 top-11 bg-white border border-[#e9e8e4] rounded-xl shadow-lg z-50 overflow-hidden min-w-[140px]">
                  <button
                    onClick={() => { setOpenMenuId(null); navigate(`/medications/${med.id}/edit`) }}
                    className="w-full flex items-center gap-2 px-4 min-h-[48px] text-sm font-semibold text-[#192830] hover:bg-[#f4f3f0] transition"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>
                  <div className="h-px bg-[#f4f3f0]" />
                  <button
                    onClick={() => handleDelete(med.id)}
                    className="w-full flex items-center gap-2 px-4 min-h-[48px] text-sm font-semibold text-[#ba1a1a] hover:bg-[#fff5f5] transition"
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
          {!showMenu && (
            <div className="w-9 h-9 rounded-xl bg-[#efeeea] flex items-center justify-center shrink-0">
              <Pill size={18} className="text-[#73787b]" />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {timesPerDay > 0 && (
            <span className="bg-[#f4f3f0] text-[#43474a] px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <Clock size={11} /> {timesPerDay}× daily
            </span>
          )}
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

      <div className="px-5 py-md flex flex-col gap-md" style={{ paddingBottom: 'max(140px, calc(100px + env(safe-area-inset-bottom)))' }}>
        {/* Title */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-display-lg font-bold tracking-[-0.02em] text-[#192830]">My Meds</h2>
            <p className="text-body-md text-[#43474a] mt-1">Your digital health cabinet.</p>
          </div>
          {(active.length > 0 || pastMedications.length > 0) && (
            <button
              onClick={handleExportHistory}
              className="meds-no-print flex items-center gap-1.5 px-3 min-h-[40px] rounded-xl border border-[#e9e8e4] text-xs font-semibold text-[#43474a] hover:bg-[#efeeea] transition active:scale-95 shrink-0 mt-1"
            >
              <Download size={14} />
              Export
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-body-md text-[#43474a]">{pt.common.loading}</p>
        ) : (
          <>
            {active.length === 0 && pastMedications.length === 0 ? (
              <div className="text-center py-12">
                <Pill size={48} className="text-[#c3c7ca] mx-auto mb-4" />
                <p className="text-body-md text-[#43474a]">No active medications.</p>
              </div>
            ) : (
              <>
                {/* Active section */}
                {active.length > 0 && (
                  <section className="flex flex-col gap-md">
                    <h3 className="text-headline-mobile font-semibold text-[#192830] flex items-center gap-sm">
                      <Pill size={20} className="text-[#49654d]" />
                      Daily Use
                    </h3>
                    <div className="flex flex-col gap-md">
                      {active.map(med => (
                        <MedCard key={med.id} med={med} showMenu />
                      ))}
                    </div>
                  </section>
                )}

                {/* Past medications section */}
                {pastMedications.length > 0 && (
                  <section className="flex flex-col gap-md">
                    <button
                      onClick={() => setShowPast(p => !p)}
                      className="flex items-center justify-between min-h-[44px] text-left"
                    >
                      <h3 className="text-headline-mobile font-semibold text-[#43474a] flex items-center gap-sm">
                        <History size={20} className="text-[#73787b]" />
                        Past Medications
                        <span className="ml-1 text-xs font-semibold bg-[#efeeea] text-[#73787b] px-2 py-0.5 rounded-full">
                          {pastMedications.length}
                        </span>
                      </h3>
                      {showPast ? (
                        <ChevronUp size={18} className="text-[#73787b] shrink-0" />
                      ) : (
                        <ChevronDown size={18} className="text-[#73787b] shrink-0" />
                      )}
                    </button>
                    {showPast && (
                      <div className="flex flex-col gap-md opacity-70">
                        {pastMedications.map(med => (
                          <MedCard key={med.id} med={med} showMenu={false} />
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
          </>
        )}

        {/* FAB — Scan Prescription */}
        <div className="meds-no-print fixed z-40 right-5" style={{ bottom: 'calc(84px + env(safe-area-inset-bottom))' }}>
          <Link
            to="/prescriptions/upload"
            className="bg-[#192830] hover:bg-[#2f3e46] text-white rounded-full h-16 pl-md pr-lg flex items-center gap-sm shadow-[0_12px_24px_rgba(47,62,70,0.2)] hover:scale-105 active:scale-95 transition-transform duration-200"
          >
            <ScanLine size={26} />
            <span className="text-label-lg font-semibold">Scan Prescription</span>
          </Link>
        </div>
      </div>
    </>
  )
}
