import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from '../contexts/AuthContext'

const EVENT = 'emergency-settings-changed'

export function useEmergencySettings() {
  const { user } = useAuth()

  const [enabled, setEnabledState] = useState(
    () => localStorage.getItem('emergency_enabled') !== 'false'
  )
  const [caregiverNumber, setCaregiverNumberState] = useState(
    () => localStorage.getItem('caregiver_number') ?? ''
  )

  useEffect(() => {
    if (!user) return
    supabase
      .from('patient_profiles')
      .select('caregiver_contact_phone')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const phone = data?.caregiver_contact_phone ?? ''
        setCaregiverNumberState(phone)
        localStorage.setItem('caregiver_number', phone)
      })
  }, [user])

  useEffect(() => {
    function sync() {
      setEnabledState(localStorage.getItem('emergency_enabled') !== 'false')
      setCaregiverNumberState(localStorage.getItem('caregiver_number') ?? '')
    }
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [])

  function setEnabled(v: boolean) {
    localStorage.setItem('emergency_enabled', String(v))
    window.dispatchEvent(new Event(EVENT))
  }

  function setCaregiverNumber(v: string) {
    localStorage.setItem('caregiver_number', v)
    window.dispatchEvent(new Event(EVENT))

    if (!user) return
    void supabase
      .from('patient_profiles')
      .upsert({ id: user.id, caregiver_contact_phone: v }, { onConflict: 'id' })
  }

  return { enabled, setEnabled, caregiverNumber, setCaregiverNumber }
}
