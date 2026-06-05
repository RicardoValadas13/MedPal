import { MapPin, Phone, Search } from 'lucide-react'
import type { NearbyPlace, NearbyResults } from '../lib/nearbyPlaces'

export type NearbyState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; results: NearbyResults }
  | { status: 'error' }

const STRINGS = {
  en: {
    title: '💊 Want to be sure? Talk to a professional',
    loading: '🔍 Finding nearby professionals...',
    noPhone: 'No phone number available',
    noResults: 'No results nearby — search on map',
    callNow: 'Call now',
    viewMap: 'View on map',
    searchMap: 'Search on OpenStreetMap',
  },
  pt: {
    title: '💊 Quer ter a certeza? Fale com um profissional',
    loading: '🔍 A encontrar profissionais próximos...',
    noPhone: 'Número não disponível',
    noResults: 'Sem resultados — pesquisar no mapa',
    callNow: 'Ligar agora',
    viewMap: 'Ver no mapa',
    searchMap: 'Pesquisar no OpenStreetMap',
  },
}

export function CallProfessionalCard({
  state,
  lang,
  searchAddress,
}: {
  state: NearbyState
  lang: 'en' | 'pt'
  searchAddress: string | null
}) {
  if (state.status === 'idle') return null
  const t = STRINGS[lang]

  const empty =
    state.status === 'error' ||
    (state.status === 'ready' && !state.results.pharmacy && !state.results.doctor)

  return (
    <div className="animate-fade-in mt-2 max-w-[85%] rounded-2xl border border-[#c3c7ca]/60 bg-white overflow-hidden">
      <p className="px-4 py-3 text-sm font-bold text-[#192830] bg-[#cbebcd]/40 border-b border-[#c3c7ca]/40">
        {t.title}
      </p>

      {state.status === 'loading' && (
        <p className="px-4 py-4 text-sm font-medium text-[#73787b]">{t.loading}</p>
      )}

      {empty && (
        <a
          href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(
            `pharmacy near ${searchAddress ?? ''}`.trim()
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-4 text-sm font-semibold text-[#49654d] hover:bg-[#f4f4f0] transition"
        >
          <Search size={18} aria-hidden />
          {t.noResults}
        </a>
      )}

      {state.status === 'ready' && state.results.pharmacy && (
        <PlaceRow place={state.results.pharmacy} icon="📍" t={t} />
      )}
      {state.status === 'ready' && state.results.doctor && (
        <PlaceRow place={state.results.doctor} icon="👨‍⚕️" t={t} />
      )}
    </div>
  )
}

function PlaceRow({
  place,
  icon,
  t,
}: {
  place: NearbyPlace
  icon: string
  t: (typeof STRINGS)['en']
}) {
  return (
    <div className="px-4 py-3 border-t border-[#efeeea] first:border-t-0">
      <p className="text-[15px] font-semibold text-[#192830]">
        {icon} {place.name}{' '}
        <span className="font-medium text-[#73787b]">· {place.distanceKm.toFixed(1)}km</span>
      </p>
      <p className="text-sm text-[#43474a] mt-0.5">
        {place.address ? `${place.address} · ` : ''}
        {place.phone ?? t.noPhone}
        {place.openingHours ? ` · ${place.openingHours}` : ''}
      </p>
      <div className="flex gap-2 mt-2.5">
        {place.phone && (
          <a
            href={`tel:${place.phone.replace(/\s/g, '')}`}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-[#49654d] text-white text-sm font-semibold hover:opacity-[0.88] active:scale-[0.98] transition"
          >
            <Phone size={16} aria-hidden />
            {t.callNow}
          </a>
        )}
        <a
          href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}&zoom=16`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-[#efeeea] text-[#192830] text-sm font-semibold hover:bg-[#e9e8e4] active:scale-[0.98] transition"
        >
          <MapPin size={16} aria-hidden />
          {t.viewMap}
        </a>
      </div>
    </div>
  )
}
