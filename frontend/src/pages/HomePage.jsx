import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import modes from '../../data/transportModes.json'
import trainImage from '../assets/icons/train.png'
import busImage from '../assets/icons/bus.png'
import carImage from '../assets/icons/car.png'
import threeWheelImage from '../assets/icons/three-wheel.png'
import flightImage from '../assets/icons/flight.png'
import shipImage from '../assets/icons/ship.png'
import lorryImage from '../assets/icons/lorry.png'
import mapsImage from '../assets/icons/maps.png'
import pickMeImage from '../assets/icons/pickme.png'
import uberImage from '../assets/icons/uber.png'
import { Button } from '../components/Button'
import { AuthenticatedTopbar } from '../components/AuthenticatedTopbar'
import { FormSectionWrapper } from '../components/FormSectionWrapper'
import { InputField } from '../components/InputField'
import { StatsHighlight } from '../components/StatsHighlight'
import { allTrainStations } from '../data/trainStations'
import { searchSriLankanPlaces } from '../utils/geocode'
import { isValidTravelDate } from '../utils/bookingValidation'
import { getTrainStationPlace } from '../data/sriLankaPlaces'
import { searchLocalSriLankanPlaces } from '../utils/placeSearch'

const modeImages = { train: trainImage, bus: busImage, car: carImage, 'three-wheel': threeWheelImage }
const placeInputValue = (place) => place ? `${place.name} · ${place.area}` : ''
const quickLinks = [{ label: 'Google Maps', href: 'https://maps.google.com', detail: 'Open directions', image: mapsImage }, { label: 'PickMe', href: 'https://www.pickme.lk', detail: 'Book a local ride', image: pickMeImage }, { label: 'Uber', href: 'https://www.uber.com/global/en/r/sri-lanka/cities/', detail: 'Explore ride options', image: uberImage }]
const comingSoonModes = [{ label: 'Flights', image: flightImage }, { label: 'Ship', image: shipImage }, { label: 'Heavy Vehicles', image: lorryImage }]
const homeStats = [{ title: 'Journeys Compared', subtitle: 'Routes explored with LankaGo', value: '1,240+', badgeText: '12.5%', badgeDirection: 'up', subtext: 'Compared with last month' }, { title: 'Avg. Savings Found', subtitle: 'Potential fare savings', value: '23%', badgeText: '4.2%', badgeDirection: 'up', subtext: 'More than last month' }, { title: 'Transport Modes', subtitle: 'Available for comparison', value: '4', badgeText: 'All active', badgeDirection: 'neutral', subtext: 'Train, bus, car and three-wheel' }]
const weatherRequestTimeoutMs = 4000
const placeSearchDelayMs = 500
const minimumPlaceSearchLength = 3

function getDepartureTimePeriod(date = new Date()) {
  const hour = date.getHours()
  if (hour >= 7 && hour < 10) return 'Morning peak'
  if (hour >= 10 && hour < 16) return 'Midday'
  if (hour >= 16 && hour < 20) return 'Evening peak'
  return 'Night'
}

function getWeatherCondition(weatherCode) {
  return [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(weatherCode) ? 'Rainy' : 'Clear'
}

async function getCurrentWeather(place) {
  if (!place || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) return 'Clear'
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), weatherRequestTimeoutMs)
  try {
    const query = new URLSearchParams({ latitude: place.latitude, longitude: place.longitude, current: 'weather_code' })
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, { signal: controller.signal })
    if (!response.ok) return 'Clear'
    const data = await response.json()
    return Number.isFinite(data?.current?.weather_code) ? getWeatherCondition(data.current.weather_code) : 'Clear'
  } catch {
    return 'Clear'
  } finally {
    window.clearTimeout(timeout)
  }
}

