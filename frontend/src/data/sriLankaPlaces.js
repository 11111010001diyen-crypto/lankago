import trainNetwork from '../../../shared/trainNetwork.json' with { type: 'json' }

export function getTrainStationPlace(stationName) {
  const coordinates = trainNetwork.stations[stationName]
  return coordinates ? { name: stationName, area: 'Railway station', district: '', province: 'Sri Lanka', fullAddress: `${stationName} railway station, Sri Lanka`, latitude: coordinates[0], longitude: coordinates[1], aliases: [] } : null
}