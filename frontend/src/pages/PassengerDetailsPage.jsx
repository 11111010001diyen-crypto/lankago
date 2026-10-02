import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { AuthenticatedTopbar } from '../components/AuthenticatedTopbar'
import { FormSectionWrapper } from '../components/FormSectionWrapper'
import { InputField } from '../components/InputField'
import { JourneyRoute } from '../components/JourneyRoute'
import { hasOnlyValidNameCharacters, isValidName, nameErrorMessage, sanitizeName } from '../utils/validation'
import { getPricing, pricingBreakdown, quoteQuantitySummary } from '../logic/pricing'
import { getBookingSearchError } from '../utils/bookingValidation'

const contactErrorMessage = 'Enter a valid 10-digit phone number (e.g. 0712345678)'

export function PassengerDetailsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const search = location.state?.search
  const option = location.state?.option
  const passengerCount = Math.max(1, Number.parseInt(search?.passengers, 10) || 1)
  const isTicketBooking = option?.id === 'train' || option?.id === 'bus'
  const pricing = option ? getPricing(option.id, passengerCount, option.price) : null
  const nameCount = isTicketBooking ? passengerCount : 1
  const [form, setForm] = useState({ names: Array.from({ length: nameCount }, () => ''), contact: '', notes: '' })
  const [contactTouched, setContactTouched] = useState(false)
  const [nameErrors, setNameErrors] = useState(() => Array.from({ length: nameCount }, () => ''))
  const isValidContact = /^\d{10}$/.test(form.contact)

  if (!option || getBookingSearchError(search)) return <Navigate to="/home" replace />

  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  const changeContact = (event) => setForm({ ...form, contact: event.target.value.replace(/\D/g, '').slice(0, 10) })
  const changeName = (index, value) => {
    const names = [...form.names]
    const errors = [...nameErrors]
    names[index] = sanitizeName(value)
    errors[index] = hasOnlyValidNameCharacters(value) ? '' : nameErrorMessage
    setForm({ ...form, names })
    setNameErrors(errors)
  }
  const submit = (event) => {
    event.preventDefault()
    setContactTouched(true)
    const names = form.names.map((name) => name.trim())
    const errors = names.map((name) => isValidName(name) ? '' : nameErrorMessage)
    setNameErrors(errors)
    if (!isValidContact || errors.some(Boolean)) return
    navigate('/payment', { state: { search, option, passenger: { contact: form.contact, notes: form.notes, names } } })
  }

  const quantitySummary = quoteQuantitySummary(option.id, passengerCount, pricing.units, pricing.unitPrice)
  return <main className="page"><AuthenticatedTopbar><button className="text-button" onClick={() => navigate('/results', { state: { search } })}>← Back to options</button></AuthenticatedTopbar><div className="content"><FormSectionWrapper title="Passenger details" subtitle={`Booking your ${option.name} journey.`}><JourneyRoute from={search.fromPlace} to={search.toPlace} className="journey-route--card" /><section className="payment-order-summary"><span>Fare breakdown</span><strong>{pricingBreakdown(option.id, passengerCount, option.price)}</strong><div><span>Booking quantity</span><strong>{quantitySummary}</strong></div><div><span>Per person</span><strong>LKR {Math.round(option.perPersonCost).toLocaleString()}</strong></div></section><form onSubmit={submit}>{form.names.map((name, index) => <InputField key={index} id={`passenger-name-${index + 1}`} name={`passenger-name-${index + 1}`} label={isTicketBooking ? `Passenger ${index + 1}${index === 0 ? ' — Lead passenger' : ''}` : 'Lead passenger name'} value={name} onChange={(event) => changeName(index, event.target.value)} placeholder="Enter passenger's name" error={nameErrors[index]} required />)}<InputField id="contact" name="contact" label="Contact number" type="tel" value={form.contact} onChange={changeContact} onBlur={() => setContactTouched(true)} placeholder="0712345678" error={contactTouched && !isValidContact ? contactErrorMessage : ''} required maxLength={10} inputMode="numeric" autoComplete="tel-national" /><InputField id="notes" name="notes" label="Assistance notes (optional)" type="textarea" value={form.notes} onChange={change} placeholder="Let us know if you need any assistance" /><Button type="submit" disabled={!isValidContact} className="full-width">Continue to payment</Button></form></FormSectionWrapper></div></main>
}