import trainNetwork from '../../../shared/trainNetwork.json'

export const maximumStationAccessKm = 3

const toRadians = (degrees) => degrees * (Math.PI / 180)

export function distanceKm(fromLatitude, fromLongitude, toLatitude, toLongitude) {
  const latitudeDifference = toRadians(toLatitude - fromLatitude)
  const longitudeDifference = toRadians(toLongitude - fromLongitude)
  const haversine = Math.sin(latitudeDifference / 2) ** 2 + Math.cos(toRadians(fromLatitude)) * Math.cos(toRadians(toLatitude)) * Math.sin(longitudeDifference / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function nearestStation(latitude, longitude) {
  return Object.entries(trainNetwork.stations).map(([name, [stationLatitude, stationLongitude]]) => ({ name, distanceKm: distanceKm(latitude, longitude, stationLatitude, stationLongitude) })).reduce((nearest, station) => station.distanceKm < nearest.distanceKm ? station : nearest)
}

function areConnected(fromStation, toStation) {
  const graph = new Map()
  for (const line of trainNetwork.lines) for (let index = 0; index < line.stations.length - 1; index += 1) {
    const [from, to] = [line.stations[index], line.stations[index + 1]]
    graph.set(from, [...(graph.get(from) || []), to])
    graph.set(to, [...(graph.get(to) || []), from])
  }
  const visited = new Set([fromStation])
  const queue = [fromStation]
  while (queue.length) {
    const station = queue.shift()
    if (station === toStation) return true
    for (const connectedStation of graph.get(station) || []) if (!visited.has(connectedStation)) { visited.add(connectedStation); queue.push(connectedStation) }
  }
  return false
}

export function getTrainAvailability(fromPlace, toPlace) {
  const fromStation = nearestStation(fromPlace.latitude, fromPlace.longitude)
  const toStation = nearestStation(toPlace.latitude, toPlace.longitude)
  const available = fromStation.distanceKm <= maximumStationAccessKm && toStation.distanceKm <= maximumStationAccessKm && fromStation.name !== toStation.name && areConnected(fromStation.name, toStation.name)
  return { available, fromStation: fromStation.name, toStation: toStation.name }
}