import { cityCoordinates, normaliseCityName } from '../data/cityCoordinates.js'
import { allTrainStations } from '../data/trainStations.js'

const modeProfiles = {
  train: { averageSpeedKmh: 60, baseFare: 30, ratePerKm: 2.5, routeMultiplier: 1.18, co2GramsPerKm: 41 },
  bus: { averageSpeedKmh: 35, baseFare: 40, ratePerKm: 3.5, routeMultiplier: 1.28, co2GramsPerKm: 68 },
  car: { averageSpeedKmh: 50, baseFare: 300, ratePerKm: 28, routeMultiplier: 1.28, co2GramsPerKm: 171 },
  'three-wheel': { averageSpeedKmh: 30, baseFare: 150, ratePerKm: 10, routeMultiplier: 1.28, co2GramsPerKm: 90 },
}

const trafficLevels = { 'Morning peak': 'High', Midday: 'Medium', 'Evening peak': 'High', Night: 'Low' }
const trafficMultipliers = { High: 1.6, Medium: 1.25, Low: 1 }
const surgeEligibleModes = new Set(['car', 'three-wheel'])
const toRadians = (degrees) => degrees * (Math.PI / 180)

export const busSubTypes = {
  'CTB (Government)': { fareMultiplier: 1.0, label: 'CTB Bus' },
  'Private Intercity A/C': { fareMultiplier: 1.6, label: 'Private A/C Bus' },
  'Metro/City Bus': { fareMultiplier: 1.15, label: 'Metro Bus' },
}

export const trainClasses = {
  'Third Class': { fareMultiplier: 1.0, label: '3rd Class' },
  'Second Class': { fareMultiplier: 1.8, label: '2nd Class' },
  'First Class': { fareMultiplier: 3.0, label: '1st Class' },
}

function getCoordinates(place, fallbackName) {
  if (place && typeof place === 'object' && Number.isFinite(place.latitude) && Number.isFinite(place.longitude)) return place
  const cityName = typeof place === 'string' ? place : fallbackName
  return cityCoordinates[normaliseCityName(cityName)] || null
}

