import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { AuthenticatedTopbar } from '../components/AuthenticatedTopbar'
import { FormSectionWrapper } from '../components/FormSectionWrapper'
import { InputField } from '../components/InputField'
import { hasOnlyValidNameCharacters, isValidName, nameErrorMessage, sanitizeName } from '../utils/validation'

const contactErrorMessage = 'Enter a valid 10-digit phone number (e.g. 0712345678)'

export function PassengerDetailsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const option = location.state?.option
  const [form, setForm] = useState({ name: '', contact: '', notes: '' })
  const [contactTouched, setContactTouched] = useState(false)
  const [nameError, setNameError] = useState('')
  const isValidContact = /^\d{10}$/.test(form.contact)

  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  const changeContact = (event) => {
    const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 10)
    setForm({ ...form, contact: digitsOnly })
  }
  const changeName = (event) => {
    const { value } = event.target
    setForm({ ...form, name: sanitizeName(value) })
    setNameError(hasOnlyValidNameCharacters(value) ? '' : nameErrorMessage)
  }
  const submit = (event) => {
    event.preventDefault()
    setContactTouched(true)
    const trimmedName = form.name.trim()
    const nextNameError = isValidName(trimmedName) ? '' : nameErrorMessage
    setNameError(nextNameError)
    if (!isValidContact || nextNameError) return
    navigate('/payment', { state: { search: location.state?.search, option, passenger: { ...form, name: trimmedName } } })
  }

  if (!option) return <Navigate to="/home" replace />

  return <main className="page"><AuthenticatedTopbar><button className="text-button" onClick={() => navigate('/results', { state: { search: location.state?.search } })}>← Back to options</button></AuthenticatedTopbar><div className="content"><FormSectionWrapper title="Passenger details" subtitle={`Booking your ${option.name} journey for LKR ${option.price.toLocaleString()}.`}><form onSubmit={submit}><InputField id="passenger-name" name="name" label="Passenger name" value={form.name} onChange={changeName} placeholder="Enter passenger's name" error={nameError} required /><InputField id="contact" name="contact" label="Contact number" type="tel" value={form.contact} onChange={changeContact} onBlur={() => setContactTouched(true)} placeholder="0712345678" error={contactTouched && !isValidContact ? contactErrorMessage : ''} required maxLength={10} inputMode="numeric" autoComplete="tel-national" /><InputField id="notes" name="notes" label="Assistance notes (optional)" type="textarea" value={form.notes} onChange={change} placeholder="Let us know if you need any assistance" /><Button type="submit" disabled={!isValidContact} className="full-width">Continue to payment</Button></form></FormSectionWrapper></div></main>
}