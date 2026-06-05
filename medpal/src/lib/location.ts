// Patient location helpers for the "Call a Professional" card.
// Privacy rule: coordinates live in React state only — never persisted.

export type Coords = { lat: number; lng: number }

/** Browser geolocation as a promise; resolves null on denial/timeout. */
export function getBrowserLocation(timeoutMs = 8000): Promise<Coords | null> {
  return new Promise(resolve => {
    if (!('geolocation' in navigator)) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 600_000 }
    )
  })
}

/** Free geocoding via Nominatim (OpenStreetMap). */
export async function geocodeAddress(address: string): Promise<Coords | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return null
    const data = (await res.json()) as Array<{ lat: string; lon: string }>
    const hit = data?.[0]
    return hit ? { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) } : null
  } catch {
    return null
  }
}

/**
 * Browser geolocation first; falls back to geocoding the patient
 * profile address when permission is denied or unavailable.
 */
export async function resolvePatientLocation(address: string | null): Promise<Coords | null> {
  const browser = await getBrowserLocation()
  if (browser) return browser
  if (address?.trim()) return geocodeAddress(address)
  return null
}
