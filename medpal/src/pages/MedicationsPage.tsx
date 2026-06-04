import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ScanLine, Pill, History, MoreVertical, Pencil, Trash2, Clock, Utensils } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
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
    const { data: meds } = await supabase
      .from('user_medications')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (meds) {
      const enriched: MedicationWithSchedule[] = await Promise.all(
        meds.map(async m => {
          const { data: schedules } = await supabase
            .from('schedules')
            .select('*')
            .eq('user_medication_id', m.id)
          return { ...m, schedules: schedules ?? [] }
        })
      )
      setMedications(enriched)
    }
    setLoading(false)
  }

  const active = medications.filter(m => m.is_active)

  return (
    <div className="px-5 py-md flex flex-col gap-md pb-[140px]">
      {/* Title */}
      <div>
        <h2 className="text-display-lg font-bold tracking-[-0.02em] text-[#192830]">My Meds</h2>
        <p className="text-body-md text-[#43474a] mt-1">Your digital health cabinet.</p>
      </div>

      {loading ? (
        <p className="text-body-md text-[#43474a]">{pt.common.loading}</p>
      ) : active.length === 0 ? (
        <div className="text-center py-12">
          <Pill size={48} className="text-[#c3c7ca] mx-auto mb-4" />
          <p className="text-body-md text-[#43474a]">No active medications.</p>
        </div>
      ) : (
        <>
          {/* Active section */}
          <section className="flex flex-col gap-md">
            <h3 className="text-headline-mobile font-semibold text-[#1b1c1a] flex items-center gap-sm">
              <Pill size={20} className="text-[#49654d]" />
              Daily Use
            </h3>
            <div className="flex flex-col gap-md">
              {active.map(med => {
                const schedules = med.schedules ?? []
                const times = schedules.map(s => s.time_of_day).join(', ')
                const withFood = schedules.some(s => s.with_food)
                const timesPerDay = schedules.length

                return (
                  <div
                    key={med.id}
                    className="bg-[#ffffff] rounded-xl p-md border-l-4 border-l-[#49654d] shadow-sm flex flex-col gap-sm hover:shadow-[0_8px_32px_rgba(25,40,48,0.08)] transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-headline-mobile font-semibold text-[#192830]">{med.display_name}</h4>
                        <p className="text-body-md text-[#43474a]">
                          {[med.dosage, med.source === 'prescription' ? 'Prescription' : 'Manual'].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 relative" ref={openMenuId === med.id ? menuRef : undefined}>
                        <div className="w-10 h-10 rounded-xl bg-[#cbebcd] flex items-center justify-center">
                          <Pill size={20} className="text-[#49654d]" />
                        </div>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === med.id ? null : med.id)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#efeeea] transition text-[#43474a]"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {openMenuId === med.id && (
                          <div className="absolute right-0 top-10 bg-white border border-[#e9e8e4] rounded-xl shadow-lg z-50 overflow-hidden min-w-[140px]">
                            <button
                              onClick={() => { setOpenMenuId(null); navigate(`/medications/${med.id}/edit`) }}
                              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-[#192830] hover:bg-[#f4f4f0] transition"
                            >
                              <Pencil size={15} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(med.id)}
                              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-[#ba1a1a] hover:bg-[#fff0f0] transition"
                            >
                              <Trash2 size={15} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-xs mt-xs">
                      {timesPerDay > 0 && (
                        <span className="bg-[#efeeea] text-[#43474a] px-sm py-xs rounded-full text-caption font-semibold flex items-center gap-xs">
                          <Clock size={12} /> {timesPerDay}× daily{times ? ` · ${times}` : ''}
                        </span>
                      )}
                      {withFood && (
                        <span className="bg-[#efeeea] text-[#43474a] px-sm py-xs rounded-full text-caption font-semibold flex items-center gap-xs">
                          <Utensils size={12} /> With food
                        </span>
                      )}
                      {med.source === 'prescription' && (
                        <span className="bg-[#cbebcd] text-[#4f6b53] px-sm py-xs rounded-full text-caption font-semibold">
                          Prescribed
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* History section placeholder */}
          <section className="flex flex-col gap-md opacity-70">
            <h3 className="text-headline-mobile font-semibold text-[#73787b] flex items-center gap-sm">
              <History size={20} className="text-[#73787b]" />
              History
            </h3>
            <p className="text-body-md text-[#73787b]">Past medications will appear here.</p>
          </section>
        </>
      )}

      {/* FAB — Scan Prescription */}
      <div className="fixed bottom-[84px] right-5 z-40">
        <Link
          to="/prescriptions/upload"
          className="bg-[#192830] hover:bg-[#2f3e46] text-white rounded-full h-16 pl-md pr-lg flex items-center gap-sm shadow-[0_12px_24px_rgba(47,62,70,0.2)] hover:scale-105 active:scale-95 transition-transform duration-200"
        >
          <ScanLine size={26} />
          <span className="text-label-lg font-semibold">Scan Prescription</span>
        </Link>
      </div>
    </div>
  )
}
