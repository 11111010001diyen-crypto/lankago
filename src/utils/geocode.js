const nominatimSearchUrl = 'https://nominatim.openstreetmap.org/search'

export async function searchSriLankanPlaces(query, signal) {
  const parameters = new URLSearchParams({ format: 'json', addressdetails: '1', countrycodes: 'lk', limit: '5', q: query.trim() })
  const response = await fetch(`${nominatimSearchUrl}?${parameters}`, { signal })
  if (!response.ok) throw new Error('PLACE_SEARCH_FAILED')
  const results = await response.json()
  if (!Array.isArray(results)) throw new Error('PLACE_SEARCH_FAILED')
  return results.map((result) => ({ label: result.display_name, latitude: Number(result.lat), longitude: Number(result.lon), province: result.address?.state || result.address?.province || '' })).filter((place) => place.label && Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
}