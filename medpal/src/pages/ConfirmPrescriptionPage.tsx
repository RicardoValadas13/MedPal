import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, AlertTriangle, ExternalLink, ChevronLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'
import type { PrescriptionItem, Drug } from '../types/database'

interface ItemWithCandidates extends PrescriptionItem {
  candidates?: Drug[]
  selectedDrugId?: string | null
}

export function ConfirmPrescriptionPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<ItemWithCandidates[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadItems() {
    setLoading(true)

    const { data, error } = await supabase
      .from('prescription_items')
      .select('*')
      .eq('prescription_id', id!)

    if (error || !data) {
      setError(pt.common.error)
      setLoading(false)
      return
    }

    // For ambiguous items, fetch top candidates
    const enriched: ItemWithCandidates[] = await Promise.all(
      data.map(async (item) => {
        if (item.match_status === 'ambiguous' && item.extracted_name) {
          const { data: candidates } = await supabase
            .from('drugs')
            .select('*')
            .ilike('name', `%${item.extracted_name.split(' ')[0]}%`)
            .limit(5)
          return { ...item, candidates: candidates ?? [], selectedDrugId: item.drug_id }
        }
        return { ...item, selectedDrugId: item.drug_id }
      })
    )

    setItems(enriched)
    setLoading(false)
  }

  function updateItem(index: number, patch: Partial<ItemWithCandidates>) {
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  async function handleConfirm() {
    if (!user || !id) return
    setSaving(true)
    setError(null)

    try {
      for (const item of items) {
        const drugId = item.selectedDrugId ?? item.drug_id

        // Create user_medication
        const { data: med, error: medError } = await supabase
          .from('user_medications')
          .insert({
            user_id: user.id,
            drug_id: drugId,
            prescription_item_id: item.id,
            display_name: item.extracted_name,
            dosage: item.extracted_dosage,
            start_date: new Date().toISOString().split('T')[0],
            source: 'prescription',
            is_active: true,
          })
          .select()
          .single()

        if (medError) throw medError

        // Create schedule from posology if available
        const posology = item.posology_structured as {
          times_per_day?: number | null
          duration_days?: number | null
        } | null

        const timesPerDay = posology?.times_per_day ?? 1
        const defaultTimes = getDefaultTimes(timesPerDay)

        for (const time of defaultTimes) {
          await supabase.from('schedules').insert({
            user_medication_id: med.id,
            time_of_day: time,
            days_of_week: [0, 1, 2, 3, 4, 5, 6],
            dose_amount: null,
            dose_unit: null,
            with_food: false,
          })
        }

        // Update item with selected drug if changed
        if (drugId !== item.drug_id) {
          await supabase
            .from('prescription_items')
            .update({ drug_id: drugId, match_status: 'manual' })
            .eq('id', item.id)
        }
      }

      // Mark prescription confirmed
      await supabase
        .from('prescriptions')
        .update({ status: 'confirmed' })
        .eq('id', id)

      navigate('/')
    } catch (err) {
      console.error(err)
      setError(pt.confirm.errorConfirm)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-gray-400">{pt.common.loading}</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 mb-4"
      >
        <ChevronLeft size={16} />
        {pt.common.back}
      </button>

      <h1 className="text-xl font-semibold text-gray-900">{pt.confirm.title}</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">{pt.confirm.subtitle}</p>

      <div className="space-y-3">
        {items.map((item, index) => {
          const isMatched = item.match_status === 'matched'
          const isAmbiguous = item.match_status === 'ambiguous'
          const isUnmatched = item.match_status === 'unmatched' || item.match_status === 'manual'

          const confidenceFlags = item.field_confidences as Record<string, number> | null

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border-[0.5px] border-gray-200 p-4 space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{item.extracted_name}</p>
                  {item.extracted_form && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.extracted_form}</p>
                  )}
                </div>
                {isMatched && (
                  <span className="shrink-0 flex items-center gap-1 bg-green-100 text-green-700 text-[11px] font-medium px-2 py-0.5 rounded-full">
                    <CheckCircle size={11} />
                    {pt.confirm.matchedChip}
                  </span>
                )}
                {isAmbiguous && (
                  <span className="shrink-0 flex items-center gap-1 bg-amber-100 text-amber-700 text-[11px] font-medium px-2 py-0.5 rounded-full">
                    <AlertTriangle size={11} />
                    {pt.confirm.reviewChip}
                  </span>
                )}
                {isUnmatched && (
                  <span className="shrink-0 flex items-center gap-1 bg-gray-100 text-gray-600 text-[11px] font-medium px-2 py-0.5 rounded-full">
                    {pt.confirm.unmatchedChip}
                  </span>
                )}
              </div>

              {/* Ambiguous: drug selector */}
              {isAmbiguous && item.candidates && item.candidates.length > 0 && (
                <select
                  value={item.selectedDrugId ?? ''}
                  onChange={e => updateItem(index, { selectedDrugId: e.target.value || null })}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">{pt.confirm.drugSelectPlaceholder}</option>
                  {item.candidates.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.strength ? `(${c.strength})` : ''}
                    </option>
                  ))}
                </select>
              )}

              {/* Editable fields */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    {pt.confirm.dosageLabel}
                    {confidenceFlags?.extracted_dosage != null && confidenceFlags.extracted_dosage < 0.8 && (
                      <span className="ml-1 text-amber-500">⚠</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={item.extracted_dosage ?? ''}
                    onChange={e => updateItem(index, { extracted_dosage: e.target.value || null })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    {pt.confirm.quantityLabel}
                    {confidenceFlags?.quantity != null && confidenceFlags.quantity < 0.8 && (
                      <span className="ml-1 text-amber-500">⚠</span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={item.quantity ?? ''}
                    onChange={e => updateItem(index, { quantity: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>

              {/* Posology */}
              {item.posology_text && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  {item.posology_text}
                </p>
              )}

              {/* Leaflet link */}
              <LeafletLink prescriptionItemId={item.id} drugId={item.selectedDrugId ?? item.drug_id} />
            </div>
          )
        })}
      </div>

      {error && <p className="text-red-600 text-xs mt-4">{error}</p>}

      <button
        onClick={handleConfirm}
        disabled={saving || items.length === 0}
        className="mt-6 w-full py-4 bg-green-600 text-white text-sm font-semibold rounded-2xl hover:bg-green-700 active:scale-[0.98] transition disabled:opacity-40 min-h-[44px]"
      >
        {saving ? pt.confirm.confirmingButton : pt.confirm.confirmButton}
      </button>
    </div>
  )
}

function LeafletLink({ drugId }: { prescriptionItemId: string; drugId: string | null }) {
  const [leafletUrl, setLeafletUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!drugId) return
    supabase
      .from('drugs')
      .select('leaflet_url')
      .eq('id', drugId)
      .single()
      .then(({ data }) => setLeafletUrl(data?.leaflet_url ?? null))
  }, [drugId])

  if (!leafletUrl) return null

  return (
    <a
      href={leafletUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-xs text-green-600 font-medium"
    >
      <ExternalLink size={12} />
      {pt.confirm.leafletLink}
    </a>
  )
}

function getDefaultTimes(timesPerDay: number): string[] {
  switch (timesPerDay) {
    case 1: return ['08:00']
    case 2: return ['08:00', '20:00']
    case 3: return ['08:00', '14:00', '20:00']
    default: return ['08:00']
  }
}
