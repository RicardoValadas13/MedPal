import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pill } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'
import type { UserMedication } from '../types/database'

export function MedicationsPage() {
  const { user } = useAuth()
  const [medications, setMedications] = useState<UserMedication[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('user_medications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setMedications(data ?? [])
        setLoading(false)
      })
  }, [user])

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{pt.nav.medications}</h1>
        <Link
          to="/medications/add"
          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-2xl min-h-[44px]"
        >
          <Plus size={14} />
          Add
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">{pt.common.loading}</p>
      ) : medications.length === 0 ? (
        <div className="text-center py-12">
          <Pill size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400 mb-4">No active medications.</p>
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
              className="flex items-center gap-3 bg-white rounded-2xl border-[0.5px] border-gray-200 px-4 py-3"
            >
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                <Pill size={18} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{med.display_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {[med.dosage, med.source === 'prescription' ? 'Prescription' : 'Manual']
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
