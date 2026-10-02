import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { AuthenticatedTopbar } from '../components/AuthenticatedTopbar'
import { FormSectionWrapper } from '../components/FormSectionWrapper'
import { InputField } from '../components/InputField'

const cardNumberError = 'Enter a demo card number with 12 to 19 digits'
const expiryError = 'Enter a demo expiry date in MM/YY format'
const cvvError = 'Enter a 3 or 4 digit demo CVV'

export function PaymentPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { search, option, passenger } = location.state || {}
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '' })
  const [errors, setErrors] = useState({ number: '', expiry: '', cvv: '' })
  const [simulateFailure, setSimulateFailure] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  if (!option || !passenger) return <Navigate to="/home" replace />

  const changeCardNumber = (event) => setCard((current) => ({ ...current, number: event.target.value.replace(/\D/g, '').slice(0, 19) }))
  const changeCardExpiry = (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 4)
    setCard((current) => ({ ...current, expiry: digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits }))
  }
  const changeCardCvv = (event) => setCard((current) => ({ ...current, cvv: event.target.value.replace(/\D/g, '').slice(0, 4) }))
  const validateCard = () => {
    const nextErrors = {
      number: /^\d{12,19}$/.test(card.number) ? '' : cardNumberError,
      expiry: /^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry) ? '' : expiryError,
      cvv: /^\d{3,4}$/.test(card.cvv) ? '' : cvvError,
    }
    setErrors(nextErrors)
    return !nextErrors.number && !nextErrors.expiry && !nextErrors.cvv
  }
  const submit = (event) => {
    event.preventDefault()
    setPaymentError('')
    if (paymentMethod === 'card' && !validateCard()) return
    if (simulateFailure) {
      setPaymentError('Demo payment could not be completed. No payment has been taken — please review your details and try again.')
      return
    }
    navigate('/confirmation', { state: { success: true, option, passenger, paymentMethod } })
  }

  return <main className="page"><AuthenticatedTopbar><button className="text-button" onClick={() => navigate('/passenger-details', { state: { search, option } })}>← Back to passenger details</button></AuthenticatedTopbar><div className="content"><FormSectionWrapper title="Payment" subtitle="Complete this mock payment to confirm your journey."><section className="payment-order-summary" aria-label="Order summary"><span>Booking summary</span><strong>{option.name}</strong><div><span>Amount due</span><strong>LKR {option.price.toLocaleString()}</strong></div></section><form onSubmit={submit}><fieldset className="payment-methods"><legend>Payment method <span className="required">*</span></legend><label className={`payment-method ${paymentMethod === 'card' ? 'payment-method--selected' : ''}`}><input type="radio" name="payment-method" value="card" checked={paymentMethod === 'card'} onChange={() => { setPaymentMethod('card'); setPaymentError('') }} /> <span><strong>Card (Demo)</strong><small>Use any demo-formatted card details. No real payment is processed.</small></span></label><label className={`payment-method ${paymentMethod === 'cash' ? 'payment-method--selected' : ''}`}><input type="radio" name="payment-method" value="cash" checked={paymentMethod === 'cash'} onChange={() => { setPaymentMethod('cash'); setPaymentError('') }} /> <span><strong>Cash on boarding</strong><small>Demo choice — payment will be recorded as paid for this MVP.</small></span></label></fieldset>{paymentMethod === 'card' && <fieldset className="demo-card-fields"><legend>Demo card details</legend><InputField id="card-number" name="number" label="Card number (Demo)" value={card.number} onChange={changeCardNumber} placeholder="4111111111111111" error={errors.number} required maxLength={19} inputMode="numeric" autoComplete="cc-number" /><div className="demo-card-fields__row"><InputField id="card-expiry" name="expiry" label="Expiry (Demo)" value={card.expiry} onChange={changeCardExpiry} placeholder="MM/YY" error={errors.expiry} required maxLength={5} inputMode="numeric" autoComplete="cc-exp" /><InputField id="card-cvv" name="cvv" label="CVV (Demo)" value={card.cvv} onChange={changeCardCvv} placeholder="123" error={errors.cvv} required maxLength={4} inputMode="numeric" autoComplete="cc-csc" /></div></fieldset>}<label className="failure-toggle"><input type="checkbox" checked={simulateFailure} onChange={(event) => { setSimulateFailure(event.target.checked); setPaymentError('') }} /> Simulate payment failure <small>Demo control for this MVP</small></label>{paymentError && <p className="payment-error" role="alert">{paymentError}</p>}<Button type="submit" className="full-width">Pay now</Button></form></FormSectionWrapper></div></main>
}