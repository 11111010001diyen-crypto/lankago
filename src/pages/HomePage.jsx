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

const modeImages = { train: trainImage, bus: busImage, car: carImage, 'three-wheel': threeWheelImage }
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
  const [searchedQuery, setSearchedQuery] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  const requestRef = useRef(null)

  useEffect(() => {
    const query = value.trim()
    requestRef.current?.abort()
    if (query.length < minimumPlaceSearchLength || selectedPlace?.label === value) return undefined
    const controller = new AbortController()
    requestRef.current = controller
    const timer = window.setTimeout(async () => {
      setSearchedQuery(query)
      setStatus('loading')
      try {
        const places = await searchSriLankanPlaces(query, controller.signal)
        if (controller.signal.aborted) return
        setSuggestions(places)
        setStatus(places.length ? 'ready' : 'empty')
      } catch (searchError) {
        if (searchError.name === 'AbortError' || controller.signal.aborted) return
        setSuggestions([])
        setStatus('error')
      }
    }, placeSearchDelayMs)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [value, selectedPlace, retryKey])

  const selectPlace = (place) => {
    setSuggestions([])
    setStatus('idle')
    onSelect(place)
  }
  const hasCurrentQuery = value.trim().length >= minimumPlaceSearchLength && selectedPlace?.label !== value && searchedQuery === value.trim()

  return <div className="input-field place-search"><label htmlFor={id}>{label}<span className="required"> *</span></label><input id={id} className="place-search__input" name={id} value={value} onChange={onChange} placeholder="Search anywhere in Sri Lanka" autoComplete="off" aria-autocomplete="list" aria-expanded={hasCurrentQuery && suggestions.length > 0} aria-controls={`${id}-suggestions`} aria-invalid={Boolean(error)} required />{hasCurrentQuery && status === 'loading' && <p className="place-search__message">Searching places…</p>}{hasCurrentQuery && status === 'empty' && <p className="place-search__message">No matching places found in Sri Lanka. Try another search.</p>}{hasCurrentQuery && status === 'error' && <p className="place-search__message place-search__message--error">We could not search for places right now. <button type="button" className="place-search__retry" onClick={() => setRetryKey((key) => key + 1)}>Try again</button></p>}{hasCurrentQuery && suggestions.length > 0 && <ul id={`${id}-suggestions`} className="place-search__list" role="listbox">{suggestions.map((place) => <li key={`${place.label}-${place.latitude}-${place.longitude}`} role="option" aria-selected="false"><button type="button" className="place-search__option" onClick={() => selectPlace(place)}>{place.label}</button></li>)}</ul>}{error && <p className="field-error">{error}</p>}</div>
}

