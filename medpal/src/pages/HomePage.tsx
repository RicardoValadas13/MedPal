import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'
import type { UserMedication } from '../types/database'

interface TodayMedication extends UserMedication {
  next_time?: string
  taken_today?: boolean
}

export function HomePage() {
  const { user } = useAuth()
  const [medications, setMedications] = useState<TodayMedication[]>([])
  const [loading, setLoading] = useState(true)
  const firstName = user?.email?.split('@')[0] ?? ''

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
      const takenIds = new Set(
        events
          ?.filter(e => e.status === 'taken')
          .map(e => e.user_medication_id) ?? []
      )

      setMedications(
        meds.map(m => ({
          ...m,
          taken_today: takenIds.has(m.id),
        }))
      )
    }

    setLoading(false)
  }

  return (
    <div className="px-4 pt-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-gray-400">{pt.home.greeting},</p>
          <h1 className="text-xl font-semibold text-gray-900 capitalize">{firstName}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            to="/prescriptions/upload"
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-2xl min-h-[44px]"
          >
            <Camera size={14} />
            {pt.home.addPrescription}
          </Link>
        </div>
      </div>

      {/* Today's medications */}
      <h2 className="text-sm font-semibold text-gray-700 mb-3">{pt.home.todayMedications}</h2>

      {loading ? (
        <p className="text-sm text-gray-400">{pt.common.loading}</p>
      ) : medications.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-gray-400 mb-4">{pt.home.noMedications}</p>
          <Link
            to="/medications/add"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-2xl min-h-[44px]"
          >
            <Plus size={16} />
            {pt.home.addManual}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {medications.map(med => (
            <div
              key={med.id}
              className={`flex items-center justify-between bg-white rounded-2xl border-[0.5px] px-4 py-3 ${
                med.taken_today ? 'border-green-200 opacity-60' : 'border-gray-200'
              }`}
            >
              <div>
                <p className={`text-sm font-semibold ${med.taken_today ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {med.display_name}
                </p>
                {med.dosage && <p className="text-xs text-gray-400 mt-0.5">{med.dosage}</p>}
              </div>
              {med.taken_today ? (
                <span className="text-xs text-green-600 font-medium">✓ Taken</span>
              ) : (
                <span className="text-xs text-gray-400">Pending</span>
              )}
            </div>
          ))}

          <Link
            to="/medications/add"
            className="flex items-center justify-center gap-2 w-full py-3 border-[0.5px] border-dashed border-gray-300 rounded-2xl text-sm text-gray-400 hover:bg-gray-50 mt-2 min-h-[44px]"
          >
            <Plus size={16} />
            {pt.home.addManual}
          </Link>
        </div>
      )}
    </div>
  )
}
