import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type Drug = { id: string; name: string }

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function LogAdHocDosePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [drugName, setDrugName] = useState('')
  const [dosage, setDosage] = useState('')
  const [reason, setReason] = useState('')
  const [takenAt, setTakenAt] = useState(toLocalDatetimeValue(new Date()))
  const [suggestions, setSuggestions] = useState<Drug[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const drugInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (drugName.trim().length < 2) { setSuggestions([]); return }
    const controller = new AbortController()
    supabase
      .from('drugs')
      .select('id, name')
      .ilike('name', `%${drugName.trim()}%`)
      .limit(6)
      .then(({ data }) => {
        if (!controller.signal.aborted) setSuggestions(data ?? [])
      })
    return () => controller.abort()
  }, [drugName])

  async function handleSave() {
    if (!drugName.trim() || !user) return
    setSaving(true)
    const { error } = await supabase.from('ad_hoc_intakes').insert({
      user_id: user.id,
      drug_name: drugName.trim(),
      dosage: dosage.trim() || null,
      reason: reason.trim() || null,
      taken_at: new Date(takenAt).toISOString(),
    })
    setSaving(false)
    if (!error) {
      setDone(true)
      setTimeout(() => navigate('/box'), 1200)
    }
  }

  return (
    <div className="px-5 pt-8 pb-6">
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#192830] mb-1">
        Log a dose
      </h1>
      <p className="text-base text-[#73787b] mb-8">
        Record a medication you took outside your regular schedule.
      </p>

      <div className="space-y-4">
        {/* Drug name */}
        <div className="relative">
          <label className="block text-sm font-semibold text-[#43474a] mb-1.5">
            Medication name <span className="text-[#ba1a1a]">*</span>
          </label>
          <input
            ref={drugInputRef}
            type="text"
            value={drugName}
            onChange={e => { setDrugName(e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="e.g. Brufen 400 mg"
            className="w-full min-h-[48px] bg-white border border-[#c3c7ca] rounded-xl px-4 py-3 text-base text-[#1b1c1a] placeholder:text-[#9da2a5] focus:outline-none focus:border-[#49654d] transition"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-[#e9e8e4] rounded-xl shadow-lg overflow-hidden">
              {suggestions.map(d => (
                <li key={d.id}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 text-base text-[#1b1c1a] hover:bg-[#f4f4f0] active:bg-[#e9e8e4] transition"
                    onMouseDown={() => { setDrugName(d.name); setSuggestions([]); setShowSuggestions(false) }}
                  >
                    {d.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Dosage */}
        <div>
          <label className="block text-sm font-semibold text-[#43474a] mb-1.5">
            Dosage <span className="text-[#9da2a5] font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={dosage}
            onChange={e => setDosage(e.target.value)}
            placeholder="e.g. 1 tablet, 400 mg"
            className="w-full min-h-[48px] bg-white border border-[#c3c7ca] rounded-xl px-4 py-3 text-base text-[#1b1c1a] placeholder:text-[#9da2a5] focus:outline-none focus:border-[#49654d] transition"
          />
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-semibold text-[#43474a] mb-1.5">
            Reason <span className="text-[#9da2a5] font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. fever, headache, pain"
            className="w-full min-h-[48px] bg-white border border-[#c3c7ca] rounded-xl px-4 py-3 text-base text-[#1b1c1a] placeholder:text-[#9da2a5] focus:outline-none focus:border-[#49654d] transition"
          />
        </div>

        {/* Time taken */}
        <div>
          <label className="block text-sm font-semibold text-[#43474a] mb-1.5">
            When did you take it?
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={takenAt}
              onChange={e => setTakenAt(e.target.value)}
              className="w-full min-h-[48px] bg-white border border-[#c3c7ca] rounded-xl px-4 py-3 text-base text-[#1b1c1a] focus:outline-none focus:border-[#49654d] transition appearance-none"
            />
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#73787b] pointer-events-none" />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!drugName.trim() || saving || done}
        className="mt-8 w-full flex items-center justify-center gap-2 min-h-[48px] py-3 bg-[#49654d] text-white text-base font-semibold rounded-lg hover:opacity-[0.88] hover:-translate-y-px active:scale-[0.98] transition disabled:opacity-40 shadow-[0_4px_16px_rgba(73,101,77,0.16)]"
      >
        {done ? (
          <><Check size={18} /> Saved</>
        ) : saving ? (
          <><Loader2 size={18} className="animate-spin" /> Saving…</>
        ) : (
          'Save dose'
        )}
      </button>
    </div>
  )
}
