export const cityCoordinates = {
  'Colombo Fort': { latitude: 6.9344, longitude: 79.8428 },
  Negombo: { latitude: 7.2083, longitude: 79.8358 },
  Galle: { latitude: 6.0329, longitude: 80.217 },
  Kandy: { latitude: 7.2906, longitude: 80.6337 },
  Jaffna: { latitude: 9.6615, longitude: 80.0255 },
}

export const supportedCities = Object.keys(cityCoordinates)

export function normaliseCityName(cityName = '') {
  const matchedCity = supportedCities.find((city) => city.toLowerCase() === cityName.trim().toLowerCase())
  return matchedCity || null
}