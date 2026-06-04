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
      // Fetch medication names separately to avoid join typing complexity
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
      mood: mood,
      symptoms: [],
      side_effects: sideEffects,
      notes: notes || null,
    })

    setSaving(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check size={28} className="text-green-600" />
        </div>
        <p className="font-semibold text-gray-900">{pt.checkin.successMessage}</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      {/* Mood */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-4">{pt.checkin.title}</h1>
        <div className="flex justify-between gap-2">
          {MOOD_EMOJIS.map((emoji, i) => (
            <button
              key={i}
              onClick={() => setMood(i + 1)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border-[0.5px] transition min-h-[44px] ${
                mood === i + 1
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-[10px] text-gray-500 text-center leading-tight">
                {pt.checkin.moods[i]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Today's medications */}
      {todayEvents.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">{pt.checkin.medicationQuestion}</p>
          <div className="space-y-2">
            {todayEvents.map(event => (
              <div
                key={event.id}
                className="flex items-center justify-between bg-white rounded-2xl border-[0.5px] border-gray-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{event.medication_name}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(event.scheduled_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => markEventTaken(event.id)}
                  className="px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-xl min-h-[44px]"
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
        <p className="text-sm font-semibold text-gray-700 mb-3">{pt.checkin.sideEffectsQuestion}</p>
        <div className="flex flex-wrap gap-2">
          {pt.checkin.sideEffects.map(effect => (
            <button
              key={effect}
              onClick={() => toggleSideEffect(effect)}
              className={`px-4 py-2.5 text-sm rounded-xl border transition min-h-[44px] ${
                sideEffects.includes(effect)
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-200'
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
          className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full py-4 bg-green-600 text-white text-sm font-semibold rounded-2xl hover:bg-green-700 active:scale-[0.98] transition disabled:opacity-40 min-h-[44px]"
      >
        {saving ? pt.checkin.submittingButton : pt.checkin.submitButton}
      </button>
    </div>
  )
}
