import { strict as assert } from 'node:assert'
import { getTrainStationPlace, sriLankaPlaces } from '../data/sriLankaPlaces.js'
import { searchLocalSriLankanPlaces } from './placeSearch.js'

const kandy = searchLocalSriLankanPlaces('kan')[0]
const nuwaraEliya = searchLocalSriLankanPlaces('nuwaraeliya')[0]
const station = getTrainStationPlace('Colombo Fort')

assert.equal(kandy.name, 'Kandy')
assert.equal(nuwaraEliya.name, 'Nuwara Eliya')
assert.ok(station && Number.isFinite(station.latitude) && Number.isFinite(station.longitude))
assert.ok(sriLankaPlaces.length >= 150)
console.log('Local Sri Lanka place search assertions passed.')