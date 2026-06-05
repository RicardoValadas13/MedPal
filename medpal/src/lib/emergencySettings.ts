import { useState, useEffect } from 'react'

const EVENT = 'emergency-settings-changed'

export function useEmergencySettings() {
  const [enabled, setEnabledState] = useState(
    () => localStorage.getItem('emergency_enabled') !== 'false'
  )
  const [caregiverNumber, setCaregiverNumberState] = useState(
    () => localStorage.getItem('caregiver_number') ?? ''
  )

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
  }

  return { enabled, setEnabled, caregiverNumber, setCaregiverNumber }
}