function PlaceSearchField({ id, label, value, onChange, onSelect, selectedPlace, error }) {
  const [suggestions, setSuggestions] = useState([])
  const [status, setStatus] = useState('idle')
  const requestRef = useRef(null)

  useEffect(() => {
    const query = value.trim()
    requestRef.current?.abort()
    if (query.length < minimumPlaceSearchLength || placeInputValue(selectedPlace) === value) return undefined
    const timer = window.setTimeout(() => { setSuggestions(searchLocalSriLankanPlaces(query)); setStatus('local') }, placeSearchDelayMs)
    return () => window.clearTimeout(timer)
  }, [value, selectedPlace])

  const searchMorePlaces = async () => {
    const query = value.trim()
    const controller = new AbortController()
    requestRef.current = controller
    setStatus('loading')
    try {
      const places = await searchSriLankanPlaces(query, controller.signal)
      if (controller.signal.aborted) return
      const knownLocations = new Set(suggestions.map((place) => `${place.latitude.toFixed(4)},${place.longitude.toFixed(4)}`))
      const extraPlaces = places.filter((place) => !knownLocations.has(`${place.latitude.toFixed(4)},${place.longitude.toFixed(4)}`))
      setSuggestions((current) => [...current, ...extraPlaces])
      setStatus(extraPlaces.length ? 'ready' : suggestions.length ? 'local' : 'empty')
    } catch (searchError) {
      if (searchError.name === 'AbortError' || controller.signal.aborted) return
      setStatus('error')
    }
  }

  const selectPlace = (place) => {
    setSuggestions([])
    setStatus('idle')
    onSelect(place)
  }
  const hasCurrentQuery = value.trim().length >= minimumPlaceSearchLength && placeInputValue(selectedPlace) !== value

  return <div className="input-field place-search"><label htmlFor={id}>{label}<span className="required"> *</span></label><input id={id} className="place-search__input" name={id} value={value} onChange={onChange} placeholder="Search anywhere in Sri Lanka" autoComplete="off" aria-autocomplete="list" aria-expanded={hasCurrentQuery && suggestions.length > 0} aria-controls={`${id}-suggestions`} aria-invalid={Boolean(error)} required />{hasCurrentQuery && status === 'loading' && <p className="place-search__message">Searching places…</p>}{hasCurrentQuery && status === 'empty' && <p className="place-search__message">No additional places found in Sri Lanka. Try another search.</p>}{hasCurrentQuery && status === 'error' && <p className="place-search__message place-search__message--error">We could not search for places right now. <button type="button" className="place-search__retry" onClick={searchMorePlaces}>Try again</button></p>}{hasCurrentQuery && suggestions.length > 0 && <ul id={`${id}-suggestions`} className="place-search__list" role="listbox">{suggestions.map((place) => <li key={`${place.name}-${place.latitude}-${place.longitude}`} role="option" aria-selected="false"><button type="button" className="place-search__option" title={place.fullAddress} onClick={() => selectPlace(place)}><strong>{place.name}</strong><small>{place.area}</small></button></li>)}</ul>}{hasCurrentQuery && status !== 'loading' && <button type="button" className="place-search__more" onClick={searchMorePlaces}>Search more places</button>}{error && <p className="field-error">{error}</p>}</div>
}

