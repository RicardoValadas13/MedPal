import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'
import type { Prescription } from '../types/database'

const STATUS_CONFIG = {
  uploaded: { label: 'Uploaded', Icon: Clock, color: 'text-gray-400' },
  processing: { label: 'Processing', Icon: Clock, color: 'text-blue-500' },
  extracted: { label: 'Extracted', Icon: AlertCircle, color: 'text-amber-500' },
  confirmed: { label: 'Confirmed', Icon: CheckCircle, color: 'text-green-500' },
  failed: { label: 'Failed', Icon: XCircle, color: 'text-red-500' },
}

export function PrescriptionsPage() {
  const { user } = useAuth()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('prescriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPrescriptions(data ?? [])
        setLoading(false)
      })
  }, [user])

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{pt.nav.prescriptions}</h1>
        <Link
          to="/prescriptions/upload"
          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-2xl min-h-[44px]"
        >
          <Plus size={14} />
          New
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">{pt.common.loading}</p>
      ) : prescriptions.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No prescriptions yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {prescriptions.map(p => {
            const cfg = STATUS_CONFIG[p.status]
            return (
              <Link
                key={p.id}
                to={p.status === 'extracted' ? `/prescriptions/${p.id}/confirm` : '#'}
                className="flex items-center gap-3 bg-white rounded-2xl border-[0.5px] border-gray-200 px-4 py-3"
              >
                <FileText size={20} className="text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {p.doctor_name ?? 'Prescription'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {p.prescribed_at ?? new Date(p.created_at).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
                  <cfg.Icon size={13} />
                  {cfg.label}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
