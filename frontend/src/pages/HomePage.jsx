import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { PlacePickerMapModal } from '../components/PlacePickerMapModal'
import { StatsHighlight } from '../components/StatsHighlight'
import { allTrainStations } from '../data/trainStations'
import { getTrainStationPlace } from '../data/sriLankaPlaces'
import { searchSriLankanPlaces } from '../utils/geocode'
import { isValidTravelDate } from '../utils/bookingValidation'
import { searchLocalSriLankanPlaces } from '../utils/placeSearch'

const modeImages = { train: trainImage, bus: busImage, car: carImage, 'three-wheel': threeWheelImage }
const placeInputValue = (place) => place ? `${place.name} · ${place.area}` : ''
const quickLinks = [{ label: 'Google Maps', href: 'https://maps.google.com', detail: 'Open directions', image: mapsImage }, { label: 'PickMe', href: 'https://www.pickme.lk', detail: 'Book a local ride', image: pickMeImage }, { label: 'Uber', href: 'https://www.uber.com/global/en/r/sri-lanka/cities/', detail: 'Explore ride options', image: uberImage }]
const comingSoonModes = [{ label: 'Flights', image: flightImage }, { label: 'Ship', image: shipImage }, { label: 'Heavy Vehicles', image: lorryImage }]
const homeStats = [{ title: 'Journeys Compared', subtitle: 'Routes explored with LankaGo', value: '1,240+', badgeText: '12.5%', badgeDirection: 'up', subtext: 'Compared with last month' }, { title: 'Avg. Savings Found', subtitle: 'Potential fare savings', value: '23%', badgeText: '4.2%', badgeDirection: 'up', subtext: 'More than last month' }, { title: 'Transport Modes', subtitle: 'Available for comparison', value: '4', badgeText: 'All active', badgeDirection: 'neutral', subtext: 'Train, bus, car and three-wheel' }]
const weatherRequestTimeoutMs = 4000
const placeSearchDelayMs = 300
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

function PlaceSuggestion({ place, onSelect }) {
  const secondary = [place.type && `${place.type[0].toUpperCase()}${place.type.slice(1)}`, place.district, place.province].filter(Boolean).join(' · ')
  const showMatchedLanguage = place.matchedText && place.matchedText !== place.name
  return <li role="option" aria-selected="false"><button type="button" className="place-search__option" title={place.fullAddress} onClick={() => onSelect(place)}><strong>{place.name}</strong><small>{secondary}</small>{showMatchedLanguage && <small className="place-search__matched">Matched: {place.matchedText}</small>}</button></li>
}

