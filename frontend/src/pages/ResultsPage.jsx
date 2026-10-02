import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import modes from '../../data/transportModes.json'
import trainImage from '../assets/icons/train.png'
import busImage from '../assets/icons/bus.png'
import carImage from '../assets/icons/car.png'
import threeWheelImage from '../assets/icons/three-wheel.png'
import { Button } from '../components/Button'
import { AuthenticatedTopbar } from '../components/AuthenticatedTopbar'
import { OptionCard } from '../components/OptionCard'
import { busSubTypes, getRecommendations, trainClasses } from '../logic/recommendation'
import { quoteQuantitySummary } from '../logic/pricing'
import { getBookingSearchError } from '../utils/bookingValidation'

const modeImages = { train: trainImage, bus: busImage, car: carImage, 'three-wheel': threeWheelImage }
const isWesternProvincePlace = (place) => place?.province?.toLowerCase().includes('western province')

export function ResultsPage() {
  const location = useLocation()
  const search = location.state?.search
  if (getBookingSearchError(search)) return <Navigate to="/home" replace />
  return <ResultsContent search={search} />
}

function ResultsContent({ search }) {
  const navigate = useNavigate()
  const isWesternProvinceRoute = isWesternProvincePlace(search.fromPlace) && isWesternProvincePlace(search.toPlace)
  const availableBusSubTypes = isWesternProvinceRoute ? busSubTypes : Object.fromEntries(Object.entries(busSubTypes).filter(([key]) => key !== 'Metro/City Bus'))
  const initialBusSubType = !isWesternProvinceRoute && search.busSubType === 'Metro/City Bus' ? 'CTB (Government)' : search.busSubType || 'CTB (Government)'
  const [busSubType, setBusSubType] = useState(initialBusSubType)
  const [trainClass, setTrainClass] = useState(search.trainClass || 'Third Class')
  const passengers = Math.max(1, Number.parseInt(search.passengers, 10) || 1)
  const isSurgeActive = ['Morning peak', 'Evening peak'].includes(search.departureTime) || search.weather === 'Rainy'
  const { options, explanation, directDistanceKm } = getRecommendations(modes, { ...search, busSubType, trainClass })
  const [selected, setSelected] = useState(options.find((option) => option.isRecommended).id)
  const selectedOption = options.find((option) => option.id === selected)
  const quantitySummary = quoteQuantitySummary(selectedOption.id, passengers, selectedOption.units, selectedOption.price)

  return <main className="page">
    <AuthenticatedTopbar><button className="text-button" onClick={() => navigate('/home')}>← Edit search</button></AuthenticatedTopbar>
    <div className="content results">
      <p className="eyebrow">{search.from} <span>→</span> {search.to}</p>
      <h1>Your journey options</h1>
      <p className="page-intro">Estimates for {search.date || 'your selected date'} · detected {search.departureTime} · detected {search.weather.toLowerCase()} weather · about {directDistanceKm} km direct distance.</p>
      {directDistanceKm < 3 && <aside className="travel-tip" role="status">Short trip: a Three-wheel or Car is usually the most practical.</aside>}
      {isSurgeActive && <aside className="travel-tip" role="status">Tip: Car and Three-wheel prices are typically lower during Midday or Night, or when it's not raining.</aside>}
      <aside className="smart-banner" role="status"><span aria-hidden="true">✦</span><div><strong>AI-assisted suggestion</strong><p>{explanation}</p></div></aside>
      <div className="options-list">
        {options.map((option) => <OptionCard
          key={option.id}
          imageSrc={modeImages[option.id]}
          modeId={option.id}
          modeName={option.name}
          adjustedDuration={option.adjustedDuration}
          trafficLevel={option.trafficLevel}
          price={option.price}
          totalPrice={option.totalPrice}
          estimatedCo2Kg={option.estimatedCo2Kg}
          isEcoFriendly={option.isEcoFriendly}
          passengers={passengers}
          isRecommended={option.isRecommended}
          isSelected={selected === option.id}
          isAvailable={option.isAvailable}
          unavailableMessage={option.unavailableMessage}
          stationRouteLabel={option.stationRouteLabel}
          onSelect={() => setSelected(option.id)}
          subOptions={option.isAvailable && (option.id === 'bus' ? availableBusSubTypes : option.id === 'train' ? trainClasses : null)}
          selectedSubOption={option.id === 'bus' ? busSubType : option.id === 'train' ? trainClass : ''}
          onSelectSubOption={option.id === 'bus' ? setBusSubType : option.id === 'train' ? setTrainClass : undefined}
        />)}
      </div>
      <div className="selection-summary">
        Selected: <strong>{selectedOption.name}{selectedOption.subOptionLabel ? ` · ${selectedOption.subOptionLabel}` : ''} · LKR {selectedOption.totalPrice.toLocaleString()} total</strong>
        <small className="selection-summary__helper">{quantitySummary}</small>
        <Button onClick={() => navigate('/passenger-details', { state: { search, option: selectedOption } })}>Continue</Button>
      </div>
    </div>
  </main>
}