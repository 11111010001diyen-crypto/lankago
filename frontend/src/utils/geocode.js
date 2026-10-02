import { api } from '../services/api'
import { formatExternalPlace } from './placeSearch'

export async function searchSriLankanPlaces(query, signal) {
  const parameters = new URLSearchParams({ q: query.trim() })
  const response = await api(`/api/places/search?${parameters}`, { signal })
  if (!Array.isArray(response)) throw new Error('PLACE_SEARCH_FAILED')
  return response.map(formatExternalPlace).filter((place) => place.name && Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
}