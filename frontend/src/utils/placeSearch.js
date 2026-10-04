import compactPlaceIndex from '../data/sriLankaPlacesIndex.json' with { type: 'json' }

const typePriority = { city: 0, town: 1, suburb: 2, quarter: 3, neighbourhood: 4, village: 5, hamlet: 6 }
const ignoredSuffixes = new Set(['jct', 'junction', 'town', 'road'])

function latinCanonical(value) {
  let text = value.replace(/([a-z])\1+/g, '$1')
  if (text.length >= 5) text = text.replace(/[aei]/g, 'a')
  return text.replace(/th/g, 't').replace(/d/g, 't')
}

export function normalisePlaceSearchText(value = '') {
  const text = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
  return /^[a-z0-9]+$/i.test(text) ? latinCanonical(text) : text
}

function words(value = '') {
  return (value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter((word, index, all) => !(index === all.length - 1 && ignoredSuffixes.has(word.replace(/\.$/, ''))))
}

function variants(query) {
  const values = [query]
  const replacements = [[/\bsaint\b/ig, 'St.'], [/\bst\.?\b/ig, 'Saint'], [/\bkovil temple\b/ig, 'Kovil'], [/\bkovil\b/ig, 'Temple'], [/kandaswamy/ig, 'Kanthaswamy'], [/kanthaswamy/ig, 'Kandaswamy'], [/veli\b/ig, 'vely'], [/vely\b/ig, 'veli']]
  replacements.forEach(([pattern, replacement]) => {
    const candidate = query.replace(pattern, replacement)
    if (!values.includes(candidate)) values.push(candidate)
  })
  const postal = query.match(/^\s*(?:colombo|col)\s*[- ]?\s*(1[0-5]|[1-9])\s*$/i)
  if (postal) values.push(`Colombo ${postal[1]}`, `Colombo-${postal[1]}`, `Col ${postal[1]}`)
  return [...new Set(values)]
}

function editDistance(first, second) {
  if (Math.abs(first.length - second.length) > 2) return 3
  let previous = Array.from({ length: second.length + 1 }, (_, index) => index)
  for (let row = 1; row <= first.length; row += 1) {
    const current = [row]
    for (let column = 1; column <= second.length; column += 1) current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + (first[row - 1] === second[column - 1] ? 0 : 1))
    previous = current
  }
  return previous.at(-1)
}

function compactToPlace(place) {
  if (!Object.hasOwn(place, 'i')) return place
  return { id: place.i, name: place.n, name_si: place.si, name_ta: place.ta, aliases: place.a || [], type: place.t, latitude: place.la, longitude: place.lo, district: place.d, province: place.p }
}

function candidates(place) {
  return [place.name, place.name_si, place.name_ta, ...(place.aliases || [])].filter(Boolean)
}

function canonicalCandidate(value) {
  return normalisePlaceSearchText(words(value).join(''))
}

function fuzzyMatch(queryWords, candidateWords) {
  if (queryWords.length !== candidateWords.length || !queryWords.length) return false
  return queryWords.every((queryWord, index) => {
    const candidateWord = candidateWords[index]
    const length = Math.max(queryWord.length, candidateWord.length)
    const limit = length >= 8 ? 2 : length >= 5 ? 1 : 0
    return limit > 0 && editDistance(queryWord, candidateWord) <= limit
  })
}

function matchRank(place, query) {
  let best = null
  variants(query).forEach((variant) => {
    const queryWords = words(variant).map(normalisePlaceSearchText)
    const canonicalQuery = canonicalCandidate(variant)
    candidates(place).forEach((candidate, index) => {
      const candidateWords = words(candidate).map(normalisePlaceSearchText)
      const canonicalValue = canonicalCandidate(candidate)
      let rank = -1
      if (canonicalValue === canonicalQuery) rank = index === 0 ? 0 : 1
      else if (canonicalValue.startsWith(canonicalQuery)) rank = 2
      else if (queryWords.length && queryWords.every((queryWord) => candidateWords.some((word) => word.startsWith(queryWord)))) rank = 3
      else if (canonicalValue.includes(canonicalQuery)) rank = 4
      else if (fuzzyMatch(queryWords, candidateWords)) rank = 5
      if (rank >= 0 && (best === null || rank < best.rank)) best = { rank, matchedText: candidate }
    })
  })
  return best
}

export function toDisplayPlace(place, matchedText = '') {
  const district = place.district || ''
  const province = place.province || ''
  return { ...place, area: district || province || 'Sri Lanka', fullAddress: [place.name, district, province, 'Sri Lanka'].filter(Boolean).join(', '), matchedText }
}

export function searchPlaceIndex(index, query, limit = 8) {
  return index.map(compactToPlace).map((place) => ({ place, match: matchRank(place, query) })).filter(({ match }) => match).sort((first, second) => first.match.rank - second.match.rank || (typePriority[first.place.type] ?? 99) - (typePriority[second.place.type] ?? 99) || first.place.name.localeCompare(second.place.name)).slice(0, limit).map(({ place, match }) => toDisplayPlace(place, match.matchedText))
}

export function searchLocalSriLankanPlaces(query, limit = 8) {
  return searchPlaceIndex(compactPlaceIndex, query, limit)
}