import trainNetwork from '../../../shared/trainNetwork.json'

export const trainLines = trainNetwork.lines

export const allTrainStations = [...new Set(trainLines.flatMap((line) => line.stations))].sort()