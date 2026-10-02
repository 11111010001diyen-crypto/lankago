import { sriLankaPlaces } from '../data/sriLankaPlaces.js'

export function normalisePlaceSearchText(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function words(value) {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
}

function matchRank(place, query) {
  const normalisedQuery = normalisePlaceSearchText(query)
  const nameAndAliases = [place.name, ...place.aliases]
  if (nameAndAliases.some((candidate) => normalisePlaceSearchText(candidate) === normalisedQuery)) return 0
  if (normalisePlaceSearchText(place.name).startsWith(normalisedQuery)) return 1
  if (nameAndAliases.some((candidate) => words(candidate).some((word) => word.startsWith(normalisedQuery)))) return 2
  if (nameAndAliases.some((candidate) => normalisePlaceSearchText(candidate).includes(normalisedQuery))) return 3
  if (normalisePlaceSearchText(place.area) === normalisedQuery) return 4
  if (words(place.area).some((word) => word.startsWith(normalisedQuery))) return 5
  return normalisePlaceSearchText(place.area).includes(normalisedQuery) ? 6 : -1
}

export function searchLocalSriLankanPlaces(query, limit = 6) {
  return sriLankaPlaces.map((place) => ({ place, rank: matchRank(place, query) })).filter(({ rank }) => rank >= 0).sort((first, second) => first.rank - second.rank || first.place.name.localeCompare(second.place.name)).slice(0, limit).map(({ place }) => place)
}

export function formatExternalPlace(result) {
  const address = result.address || {}
  const name = result.name || result.display_name?.split(',')[0]?.trim()
  const area = address.suburb || address.city_district || address.city || address.town || address.village || address.county || address.state_district || 'Sri Lanka'
  const province = address.state || address.province || ''
  return { name, area, fullAddress: result.display_name || name, province, latitude: Number(result.lat), longitude: Number(result.lon), aliases: [] }
}