import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'
import type { IntakeEvent } from '../types/database'

const MOOD_EMOJIS = ['😞', '😕', '😐', '🙂', '😄']

interface TodayEvent extends IntakeEvent {
  medication_name?: string
}

export function CheckinPage() {
  const { user } = useAuth()
  const [mood, setMood] = useState<number | null>(null)
  const [sideEffects, setSideEffects] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [todayEvents, setTodayEvents] = useState<TodayEvent[]>([])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!user) return
    loadTodayEvents()
  }, [user])

  async function loadTodayEvents() {
    const today = new Date().toISOString().split('T')[0]
    const { data: events } = await supabase
      .from('intake_events')
      .select('*')
      .gte('scheduled_at', `${today}T00:00:00`)
      .lte('scheduled_at', `${today}T23:59:59`)
      .eq('status', 'pending')

    if (events) {
      const enriched: TodayEvent[] = await Promise.all(
        events.map(async (e) => {
          const { data: med } = await supabase
            .from('user_medications')
            .select('display_name')
            .eq('id', e.user_medication_id)
            .single()
          return { ...e, medication_name: med?.display_name }
        })
      )
      setTodayEvents(enriched)
    }
  }

  function toggleSideEffect(effect: string) {
    if (effect === pt.checkin.sideEffects[0]) {
      setSideEffects([effect])
      return
    }
    setSideEffects(prev =>
      prev.includes(effect)
        ? prev.filter(e => e !== effect)
        : [...prev.filter(e => e !== pt.checkin.sideEffects[0]), effect]
    )
  }

  async function markEventTaken(eventId: string) {
    await supabase
      .from('intake_events')
      .update({ status: 'taken', responded_at: new Date().toISOString() })
      .eq('id', eventId)
    setTodayEvents(prev => prev.filter(e => e.id !== eventId))
  }

  async function handleSubmit() {
    if (!user) return
    setSaving(true)

    await supabase.from('checkins').insert({
      user_id: user.id,
      recorded_at: new Date().toISOString(),
      mood,
      symptoms: [],
      side_effects: sideEffects,
      notes: notes || null,
    })

    setSaving(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-5 text-center">
        <div className="w-20 h-20 bg-[#cbebcd] rounded-full flex items-center justify-center mb-5">
          <Check size={32} className="text-[#49654d]" />
        </div>
        <p className="text-2xl font-semibold text-[#192830]">{pt.checkin.successMessage}</p>
      </div>
    )
  }

  return (
    <div className="px-5 pt-8 pb-6 space-y-8">
      {/* Mood */}
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#192830] mb-5">{pt.checkin.title}</h1>
        <div className="flex justify-between gap-2">
          {MOOD_EMOJIS.map((emoji, i) => (
            <button
              key={i}
              onClick={() => setMood(i + 1)}
              className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-2xl border-[1.5px] transition min-h-[48px] ${
                mood === i + 1
                  ? 'border-[#49654d] bg-[#cbebcd]/40'
                  : 'border-[#c3c7ca] bg-white hover:bg-[#f4f4f0]'
              }`}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-sm font-medium text-[#43474a] text-center leading-tight">
                {pt.checkin.moods[i]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Today's medications */}
      {todayEvents.length > 0 && (
        <div>
          <p className="text-lg font-semibold text-[#1b1c1a] mb-3">{pt.checkin.medicationQuestion}</p>
          <div className="space-y-3">
            {todayEvents.map(event => (
              <div
                key={event.id}
                className="flex items-center justify-between bg-white rounded-2xl border border-[#c3c7ca] border-l-4 border-l-[#c3c7ca] px-5 py-4"
              >
                <div>
                  <p className="text-lg font-semibold text-[#1b1c1a]">{event.medication_name}</p>
                  <p className="text-sm font-medium text-[#43474a]">
                    {new Date(event.scheduled_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => markEventTaken(event.id)}
                  className="px-5 py-2.5 bg-[#49654d] text-white text-base font-semibold rounded-lg min-h-[48px] hover:opacity-[0.88] transition"
                >
                  {pt.checkin.takenButton}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Side effects */}
      <div>
        <p className="text-lg font-semibold text-[#1b1c1a] mb-3">{pt.checkin.sideEffectsQuestion}</p>
        <div className="flex flex-wrap gap-2">
          {pt.checkin.sideEffects.map(effect => (
            <button
              key={effect}
              onClick={() => toggleSideEffect(effect)}
              className={`px-5 py-3 text-base font-semibold rounded-lg border-[1.5px] transition min-h-[48px] ${
                sideEffects.includes(effect)
                  ? 'bg-[#192830] text-white border-[#192830]'
                  : 'bg-white text-[#1b1c1a] border-[#c3c7ca] hover:bg-[#f4f4f0]'
              }`}
            >
              {effect}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={pt.checkin.notesPlaceholder}
          rows={3}
          className="w-full px-4 py-3 text-lg rounded-lg border-[1.5px] border-[#c3c7ca] bg-white text-[#1b1c1a] placeholder:text-[#73787b] focus:outline-none focus:border-[#49654d] focus:shadow-[0_0_0_3px_rgba(73,101,77,0.12)] resize-none transition"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full min-h-[48px] py-3 bg-[#192830] text-white text-base font-semibold rounded-lg hover:opacity-[0.88] hover:-translate-y-px active:scale-[0.98] transition disabled:opacity-40 shadow-[0_4px_16px_rgba(25,40,48,0.12)]"
      >
        {saving ? pt.checkin.submittingButton : pt.checkin.submitButton}
      </button>
    </div>
  )
}