function PlaceSearchField({ id, label, value, onChange, onSelect, selectedPlace, error, onPickMap }) {
  const [suggestions, setSuggestions] = useState([])
  const [status, setStatus] = useState('idle')
  const requestRef = useRef(null)
  const query = value.trim()
  const hasCurrentQuery = query.length >= minimumPlaceSearchLength && placeInputValue(selectedPlace) !== value

  useEffect(() => {
    requestRef.current?.abort()
    if (!hasCurrentQuery) {
      setSuggestions([])
      setStatus('idle')
      return undefined
    }
    const timer = window.setTimeout(() => {
      const localPlaces = searchLocalSriLankanPlaces(query)
      setSuggestions(localPlaces)
      setStatus(localPlaces.length ? 'local' : 'no-local')
    }, placeSearchDelayMs)
    return () => window.clearTimeout(timer)
  }, [hasCurrentQuery, query])

  const searchMorePlaces = async () => {
    if (!hasCurrentQuery) return
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setStatus('loading')
    try {
      const results = await searchSriLankanPlaces(query, controller.signal)
      if (controller.signal.aborted) return
      const seen = new Set(suggestions.map((place) => `${place.latitude.toFixed(5)},${place.longitude.toFixed(5)}`))
      const extras = results.filter((place) => !seen.has(`${place.latitude.toFixed(5)},${place.longitude.toFixed(5)}`))
      setSuggestions((current) => [...current, ...extras])
      setStatus(extras.length || suggestions.length ? 'ready' : 'empty')
    } catch (searchError) {
      if (!controller.signal.aborted && searchError.name !== 'AbortError') setStatus('error')
    }
  }

  const selectPlace = (place) => {
    requestRef.current?.abort()
    setSuggestions([])
    setStatus('idle')
    onSelect(place)
  }

  return <div className="input-field place-search"><label htmlFor={id}>{label}<span className="required"> *</span></label><input id={id} className="place-search__input" name={id} value={value} onChange={onChange} placeholder="Search anywhere in Sri Lanka" autoComplete="off" aria-autocomplete="list" aria-expanded={hasCurrentQuery && suggestions.length > 0} aria-controls={`${id}-suggestions`} aria-invalid={Boolean(error)} required />{hasCurrentQuery && status === 'loading' && <p className="place-search__message">Searching places…</p>}{hasCurrentQuery && status === 'empty' && <p className="place-search__message">No additional places found in Sri Lanka.</p>}{hasCurrentQuery && status === 'error' && <p className="place-search__message place-search__message--error">We could not search for places right now. <button type="button" className="place-search__retry" onClick={searchMorePlaces}>Try again</button></p>}{hasCurrentQuery && suggestions.length > 0 && <ul id={`${id}-suggestions`} className="place-search__list" role="listbox">{suggestions.map((place) => <PlaceSuggestion key={`${place.id || place.name}-${place.latitude}-${place.longitude}`} place={place} onSelect={selectPlace} />)}</ul>}{hasCurrentQuery && status !== 'loading' && <div className="place-search__actions"><button type="button" className="place-search__more" onClick={searchMorePlaces}>Search more places</button>{(status === 'no-local' || status === 'empty') && <p className="place-search__hint">Try a landmark and its area, e.g. Nations Trust Bank Kotahena or Jaffna Hindu College.</p>}</div>}<button type="button" className="place-search__map" onClick={onPickMap}>Can&apos;t find it? Pick on map</button>{error && <p className="field-error">{error}</p>}</div>
}

function TrainStationSearchField({ id, label, value, onChange, onSelect, selectedPlace, error }) {
  const query = value.trim().toLowerCase()
  const suggestions = query && placeInputValue(selectedPlace) !== value ? allTrainStations.filter((station) => station.toLowerCase().includes(query)) : []
  return <div className="input-field place-search"><label htmlFor={id}>{label}<span className="required"> *</span></label><input id={id} className="place-search__input" name={id} value={value} onChange={onChange} placeholder="Search Sri Lanka Railways stations" autoComplete="off" aria-autocomplete="list" aria-expanded={suggestions.length > 0} aria-controls={`${id}-suggestions`} aria-invalid={Boolean(error)} required />{query && placeInputValue(selectedPlace) !== value && suggestions.length === 0 && <p className="place-search__message">No matching Sri Lanka Railways station found.</p>}{suggestions.length > 0 && <ul id={`${id}-suggestions`} className="place-search__list" role="listbox">{suggestions.map((station) => <li key={station} role="option" aria-selected="false"><button type="button" className="place-search__option" onClick={() => onSelect(station)}><strong>{station}</strong></button></li>)}</ul>}{error && <p className="field-error">{error}</p>}</div>
}

