import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'
import type { Prescription } from '../types/database'

const STATUS_CONFIG = {
  uploaded:   { label: 'Uploaded',   Icon: Clock,         chip: 'bg-[#efeeea] text-[#43474a]' },
  processing: { label: 'Processing', Icon: Clock,         chip: 'bg-[#d5e5ef] text-[#192830]' },
  extracted:  { label: 'Review',     Icon: AlertCircle,   chip: 'bg-[#ffdad6] text-[#93000a]' },
  confirmed:  { label: 'Confirmed',  Icon: CheckCircle,   chip: 'bg-[#cbebcd] text-[#4f6b53]' },
  failed:     { label: 'Failed',     Icon: XCircle,       chip: 'bg-[#ffdad6] text-[#ba1a1a]' },
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
      .then(({ data }) => { setPrescriptions(data ?? []); setLoading(false) })
  }, [user])

  return (
    <div className="px-5 py-md flex flex-col gap-md">
      {/* Title + action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-display-lg font-bold tracking-[-0.02em] text-[#192830]">Prescriptions</h2>
          <p className="text-body-md text-[#43474a] mt-1">Your uploaded prescriptions.</p>
        </div>
        <Link
          to="/prescriptions/upload"
          className="flex items-center gap-2 px-md py-sm bg-[#192830] text-white text-label-lg font-semibold rounded-lg min-h-[48px] hover:opacity-[0.88] transition shadow-[0_4px_16px_rgba(25,40,48,0.12)]"
        >
          <Plus size={18} />
          New
        </Link>
      </div>

      {loading ? (
        <p className="text-body-md text-[#43474a]">{pt.common.loading}</p>
      ) : prescriptions.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={48} className="text-[#c3c7ca] mx-auto mb-4" />
          <p className="text-body-md text-[#43474a]">No prescriptions yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-sm">
          {prescriptions.map(p => {
            const cfg = STATUS_CONFIG[p.status]
            return (
              <Link
                key={p.id}
                to={p.status === 'extracted' ? `/prescriptions/${p.id}/confirm` : '#'}
                className="flex items-center gap-md bg-[#ffffff] rounded-xl p-sm border border-[#c3c7ca]/30 shadow-sm hover:shadow-[0_8px_32px_rgba(25,40,48,0.08)] hover:-translate-y-0.5 transition"
              >
                <div className="w-10 h-10 bg-[#f4f4f0] rounded-xl flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-[#43474a]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-label-lg font-semibold text-[#1b1c1a] truncate">
                    {p.doctor_name ?? 'Prescription'}
                  </p>
                  <p className="text-caption text-[#43474a]">
                    {p.prescribed_at ?? new Date(p.created_at).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 ${cfg.chip} text-caption font-semibold px-sm py-xs rounded-full shrink-0`}>
                  <cfg.Icon size={13} />
                  {cfg.label}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