export function getDistanceKm(fromPlace, toPlace, fromName, toName) {
  const from = getCoordinates(fromPlace, fromName)
  const to = getCoordinates(toPlace, toName)
  if (!from || !to) return 0
  const latitudeDifference = toRadians(to.latitude - from.latitude)
  const longitudeDifference = toRadians(to.longitude - from.longitude)
  const haversine = Math.sin(latitudeDifference / 2) ** 2 + Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(longitudeDifference / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function normalise(value, min, max) {
  return max === min ? 0 : (value - min) / (max - min)
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isTrainStationLocation(place, placeName) {
  const locationText = [placeName, place?.label].filter(Boolean).join(', ').toLowerCase()
  return allTrainStations.some((station) => new RegExp(`(?:^|[^a-z0-9])${escapeRegularExpression(station.toLowerCase())}(?=$|[^a-z0-9])`).test(locationText))
}

export function getRecommendations(modes, search) {
  const directDistanceKm = getDistanceKm(search.fromPlace, search.toPlace, search.from, search.to)
  const trafficLevel = trafficLevels[search.departureTime] || 'Medium'
  const passengers = Math.max(1, Number.parseInt(search.passengers, 10) || 1)
  const hasTrainService = isTrainStationLocation(search.fromPlace, search.from) && isTrainStationLocation(search.toPlace, search.to)
  const alwaysAvailableModes = modes.filter((mode) => ['bus', 'car', 'three-wheel'].includes(mode.id))
  const trainMode = modes.find((mode) => mode.id === 'train')
  const availableModes = hasTrainService && trainMode ? [trainMode, ...alwaysAvailableModes] : alwaysAvailableModes
  const options = availableModes.map((mode) => {
    const profile = modeProfiles[mode.id]
    const routeDistanceKm = directDistanceKm * profile.routeMultiplier
    const baseDurationMins = Math.round((routeDistanceKm / profile.averageSpeedKmh) * 60)
    const roadDurationMultiplier = trafficMultipliers[trafficLevel] * (search.weather === 'Rainy' ? 1.15 : 1)
    const adjustedDuration = mode.id === 'train' ? baseDurationMins : Math.round(baseDurationMins * roadDurationMultiplier)
    const basePrice = profile.baseFare + (routeDistanceKm * profile.ratePerKm)
    const peakMultiplier = ['Morning peak', 'Evening peak'].includes(search.departureTime) ? 1.3 : 1
    const weatherMultiplier = search.weather === 'Rainy' ? 1.2 : 1
    const surgeMultiplier = surgeEligibleModes.has(mode.id) ? peakMultiplier * weatherMultiplier : 1
    const subOption = mode.id === 'bus' ? (busSubTypes[search.busSubType] || busSubTypes['CTB (Government)']) : mode.id === 'train' ? (trainClasses[search.trainClass] || trainClasses['Third Class']) : null
    const price = Math.round(basePrice * surgeMultiplier * (subOption?.fareMultiplier || 1))
    const effectiveCostPerPerson = surgeEligibleModes.has(mode.id) ? price / passengers : price
    return { ...mode, distanceKm: Math.round(routeDistanceKm), baseDurationMins, adjustedDuration, price, effectiveCostPerPerson, estimatedCo2Kg: (routeDistanceKm * profile.co2GramsPerKm) / 1000, trafficLevel: mode.id === 'train' ? 'Low' : trafficLevel, subOptionLabel: subOption?.label || '', subOptionKey: subOption ? (mode.id === 'bus' ? (busSubTypes[search.busSubType] ? search.busSubType : 'CTB (Government)') : (trainClasses[search.trainClass] ? search.trainClass : 'Third Class')) : '' }
  })
  const lowestCo2Kg = Math.min(...options.map((option) => option.estimatedCo2Kg))
  const effectiveCosts = options.map((option) => option.effectiveCostPerPerson)
  const durations = options.map((option) => option.adjustedDuration)
  const minEffectiveCost = Math.min(...effectiveCosts)
  const maxEffectiveCost = Math.max(...effectiveCosts)
  const minDuration = Math.min(...durations)
  const maxDuration = Math.max(...durations)
  const scored = options.map((option) => ({ ...option, efficiencyScore: (normalise(option.effectiveCostPerPerson, minEffectiveCost, maxEffectiveCost) * 0.5) + (normalise(option.adjustedDuration, minDuration, maxDuration) * 0.5) }))
  const recommended = scored.reduce((best, option) => option.efficiencyScore < best.efficiencyScore ? option : best)
  const fastest = scored.reduce((best, option) => option.adjustedDuration < best.adjustedDuration ? option : best)
  const cheapest = scored.reduce((best, option) => option.effectiveCostPerPerson < best.effectiveCostPerPerson ? option : best)
  const alternatives = scored.filter((option) => option.id !== recommended.id)
  const fastestAlternative = fastest.id === recommended.id ? alternatives.reduce((best, option) => option.adjustedDuration < best.adjustedDuration ? option : best, alternatives[0]) : fastest
  const cheapestAlternative = cheapest.id === recommended.id ? alternatives.reduce((best, option) => option.effectiveCostPerPerson < best.effectiveCostPerPerson ? option : best, alternatives[0]) : cheapest
  const timeDifference = Math.abs(recommended.adjustedDuration - fastestAlternative.adjustedDuration)
  const groupBasis = passengers > 1 ? ` This is based on a per-person cost for your group of ${passengers}.` : ''
  let explanation
  if (recommended.id === cheapest.id && recommended.id !== fastest.id) explanation = `${recommended.name} is our smart pick: it has the lowest per-person cost and is only ${timeDifference} min slower than the fastest ${fastestAlternative.name}.${groupBasis}`
  else if (recommended.id === fastest.id && recommended.id !== cheapest.id) explanation = `${recommended.name} is our smart pick: it is the fastest option while offering better value than the lowest per-person cost option, ${cheapestAlternative.name}.${groupBasis}`
  else if (recommended.id === fastest.id && recommended.id === cheapest.id) explanation = `${recommended.name} is our smart pick: it is the fastest and has the lowest per-person cost, ahead of the fastest alternative ${fastestAlternative.name} and the lowest-cost alternative ${cheapestAlternative.name}.${groupBasis}`
  else if (fastestAlternative.id === cheapestAlternative.id) explanation = `${recommended.name} is our smart pick: it balances time and per-person cost better than ${fastestAlternative.name}, which is the strongest alternative on both measures.${groupBasis}`
  else explanation = `${recommended.name} is our smart pick: it balances time and per-person cost better than the fastest ${fastestAlternative.name} and the lowest per-person cost option, ${cheapestAlternative.name}.${groupBasis}`
  return { options: scored.map((option) => ({ ...option, isRecommended: option.id === recommended.id, isEcoFriendly: option.estimatedCo2Kg === lowestCo2Kg })), explanation, directDistanceKm: Math.round(directDistanceKm) }
}