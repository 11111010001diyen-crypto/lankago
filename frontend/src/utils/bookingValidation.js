const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

export function isValidTravelDate(value) {
  if (!isoDatePattern.test(value || '')) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function getBookingSearchError(search) {
  if (!search || !search.from?.trim() || !search.to?.trim()) return 'Your journey locations are missing. Please plan your journey again.'
  if (!isValidTravelDate(search.date)) return 'Choose a valid travel date before continuing.'
  if (!Number.isFinite(search.fromPlace?.latitude) || !Number.isFinite(search.fromPlace?.longitude) || !Number.isFinite(search.toPlace?.latitude) || !Number.isFinite(search.toPlace?.longitude)) return 'Your journey coordinates are missing. Please plan your journey again.'
  if (!search.departureTime || !search.weather) return 'Your journey conditions are missing. Please plan your journey again.'
  const passengers = Number.parseInt(search.passengers, 10)
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 100) return 'Choose between 1 and 100 passengers before continuing.'
  return ''
}

export function getPassengerDetailsError(search, option, passenger) {
  const searchError = getBookingSearchError(search)
  if (searchError) return searchError
  if (!option?.id || !Number.isFinite(option.price) || !Number.isFinite(option.units)) return 'Your selected transport option is missing. Please choose an option again.'
  if (option.id === 'bus' && !search.busSubType) return 'Choose a bus type before continuing.'
  if (option.id === 'train' && !search.trainClass) return 'Choose a train class before continuing.'
  if (!passenger || !Array.isArray(passenger.names)) return 'Passenger details are missing. Please return to passenger details and try again.'

  const passengers = Number.parseInt(search.passengers, 10)
  const expectedNameCount = option.id === 'bus' || option.id === 'train' ? passengers : 1
  if (passenger.names.length !== expectedNameCount || passenger.names.some((name) => typeof name !== 'string' || name.trim().length < 2)) return 'Complete every passenger name before confirming your booking.'
  if (passenger.names[0].trim().length < 2) return 'Enter a valid lead passenger name before confirming your booking.'
  if (!/^\d{10}$/.test(passenger.contact || '')) return 'Enter a valid 10-digit contact number before confirming your booking.'
  return ''
}