export function HomePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ from: '', to: '', date: '', mode: 'train', passengers: 1 })
  const [places, setPlaces] = useState({ from: null, to: null })
  const [errors, setErrors] = useState({ from: '', to: '', date: '' })
  const [isSearching, setIsSearching] = useState(false)
  const [comingSoonMessage, setComingSoonMessage] = useState('')
  const [mapField, setMapField] = useState(null)
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
      setMapField(null)
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
  const selectTrainStation = (field, station) => {
    const stationPlace = getTrainStationPlace(station)
    if (!stationPlace) return
    selectPlace(field, stationPlace)
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
  const showComingSoon = (label) => setComingSoonMessage(`${label} comparisons are coming soon.`)

  return <main className="page"><AuthenticatedTopbar><span>Plan with confidence</span></AuthenticatedTopbar><section className="home-hero"><div className="home-hero__overlay"><p>Compare every way to get there.</p></div></section><div className="content home-content"><FormSectionWrapper title="Plan your journey" subtitle="Find the best way to get where you need to go."><form onSubmit={submit}><fieldset className="mode-selector"><legend>Preferred transport</legend><div className="mode-grid">{modes.map((mode) => { const imageSrc = modeImages[mode.id]; const isSelected = form.mode === mode.id; return <label className={`mode-choice ${isSelected ? 'mode-choice--active' : ''}`} key={mode.id} aria-label={`${mode.name}${isSelected ? ', selected' : ''}`}><input type="radio" name="mode" value={mode.id} checked={isSelected} aria-checked={isSelected} onChange={changeMode} />{isSelected && <span className="selection-badge">✓ Selected</span>}<span className="mode-choice__icon">{imageSrc && <img src={imageSrc} alt="" style={{ width: 116, height: 116, borderRadius: '50%', objectFit: 'cover' }} />}</span><span className="mode-choice__label">{mode.name}</span></label> })}</div><p className="field-helper">You can compare and switch modes on the next screen.</p></fieldset>{isTrainMode ? <div key="train-stations"><TrainStationSearchField id="from" label="From" value={form.from} onChange={changePlace} onSelect={(station) => selectTrainStation('from', station)} selectedPlace={places.from} error={errors.from} /><TrainStationSearchField id="to" label="To" value={form.to} onChange={changePlace} onSelect={(station) => selectTrainStation('to', station)} selectedPlace={places.to} error={errors.to} /></div> : <div key="general-places"><PlaceSearchField id="from" label="From" value={form.from} onChange={changePlace} onSelect={(place) => selectPlace('from', place)} selectedPlace={places.from} error={errors.from} onPickMap={() => setMapField('from')} /><PlaceSearchField id="to" label="To" value={form.to} onChange={changePlace} onSelect={(place) => selectPlace('to', place)} selectedPlace={places.to} error={errors.to} onPickMap={() => setMapField('to')} /></div>}<InputField id="date" name="date" label="Travel date" type="date" min={today} value={form.date} onChange={change} error={errors.date} required /><InputField id="passengers" name="passengers" label="Passengers" type="number" min="1" max="100" value={form.passengers} onChange={change} required /><Button type="submit" className="full-width" disabled={isSearching}>{isSearching ? 'Finding options…' : 'Compare journeys'}</Button></form></FormSectionWrapper><Link to="/journey" className="journey-card"><span className="journey-card__thumb" aria-hidden="true"><span>▶</span></span><span className="journey-card__text"><small>Explore in 3D</small><strong>Journey across Sri Lanka</strong><span>Colombo, Sigiriya, Kandy, Ella and Galle in five stops.</span></span><span className="journey-card__arrow" aria-hidden="true">→</span></Link><section className="home-extra-section" aria-labelledby="quick-links-title"><h2 id="quick-links-title">Helpful travel links</h2><div className="quick-access-grid">{quickLinks.map((link) => <a className="quick-access-card" key={link.label} href={link.href} target="_blank" rel="noreferrer"><img className="quick-access-card__icon" src={link.image} alt="" /><strong>{link.label}</strong><span>{link.detail}</span></a>)}</div></section><section className="home-extra-section" aria-labelledby="coming-soon-title"><div className="home-extra-section__heading"><h2 id="coming-soon-title">Upcoming soon</h2><span>Under development</span></div><p className="field-helper">These travel options are not available yet. We are still developing them.</p><div className="coming-soon-grid">{comingSoonModes.map((mode) => <button className="coming-soon-tile" key={mode.label} type="button" onClick={() => showComingSoon(mode.label)}><span className="coming-soon-tile__icon"><img src={mode.image} alt="" /></span><span className="coming-soon-tile__label">{mode.label}</span><span className="coming-soon-badge">Coming soon</span></button>)}</div>{comingSoonMessage && <p className="coming-soon-message" role="status">{comingSoonMessage}</p>}</section><StatsHighlight stats={homeStats} /></div>{mapField && <PlacePickerMapModal initialPlace={places[mapField]} onClose={() => setMapField(null)} onSelect={(place) => { selectPlace(mapField, place); setMapField(null) }} />}</main>
}