import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Loader2, ImageOff, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { pollGif } from '../lib/gif'
import type { UserMedication } from '../types/database'

const POLL_INTERVAL_MS = 3000
const MAX_ATTEMPTS = 80 // ~4 minutes

type State =
  | { phase: 'loading' }
  | { phase: 'no-guide' }
  | { phase: 'generating' }
  | { phase: 'ready'; url: string }
  | { phase: 'error'; message: string }

export function MedicationGuidePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [med, setMed] = useState<UserMedication | null>(null)
  const [state, setState] = useState<State>({ phase: 'loading' })
  const cancelled = useRef(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    cancelled.current = false
    let attempts = 0

    async function run() {
      const { data, error } = await supabase
        .from('user_medications')
        .select('*')
        .eq('id', id!)
        .single()

      if (cancelled.current) return
      if (error || !data) {
        setState({ phase: 'error', message: 'Medication not found.' })
        return
      }
      const m = data as UserMedication
      setMed(m)

      const action = m.description?.trim()
      if (!action) {
        setState({ phase: 'no-guide' })
        return
      }

      setState({ phase: 'generating' })

      while (!cancelled.current && attempts < MAX_ATTEMPTS) {
        attempts++
        const res = await pollGif(action)
        if (cancelled.current) return
        if (res.status === 'done') {
          setState({ phase: 'ready', url: res.url })
          return
        }
        if (res.status === 'error') {
          setState({ phase: 'error', message: res.error })
          return
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      }
      if (!cancelled.current) {
        setState({ phase: 'error', message: 'Taking longer than expected. Please try again.' })
      }
    }

    run()
    return () => { cancelled.current = true }
  }, [id, retryKey])

  return (
    <div className="px-5 pt-6 pb-24">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm font-semibold text-[#73787b] mb-5 min-h-[44px]"
      >
        <ChevronLeft size={18} /> Back
      </button>

      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#192830]">
        {med?.display_name ?? 'Visual guide'}
      </h1>
      {med?.dosage && <p className="text-base text-[#73787b] mt-1">{med.dosage}</p>}

      {med?.description && (
        <div className="mt-5 bg-white border border-[#e9e8e4] rounded-2xl px-5 py-4">
          <p className="text-xs font-bold text-[#43474a] uppercase tracking-widest mb-2">How to take it</p>
          <p className="text-sm text-[#192830] leading-relaxed">{med.description}</p>
        </div>
      )}

      <div className="mt-5">
        {state.phase === 'loading' && (
          <CenterBox><Loader2 size={28} className="animate-spin text-[#49654d]" /></CenterBox>
        )}

        {state.phase === 'no-guide' && (
          <CenterBox>
            <ImageOff size={32} className="text-[#c3c7ca]" />
            <p className="text-sm text-[#73787b] mt-3 text-center">
              No visual guide is available for this medication.
            </p>
          </CenterBox>
        )}

        {state.phase === 'generating' && (
          <CenterBox>
            <Loader2 size={32} className="animate-spin text-[#49654d]" />
            <p className="text-sm font-semibold text-[#192830] mt-4">Creating your visual guide…</p>
            <p className="text-xs text-[#73787b] mt-1 text-center">This can take a minute the first time.</p>
          </CenterBox>
        )}

        {state.phase === 'ready' && (
          <div className="rounded-2xl overflow-hidden border border-[#e9e8e4] bg-white">
            <img src={state.url} alt={`Visual guide for ${med?.display_name ?? ''}`} className="w-full block" />
          </div>
        )}

        {state.phase === 'error' && (
          <CenterBox>
            <ImageOff size={32} className="text-[#ba1a1a]" />
            <p className="text-sm text-[#ba1a1a] mt-3 text-center">{state.message}</p>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="mt-4 flex items-center gap-2 px-4 min-h-[44px] rounded-xl bg-[#192830] text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition"
            >
              <RefreshCw size={15} /> Try again
            </button>
          </CenterBox>
        )}
      </div>
    </div>
  )
}

function CenterBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center bg-[#f4f4f0] rounded-2xl px-6 py-14">
      {children}
    </div>
  )
}
