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

        const posology = item.posology_structured as {
          times_per_day?: number | null
        } | null

        for (const time of getDefaultTimes(posology?.times_per_day ?? 1)) {
          await supabase.from('schedules').insert({
            user_medication_id: med.id,
            time_of_day: time,
            days_of_week: [0, 1, 2, 3, 4, 5, 6],
            dose_amount: null,
            dose_unit: null,
            with_food: false,
          })
        }

        if (drugId !== item.drug_id) {
          await supabase
            .from('prescription_items')
            .update({ drug_id: drugId, match_status: 'manual' })
            .eq('id', item.id)
        }
      }

      await supabase.from('prescriptions').update({ status: 'confirmed' }).eq('id', id)
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
        <p className="text-lg text-[#43474a]">{pt.common.loading}</p>
      </div>
    )
  }

  return (
    <div className="px-5 pt-8 pb-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-base font-medium text-[#43474a] mb-6 min-h-[48px]"
      >
        <ChevronLeft size={18} />
        {pt.common.back}
      </button>

      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#192830]">{pt.confirm.title}</h1>
      <p className="text-lg text-[#43474a] mt-2 mb-8">{pt.confirm.subtitle}</p>

      <div className="space-y-4">
        {items.map((item, index) => {
          const isMatched = item.match_status === 'matched'
          const isAmbiguous = item.match_status === 'ambiguous'
          const isUnmatched = item.match_status === 'unmatched' || item.match_status === 'manual'
          const confidenceFlags = item.field_confidences as Record<string, number> | null

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border border-[#c3c7ca] p-6 space-y-4 transition hover:shadow-[0_8px_32px_rgba(25,40,48,0.08)] ${
                isMatched ? 'border-l-4 border-l-[#49654d]' :
                isAmbiguous ? 'border-l-4 border-l-[#f3896d]' :
                'border-l-4 border-l-[#c3c7ca]'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-[#1b1c1a]">{item.extracted_name}</p>
                  {item.extracted_form && (
                    <p className="text-sm font-medium text-[#43474a] mt-0.5">{item.extracted_form}</p>
                  )}
                </div>
                {isMatched && (
                  <span className="shrink-0 inline-flex items-center gap-1.5 bg-[#cbebcd] text-[#49654d] text-sm font-semibold px-3 py-1 rounded-full">
                    <CheckCircle size={14} />
                    {pt.confirm.matchedChip}
                  </span>
                )}
                {isAmbiguous && (
                  <span className="shrink-0 inline-flex items-center gap-1.5 bg-[#ffdad6] text-[#93000a] text-sm font-semibold px-3 py-1 rounded-full">
                    <AlertTriangle size={14} />
                    {pt.confirm.reviewChip}
                  </span>
                )}
                {isUnmatched && (
                  <span className="shrink-0 inline-flex items-center gap-1.5 bg-[#e9e8e4] text-[#43474a] text-sm font-semibold px-3 py-1 rounded-full">
                    {pt.confirm.unmatchedChip}
                  </span>
                )}
              </div>

              {/* Ambiguous: drug selector */}
              {isAmbiguous && item.candidates && item.candidates.length > 0 && (
                <select
                  value={item.selectedDrugId ?? ''}
                  onChange={e => updateItem(index, { selectedDrugId: e.target.value || null })}
                  className="w-full min-h-[48px] text-lg px-4 py-2.5 rounded-lg border-[1.5px] border-[#f3896d] bg-[#ffdad6]/30 text-[#1b1c1a] focus:outline-none focus:border-[#49654d] focus:shadow-[0_0_0_3px_rgba(73,101,77,0.12)] transition"
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#43474a] mb-1.5 uppercase tracking-[0.05em]">
                    {pt.confirm.dosageLabel}
                    {confidenceFlags?.extracted_dosage != null && confidenceFlags.extracted_dosage < 0.8 && (
                      <span className="ml-1 text-[#f3896d]">⚠</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={item.extracted_dosage ?? ''}
                    onChange={e => updateItem(index, { extracted_dosage: e.target.value || null })}
                    className="w-full min-h-[48px] px-4 py-2.5 text-lg rounded-lg border-[1.5px] border-[#c3c7ca] bg-white text-[#1b1c1a] focus:outline-none focus:border-[#49654d] focus:shadow-[0_0_0_3px_rgba(73,101,77,0.12)] transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#43474a] mb-1.5 uppercase tracking-[0.05em]">
                    {pt.confirm.quantityLabel}
                    {confidenceFlags?.quantity != null && confidenceFlags.quantity < 0.8 && (
                      <span className="ml-1 text-[#f3896d]">⚠</span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={item.quantity ?? ''}
                    onChange={e => updateItem(index, { quantity: e.target.value ? Number(e.target.value) : null })}
                    className="w-full min-h-[48px] px-4 py-2.5 text-lg rounded-lg border-[1.5px] border-[#c3c7ca] bg-white text-[#1b1c1a] focus:outline-none focus:border-[#49654d] focus:shadow-[0_0_0_3px_rgba(73,101,77,0.12)] transition"
                  />
                </div>
              </div>

              {/* Posology */}
              {item.posology_text && (
                <p className="text-base text-[#43474a] bg-[#f4f4f0] rounded-lg px-4 py-3">
                  {item.posology_text}
                </p>
              )}

              {/* Leaflet link */}
              <LeafletLink prescriptionItemId={item.id} drugId={item.selectedDrugId ?? item.drug_id} />
            </div>
          )
        })}
      </div>

      {error && <p className="text-[#ba1a1a] text-base mt-4">{error}</p>}

      <button
        onClick={handleConfirm}
        disabled={saving || items.length === 0}
        className="mt-8 w-full min-h-[48px] py-3 bg-[#49654d] text-white text-base font-semibold rounded-lg hover:opacity-[0.88] hover:-translate-y-px active:scale-[0.98] transition disabled:opacity-40 shadow-[0_4px_16px_rgba(25,40,48,0.12)]"
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
      className="inline-flex items-center gap-1.5 text-base font-semibold text-[#49654d] hover:opacity-75 transition"
    >
      <ExternalLink size={16} />
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
