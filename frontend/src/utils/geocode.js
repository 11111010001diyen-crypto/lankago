import { api } from '../services/api'

function validPlace(place) {
  return place && place.name && Number.isFinite(Number(place.latitude)) && Number.isFinite(Number(place.longitude))
}

function toPlace(place) {
  return { ...place, latitude: Number(place.latitude), longitude: Number(place.longitude), area: place.area || place.district || place.province || 'Sri Lanka', fullAddress: place.fullAddress || place.name }
}

export async function searchSriLankanPlaces(query, signal) {
  const response = await api(`/api/places/search?${new URLSearchParams({ q: query.trim() })}`, { signal })
  if (!Array.isArray(response)) throw new Error('PLACE_SEARCH_FAILED')
  return response.filter(validPlace).map(toPlace)
}

export async function reverseSriLankanPlace(latitude, longitude, signal) {
  const response = await api(`/api/places/reverse?${new URLSearchParams({ lat: latitude, lon: longitude })}`, { signal })
  if (!validPlace(response)) throw new Error('PLACE_REVERSE_FAILED')
  return toPlace(response)
}