import type { Coords } from './location'

// Nearby pharmacies/doctors via the Overpass API (OpenStreetMap).
// No API key, completely free.

export type NearbyPlace = {
  name: string
  phone: string | null
  address: string | null
  openingHours: string | null
  distanceKm: number
  lat: number
  lng: number
}

export type NearbyResults = {
  pharmacy: NearbyPlace | null
  doctor: NearbyPlace | null
}

type OverpassNode = {
  lat: number
  lon: number
  tags?: Record<string, string>
}

function haversineKm(a: Coords, b: Coords): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

function toPlace(node: OverpassNode, origin: Coords): NearbyPlace | null {
  const tags = node.tags ?? {}
  if (!tags.name) return null
  const street = tags['addr:street']
  return {
    name: tags.name,
    phone: tags.phone ?? tags['contact:phone'] ?? null,
    address: street
      ? `${street}${tags['addr:housenumber'] ? ` ${tags['addr:housenumber']}` : ''}`
      : null,
    openingHours: tags.opening_hours ?? null,
    distanceKm: haversineKm(origin, { lat: node.lat, lng: node.lon }),
    lat: node.lat,
    lng: node.lon,
  }
}

async function queryOverpass(origin: Coords, radiusM: number): Promise<OverpassNode[]> {
  // One request for both amenities — kinder to the public Overpass API
  const query =
    `[out:json][timeout:10];(` +
    `node["amenity"="pharmacy"](around:${radiusM},${origin.lat},${origin.lng});` +
    `node["amenity"="doctors"](around:${radiusM},${origin.lat},${origin.lng});` +
    `);out body;`
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`

  // The public endpoint occasionally rate-limits (429/406); one retry
  // after a short pause covers the transient cases.
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url)
    if (res.ok) {
      const data = (await res.json()) as { elements?: OverpassNode[] }
      return data.elements ?? []
    }
    if (attempt >= 1) throw new Error(`Overpass error ${res.status}`)
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
}

function nearest(
  nodes: OverpassNode[],
  origin: Coords,
  amenity: string
): NearbyPlace | null {
  return (
    nodes
      .filter(n => n.tags?.amenity === amenity)
      .map(n => toPlace(n, origin))
      .filter((p): p is NearbyPlace => p !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm)[0] ?? null
  )
}

/**
 * Nearest pharmacy and doctor within 2 km of the patient, expanding to
 * 5 km for whichever type has no hit.
 */
export async function findNearbyProfessionals(origin: Coords): Promise<NearbyResults> {
  let nodes = await queryOverpass(origin, 2000)
  let pharmacy = nearest(nodes, origin, 'pharmacy')
  let doctor = nearest(nodes, origin, 'doctors')

  if (!pharmacy || !doctor) {
    nodes = await queryOverpass(origin, 5000)
    pharmacy = pharmacy ?? nearest(nodes, origin, 'pharmacy')
    doctor = doctor ?? nearest(nodes, origin, 'doctors')
  }
  return { pharmacy, doctor }
}
