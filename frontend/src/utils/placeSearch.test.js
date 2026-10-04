import { strict as assert } from 'node:assert'
import instantIndex from '../data/sriLankaPlacesIndex.json' with { type: 'json' }
import fullIndex from '../../../shared/sriLankaPlaces.json' with { type: 'json' }
import { getTrainStationPlace } from '../data/sriLankaPlaces.js'
import { searchPlaceIndex } from './placeSearch.js'

const expected = [['colombo 13', 'Kotahena'], ['Nayakakanda', 'Nayakakanda'], ['Elakanda', 'Elakanda Jct.'], ['Kandana', 'Kandana'], ['Kandy', 'Kandy'], ['Matale', 'Matale'], ['Galle', 'Galle'], ['Matara', 'Matara'], ['Hambantota', 'Hambantota'], ['Nallur', 'Nallur'], ['Kokuvil', 'Kokkuvil'], ['Thirunelveli', 'Thirunelvely'], ['Point Pedro', 'Point Pedro'], ['Kilinochchi', 'Kilinochchi'], ['Mannar', 'Mannar'], ['Vavuniya', 'Vavuniya'], ['Mullaitivu', 'Mullaitivu'], ['Trincomalee', 'Trincomalee'], ['Batticaloa', 'Batticaloa'], ['Kalmunai', 'Kalmunai'], ['Ampara', 'Ampara'], ['Kurunegala', 'Kurunegala'], ['Puttalam', 'Puttalam'], ['Chilaw', 'Chilaw'], ['Anuradhapura', 'Anuradhapura'], ['Polonnaruwa', 'Polonnaruwa'], ['Badulla', 'Badulla'], ['Ella', 'Ella'], ['Monaragala', 'Moneragala'], ['Ratnapura', 'Ratnapura'], ['Kegalle', 'Kegalle']]

function searchInRealOrder(query) {
  const instant = searchPlaceIndex(instantIndex, query, 3)
  return instant.length ? { stage: 'instant', results: instant } : { stage: 'backend-full-index', results: searchPlaceIndex(fullIndex.filter((place) => place.type !== 'railway_station'), query, 3) }
}

const station = getTrainStationPlace('Colombo Fort')
assert.ok(station && Number.isFinite(station.latitude) && Number.isFinite(station.longitude))
assert.ok(instantIndex.length && fullIndex.length, 'Run the cache-only index builder before this test.')
expected.forEach(([query, expectedName]) => {
  const { results } = searchInRealOrder(query)
  const names = results.map((place) => place.name)
  assert.ok(names.includes(expectedName), `${query} should return ${expectedName} in its first three results; got ${names.join(', ') || '(nothing)'}`)
})
const multilingual = fullIndex.find((place) => place.name_si || place.name_ta)
assert.ok(multilingual)
assert.equal(searchInRealOrder(multilingual.name_si || multilingual.name_ta).results[0].name, multilingual.name)
assert.equal(searchInRealOrder('Roar Fitness Elakanda').results.length, 0, 'Roar Fitness Elakanda must remain a Pick on map case.')
console.log('Instant-first and backend-full-index Sri Lanka place search assertions passed.')