function TrainStationSearchField({ id, label, value, onChange, onSelect, selectedPlace, error }) {
  const [status, setStatus] = useState('idle')
  const query = value.trim().toLowerCase()
  const suggestions = query && placeInputValue(selectedPlace) !== value ? allTrainStations.filter((station) => station.toLowerCase().includes(query)) : []

  const selectStation = async (station) => {
    setStatus('loading')
    try {
      await onSelect(station)
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  return <div className="input-field place-search"><label htmlFor={id}>{label}<span className="required"> *</span></label><input id={id} className="place-search__input" name={id} value={value} onChange={onChange} placeholder="Search Sri Lanka Railways stations" autoComplete="off" aria-autocomplete="list" aria-expanded={suggestions.length > 0} aria-controls={`${id}-suggestions`} aria-invalid={Boolean(error)} required />{status === 'loading' && <p className="place-search__message">Looking up station…</p>}{query && placeInputValue(selectedPlace) !== value && status !== 'loading' && suggestions.length === 0 && <p className="place-search__message">No matching Sri Lanka Railways station found.</p>}{status === 'error' && <p className="place-search__message place-search__message--error">We could not look up that station right now. Please try again.</p>}{suggestions.length > 0 && status !== 'loading' && <ul id={`${id}-suggestions`} className="place-search__list" role="listbox">{suggestions.map((station) => <li key={station} role="option" aria-selected="false"><button type="button" className="place-search__option" onClick={() => selectStation(station)}>{station}</button></li>)}</ul>}{error && <p className="field-error">{error}</p>}</div>
}

export function HomePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ from: '', to: '', date: '', mode: 'train', passengers: 1 })
  const [places, setPlaces] = useState({ from: null, to: null })
  const [errors, setErrors] = useState({ from: '', to: '', date: '' })
  const [isSearching, setIsSearching] = useState(false)
  const [comingSoonMessage, setComingSoonMessage] = useState('')
  const isTrainMode = form.mode === 'train'
  const today = new Date().toISOString().slice(0, 10)
  const change = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    if (name === 'date') setErrors((current) => ({ ...current, date: '' }))
  }
  const changeMode = (event) => {
    const nextMode = event.target.value
    const isChangingSearchType = (form.mode === 'train') !== (nextMode === 'train')
    setForm((current) => isChangingSearchType ? { ...current, mode: nextMode, from: '', to: '' } : { ...current, mode: nextMode })
    if (isChangingSearchType) {
      setPlaces({ from: null, to: null })
      setErrors({ from: '', to: '', date: '' })
    }
  }
  const changePlace = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setPlaces((current) => ({ ...current, [name]: null }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }
  const selectPlace = (field, place) => {
    setForm((current) => ({ ...current, [field]: placeInputValue(place) }))
    setPlaces((current) => ({ ...current, [field]: place }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }
  const selectTrainStation = async (field, station) => {
    const stationPlace = getTrainStationPlace(station)
    if (!stationPlace) throw new Error('STATION_LOOKUP_FAILED')
    setForm((current) => ({ ...current, [field]: placeInputValue(stationPlace) }))
    setPlaces((current) => ({ ...current, [field]: stationPlace }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }
  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = { from: places.from ? '' : 'Select a place from the search results.', to: places.to ? '' : 'Select a place from the search results.', date: isValidTravelDate(form.date) ? '' : 'Choose a valid travel date.' }
    setErrors(nextErrors)
    if (nextErrors.from || nextErrors.to || nextErrors.date) return
    setIsSearching(true)
    const departureTime = getDepartureTimePeriod()
    const weather = await getCurrentWeather(places.from)
    navigate('/results', { state: { search: { ...form, fromPlace: places.from, toPlace: places.to, departureTime, weather } } })
  }

  return <main className="page"><AuthenticatedTopbar><span>Plan with confidence</span></AuthenticatedTopbar><section className="home-hero"><div className="home-hero__overlay"><p>Compare every way to get there.</p></div></section><div className="content home-content"><FormSectionWrapper title="Plan your journey" subtitle="Find the best way to get where you need to go."><form onSubmit={submit}><fieldset className="mode-selector"><legend>Preferred transport</legend><div className="mode-grid">{modes.map((mode) => { const imageSrc = modeImages[mode.id]; const isSelected = form.mode === mode.id; return <label className={`mode-choice ${isSelected ? 'mode-choice--active' : ''}`} key={mode.id} aria-label={`${mode.name}${isSelected ? ', selected' : ''}`}><input type="radio" name="mode" value={mode.id} checked={isSelected} aria-checked={isSelected} onChange={changeMode} />{isSelected && <span className="selection-badge">{'\u2713'} Selected</span>}<span className="mode-choice__icon">{imageSrc ? <img src={imageSrc} alt="" style={{ width: 116, height: 116, borderRadius: '50%', objectFit: 'cover' }} /> : null}</span><span className="mode-choice__label">{mode.name}</span></label> })}</div><p className="field-helper">You can compare and switch modes on the next screen.</p></fieldset>{isTrainMode ? <div key="train-stations"><TrainStationSearchField id="from" label="From" value={form.from} onChange={changePlace} onSelect={(station) => selectTrainStation('from', station)} selectedPlace={places.from} error={errors.from} /><TrainStationSearchField id="to" label="To" value={form.to} onChange={changePlace} onSelect={(station) => selectTrainStation('to', station)} selectedPlace={places.to} error={errors.to} /></div> : <div key="general-places"><PlaceSearchField id="from" label="From" value={form.from} onChange={changePlace} onSelect={(place) => selectPlace('from', place)} selectedPlace={places.from} error={errors.from} /><PlaceSearchField id="to" label="To" value={form.to} onChange={changePlace} onSelect={(place) => selectPlace('to', place)} selectedPlace={places.to} error={errors.to} /></div>}<InputField id="date" name="date" label="Travel date" type="date" value={form.date} onChange={change} min={today} error={errors.date} required /><InputField id="passengers" name="passengers" label="Number of passengers" type="number" value={form.passengers} onChange={change} min="1" required /><Button type="submit" className="full-width" disabled={isSearching}>{isSearching ? <>Checking conditions{'\u2026'}</> : 'Search journeys'}</Button></form></FormSectionWrapper><section className="home-extra-section" aria-labelledby="quick-access-heading"><h2 id="quick-access-heading">Quick access</h2><div className="quick-links">{quickLinks.map((link) => <a href={link.href} target="_blank" rel="noreferrer" className="quick-link" key={link.label}><img src={link.image} alt="" /><span><strong>{link.label}</strong><small>{link.detail}</small></span></a>)}</div></section><section className="home-extra-section" aria-labelledby="coming-soon-heading"><h2 id="coming-soon-heading">Coming soon</h2><div className="coming-soon-grid">{comingSoonModes.map((mode) => <article className="coming-soon-card" key={mode.label}><img src={mode.image} alt="" /><span>{mode.label}</span><small>Planned</small></article>)}</div></section><section className="home-extra-section home-extra-section--stats" aria-label="LankaGo activity"><StatsHighlight stats={homeStats} /></section></div></main>
}