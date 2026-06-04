import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScanLine, Pill, History } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'
import type { UserMedication, Schedule } from '../types/database'

interface MedicationWithSchedule extends UserMedication {
  schedules?: Schedule[]
}

export function MedicationsPage() {
  const { user } = useAuth()
  const [medications, setMedications] = useState<MedicationWithSchedule[]>([])
  const [loading, setLoading] = useState(true)

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
                    className="bg-[#ffffff] rounded-xl p-md border-l-4 border-l-[#49654d] shadow-sm flex flex-col gap-sm hover:shadow-[0_8px_32px_rgba(25,40,48,0.08)] transition-shadow cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-headline-mobile font-semibold text-[#192830]">{med.display_name}</h4>
                        <p className="text-body-md text-[#43474a]">
                          {[med.dosage, med.source === 'prescription' ? 'Prescription' : 'Manual'].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-[#cbebcd] flex items-center justify-center shrink-0">
                        <Pill size={20} className="text-[#49654d]" />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-xs mt-xs">
                      {timesPerDay > 0 && (
                        <span className="bg-[#efeeea] text-[#43474a] px-sm py-xs rounded-full text-caption font-semibold flex items-center gap-xs">
                          🕐 {timesPerDay}× daily{times ? ` · ${times}` : ''}
                        </span>
                      )}
                      {withFood && (
                        <span className="bg-[#efeeea] text-[#43474a] px-sm py-xs rounded-full text-caption font-semibold flex items-center gap-xs">
                          🍽 With food
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