function TrainStationSearchField({ id, label, value, onChange, onSelect, selectedPlace, error }) {
  const [status, setStatus] = useState('idle')
  const query = value.trim().toLowerCase()
  const suggestions = query && selectedPlace?.label !== value ? allTrainStations.filter((station) => station.toLowerCase().includes(query)) : []

  const selectStation = async (station) => {
    setStatus('loading')
    try {
      await onSelect(station)
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  return <div className="input-field place-search"><label htmlFor={id}>{label}<span className="required"> *</span></label><input id={id} className="place-search__input" name={id} value={value} onChange={onChange} placeholder="Search Sri Lanka Railways stations" autoComplete="off" aria-autocomplete="list" aria-expanded={suggestions.length > 0} aria-controls={`${id}-suggestions`} aria-invalid={Boolean(error)} required />{status === 'loading' && <p className="place-search__message">Looking up station…</p>}{query && selectedPlace?.label !== value && status !== 'loading' && suggestions.length === 0 && <p className="place-search__message">No matching Sri Lanka Railways station found.</p>}{status === 'error' && <p className="place-search__message place-search__message--error">We could not look up that station right now. Please try again.</p>}{suggestions.length > 0 && status !== 'loading' && <ul id={`${id}-suggestions`} className="place-search__list" role="listbox">{suggestions.map((station) => <li key={station} role="option" aria-selected="false"><button type="button" className="place-search__option" onClick={() => selectStation(station)}>{station}</button></li>)}</ul>}{error && <p className="field-error">{error}</p>}</div>
}

export function HomePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ from: '', to: '', date: '', mode: 'train', passengers: 1 })
  const [places, setPlaces] = useState({ from: null, to: null })
  const [errors, setErrors] = useState({ from: '', to: '' })
  const [isSearching, setIsSearching] = useState(false)
  const [comingSoonMessage, setComingSoonMessage] = useState('')
  const isTrainMode = form.mode === 'train'
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const changeMode = (event) => {
    const nextMode = event.target.value
    const isChangingSearchType = (form.mode === 'train') !== (nextMode === 'train')
    setForm((current) => isChangingSearchType ? { ...current, mode: nextMode, from: '', to: '' } : { ...current, mode: nextMode })
    if (isChangingSearchType) {
      setPlaces({ from: null, to: null })
      setErrors({ from: '', to: '' })
    }
  }
  const changePlace = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setPlaces((current) => ({ ...current, [name]: null }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }
  const selectPlace = (field, place) => {
    setForm((current) => ({ ...current, [field]: place.label }))
    setPlaces((current) => ({ ...current, [field]: place }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }
  const selectTrainStation = async (field, station) => {
    const stationPlaces = await searchSriLankanPlaces(`${station}, Sri Lanka`)
    const stationPlace = stationPlaces[0]
    if (!stationPlace) throw new Error('STATION_LOOKUP_FAILED')
    setForm((current) => ({ ...current, [field]: station }))
    setPlaces((current) => ({ ...current, [field]: { ...stationPlace, label: station } }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }
  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = { from: places.from ? '' : 'Select a place from the search results.', to: places.to ? '' : 'Select a place from the search results.' }
    setErrors(nextErrors)
    if (nextErrors.from || nextErrors.to) return
    setIsSearching(true)
    const departureTime = getDepartureTimePeriod()
    const weather = await getCurrentWeather(places.from)
    navigate('/results', { state: { search: { ...form, fromPlace: places.from, toPlace: places.to, departureTime, weather } } })
  }

  return <main className="page"><AuthenticatedTopbar><span>Plan with confidence</span></AuthenticatedTopbar><section className="home-hero"><div className="home-hero__overlay"><p>Compare every way to get there.</p></div></section><div className="content home-content"><FormSectionWrapper title="Plan your journey" subtitle="Find the best way to get where you need to go."><form onSubmit={submit}><fieldset className="mode-selector"><legend>Preferred transport</legend><div className="mode-grid">{modes.map((mode) => { const imageSrc = modeImages[mode.id]; return <label className={`mode-choice ${form.mode === mode.id ? 'mode-choice--active' : ''}`} key={mode.id}><input type="radio" name="mode" value={mode.id} checked={form.mode === mode.id} onChange={changeMode} /><span className="mode-choice__icon">{imageSrc ? <img src={imageSrc} alt="" style={{ width: 116, height: 116, borderRadius: '50%', objectFit: 'cover' }} /> : null}</span><span className="mode-choice__label">{mode.name}</span></label> })}</div><p className="field-helper">You can compare and switch modes on the next screen.</p></fieldset>{isTrainMode ? <div key="train-stations"><TrainStationSearchField id="from" label="From" value={form.from} onChange={changePlace} onSelect={(station) => selectTrainStation('from', station)} selectedPlace={places.from} error={errors.from} /><TrainStationSearchField id="to" label="To" value={form.to} onChange={changePlace} onSelect={(station) => selectTrainStation('to', station)} selectedPlace={places.to} error={errors.to} /></div> : <div key="general-places"><PlaceSearchField id="from" label="From" value={form.from} onChange={changePlace} onSelect={(place) => selectPlace('from', place)} selectedPlace={places.from} error={errors.from} /><PlaceSearchField id="to" label="To" value={form.to} onChange={changePlace} onSelect={(place) => selectPlace('to', place)} selectedPlace={places.to} error={errors.to} /></div>}<InputField id="date" name="date" label="Travel date" type="date" value={form.date} onChange={change} min={new Date().toISOString().split('T')[0]} required /><InputField id="passengers" name="passengers" label="Number of passengers" type="number" value={form.passengers} onChange={change} min="1" required /><Button type="submit" className="full-width" disabled={isSearching}>{isSearching ? 'Checking conditionsâ€¦' : 'Search journeys'}</Button></form></FormSectionWrapper><section className="home-extra-section" aria-labelledby="quick-access-heading"><h2 id="quick-access-heading">Quick access</h2><div className="quick-access-grid">{quickLinks.map((link) => <a className="quick-access-card" key={link.label} href={link.href} target="_blank" rel="noreferrer"><span className="quick-access-card__icon"><img src={link.image} alt="" /></span><strong>{link.label}</strong><span>{link.detail}</span></a>)}</div></section><StatsHighlight stats={homeStats} /><section className="home-extra-section" aria-labelledby="coming-soon-heading"><h2 id="coming-soon-heading">More transport options</h2><div className="coming-soon-grid">{comingSoonModes.map((mode) => <button type="button" className="coming-soon-tile" key={mode.label} onClick={() => setComingSoonMessage(`${mode.label} comparison is coming soon.`)}><span className="coming-soon-tile__icon"><img src={mode.image} alt="" /></span><span className="coming-soon-tile__label">{mode.label}</span><span>Coming soon</span></button>)}</div>{comingSoonMessage && <p className="home-message" role="status">{comingSoonMessage}</p>}</section></div></main>
}