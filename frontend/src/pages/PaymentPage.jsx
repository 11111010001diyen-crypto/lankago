import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { AuthenticatedTopbar } from '../components/AuthenticatedTopbar'
import { FormSectionWrapper } from '../components/FormSectionWrapper'
import { InputField } from '../components/InputField'
import { JourneyRoute } from '../components/JourneyRoute'
import { useAuth } from '../context/AuthContext'
import { pricingBreakdown, quoteQuantitySummary } from '../logic/pricing'
import { api } from '../services/api'
import { getPassengerDetailsError } from '../utils/bookingValidation'

const cardNumberError = 'Enter a demo card number with 12 to 19 digits'
const expiryError = 'Enter a demo expiry date in MM/YY format'
const cvvError = 'Enter a 3 or 4 digit demo CVV'

export function PaymentPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { token } = useAuth()
  const { search, option, passenger } = location.state || {}
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '' })
  const [errors, setErrors] = useState({ number: '', expiry: '', cvv: '' })
  const [simulateFailure, setSimulateFailure] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  if (!option || !passenger || !search) return <Navigate to="/home" replace />

  const changeCardNumber = (event) => setCard((current) => ({ ...current, number: event.target.value.replace(/\D/g, '').slice(0, 19) }))
  const changeCardExpiry = (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 4)
    setCard((current) => ({ ...current, expiry: digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits }))
  }
  const changeCardCvv = (event) => setCard((current) => ({ ...current, cvv: event.target.value.replace(/\D/g, '').slice(0, 4) }))
  const validateCard = () => {
    const nextErrors = { number: /^\d{12,19}$/.test(card.number) ? '' : cardNumberError, expiry: /^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry) ? '' : expiryError, cvv: /^\d{3,4}$/.test(card.cvv) ? '' : cvvError }
    setErrors(nextErrors)
    return !nextErrors.number && !nextErrors.expiry && !nextErrors.cvv
  }
  const submit = async (event) => {
    event.preventDefault()
    setPaymentError('')
    if (paymentMethod === 'card' && !validateCard()) return
    if (simulateFailure) { setPaymentError('Demo payment could not be completed. No payment has been taken — please review your details and try again.'); return }
    const bookingError = getPassengerDetailsError(search, option, passenger)
    if (bookingError) { setPaymentError(bookingError); return }
    setIsSaving(true)
    try {
      const booking = await api('/api/bookings', { method: 'POST', token, body: { from_location: search.fromPlace.fullAddress, to_location: search.toPlace.fullAddress, from_name: search.fromPlace.name, from_area: search.fromPlace.area, to_name: search.toPlace.name, to_area: search.toPlace.area, travel_date: search.date, mode: option.id, bus_type: option.id === 'bus' ? search.busSubType : null, train_class: option.id === 'train' ? search.trainClass : null, passengers: Number.parseInt(search.passengers, 10) || 1, from_latitude: search.fromPlace.latitude, from_longitude: search.fromPlace.longitude, to_latitude: search.toPlace.latitude, to_longitude: search.toPlace.longitude, departure_time: search.departureTime, weather: search.weather, lead_passenger_name: passenger.names[0], passenger_names: passenger.names, contact_number: passenger.contact, assistance_notes: passenger.notes, payment_method: paymentMethod } })
      navigate('/confirmation', { state: { booking, option } })
    } catch (requestError) { setPaymentError(requestError.message) } finally { setIsSaving(false) }
  }

  const passengerCount = Math.max(1, Number.parseInt(search.passengers, 10) || 1)
  const quantitySummary = quoteQuantitySummary(option.id, passengerCount, option.units, option.price)
  return <main className="page"><AuthenticatedTopbar><button className="text-button" onClick={() => navigate('/passenger-details', { state: { search, option } })}>← Back to passenger details</button></AuthenticatedTopbar><div className="content"><FormSectionWrapper title="Payment" subtitle="Complete this mock payment to confirm your journey."><JourneyRoute from={search.fromPlace} to={search.toPlace} className="journey-route--card" /><section className="payment-order-summary" aria-label="Order summary"><span>Booking summary</span><strong>{option.name}</strong><div><span>Booking quantity</span><strong>{quantitySummary}</strong></div><div><span>Fare calculation</span><strong>{pricingBreakdown(option.id, search.passengers, option.price)}</strong></div><div><span>Amount due</span><strong>LKR {option.totalPrice.toLocaleString()}</strong></div></section><form onSubmit={submit}><fieldset className="payment-methods"><legend>Payment method <span className="required">*</span></legend><label className={`payment-method ${paymentMethod === 'card' ? 'payment-method--selected' : ''}`}><input type="radio" name="payment-method" value="card" checked={paymentMethod === 'card'} onChange={() => { setPaymentMethod('card'); setPaymentError('') }} /> <span><strong>Card (Demo)</strong><small>Use any demo-formatted card details. No real payment is processed.</small></span></label><label className={`payment-method ${paymentMethod === 'cash' ? 'payment-method--selected' : ''}`}><input type="radio" name="payment-method" value="cash" checked={paymentMethod === 'cash'} onChange={() => { setPaymentMethod('cash'); setPaymentError('') }} /> <span><strong>Cash on boarding</strong><small>Demo choice — payment remains pending until boarding.</small></span></label></fieldset>{paymentMethod === 'card' && <fieldset className="demo-card-fields"><legend>Demo card details</legend><InputField id="card-number" name="number" label="Card number (Demo)" value={card.number} onChange={changeCardNumber} placeholder="4111111111111111" error={errors.number} required maxLength={19} inputMode="numeric" autoComplete="cc-number" /><div className="demo-card-fields__row"><InputField id="card-expiry" name="expiry" label="Expiry (MM/YY)" value={card.expiry} onChange={changeCardExpiry} placeholder="12/30" error={errors.expiry} required maxLength={5} inputMode="numeric" autoComplete="cc-exp" /><InputField id="card-cvv" name="cvv" label="CVV" type="password" value={card.cvv} onChange={changeCardCvv} placeholder="123" error={errors.cvv} required maxLength={4} inputMode="numeric" autoComplete="cc-csc" /></div></fieldset>}<label className="payment-method"><input type="checkbox" checked={simulateFailure} onChange={(event) => setSimulateFailure(event.target.checked)} /><span><strong>Simulate a failed demo payment</strong><small>Testing only — no booking will be saved.</small></span></label>{paymentError && <p className="payment-error">{paymentError}</p>}<Button type="submit" disabled={isSaving} className="full-width">{isSaving ? 'Saving booking...' : paymentMethod === 'card' ? 'Pay and confirm booking' : 'Confirm cash booking'}</Button></form></FormSectionWrapper></div></main>
}