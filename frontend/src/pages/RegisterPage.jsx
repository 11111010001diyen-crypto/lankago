import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { FormSectionWrapper } from '../components/FormSectionWrapper'
import { InputField } from '../components/InputField'
import { emailErrorMessage, emailHelperText, hasOnlyValidNameCharacters, isValidEmail, isValidName, nameErrorMessage, normalizeEmail, sanitizeName } from '../utils/validation'
import { api } from '../services/api'

export function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [termsError, setTermsError] = useState('')
  const [showPolicy, setShowPolicy] = useState(false)
  useEffect(() => {
    if (!showPolicy) return undefined
    const onKey = (event) => { if (event.key === 'Escape') setShowPolicy(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showPolicy])
  useEffect(() => {
    if (!successMessage) return undefined
    const redirectTimer = window.setTimeout(() => navigate('/login', { state: { message: successMessage } }), 2200)
    return () => window.clearTimeout(redirectTimer)
  }, [navigate, successMessage])
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  const changeName = (event) => {
    const { value } = event.target
    setForm({ ...form, name: sanitizeName(value) })
    setNameError(hasOnlyValidNameCharacters(value) ? '' : nameErrorMessage)
  }
  const changeEmail = (event) => {
    setForm({ ...form, email: event.target.value })
    if (emailError) setEmailError('')
  }
  const submit = async (event) => {
    event.preventDefault()
    const trimmedName = form.name.trim()
    const trimmedEmail = normalizeEmail(form.email)
    const nextNameError = isValidName(trimmedName) ? '' : nameErrorMessage
    const nextEmailError = isValidEmail(trimmedEmail) ? '' : emailErrorMessage
    setNameError(nextNameError)
    setEmailError(nextEmailError)
    if (nextNameError || nextEmailError) return
    if (!event.currentTarget.reportValidity()) return
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.')
    setError('')
    if (!agreed) return setTermsError('Please agree to the Terms of Use and Privacy Policy to create an account.')
    setIsSubmitting(true)
    try {
      const result = await api('/api/auth/register', { method: 'POST', body: { full_name: trimmedName, email: trimmedEmail, phone: form.phone.replace(/\D/g, ''), password: form.password, accepted_terms: agreed } })
      setSuccessMessage(result.message)
    } catch (requestError) { setError(requestError.message) } finally { setIsSubmitting(false) }
  }

  return <main className="page register-page"><header className="register-topbar"><div className="brand">Lanka<span>Go</span><small>SMART TRAVEL, SIMPLIFIED</small></div><Link to="/login">Already a member? <strong>Log in</strong></Link></header><section className="register-hero"><div className="register-hero__overlay"><div><p>YOUR NEXT ADVENTURE STARTS HERE</p><h1>Start your journey with LankaGo</h1><span>One account for smarter, simpler travel across Sri Lanka.</span></div></div></section><div className="register-content"><FormSectionWrapper title="Create your account" subtitle="Start planning smoother journeys across Sri Lanka.">{successMessage && <p className="auth-message">{successMessage} Redirecting to Login…</p>}<form noValidate onSubmit={submit}><InputField id="name" name="name" label="Full name" value={form.name} onChange={changeName} placeholder="Enter your full name" error={nameError} required /><InputField id="email" name="email" label="Email address" type="email" value={form.email} onChange={changeEmail} placeholder="name@example.com" helperText={emailHelperText} error={emailError} required maxLength={254} autoComplete="email" /><InputField id="phone" name="phone" label="Phone number" type="tel" value={form.phone} onChange={change} placeholder="077 123 4567" required /><InputField id="password" name="password" label="Password" type="password" value={form.password} onChange={change} placeholder="Create a password" required /><InputField id="confirmPassword" name="confirmPassword" label="Confirm password" type="password" value={form.confirmPassword} onChange={change} placeholder="Repeat your password" error={error} required /><div className="consent"><label className="consent__check"><input type="checkbox" checked={agreed} onChange={(event) => { setAgreed(event.target.checked); if (event.target.checked) setTermsError('') }} aria-describedby="consent-data" aria-invalid={Boolean(termsError)} /><span>I agree to LankaGo's <button type="button" className="consent__link" onClick={() => setShowPolicy(true)}>Terms of Use</button> and <button type="button" className="consent__link" onClick={() => setShowPolicy(true)}>Privacy Policy</button>.</span></label><p id="consent-data" className="consent__data"><strong>How we use your data:</strong> Your name, email, phone number and booking details are stored securely in a Supabase database and are used only to create your account, manage your bookings and show them in My Bookings. Passwords are handled by Supabase Auth and are never visible to us. This is a demo, so no real payments are taken and card details are never saved. Your data is not sold or shared with third parties, except the services that run LankaGo (Supabase for the database and login, and Vercel for hosting). Place searches are sent to OpenStreetMap without any personal details.</p>{termsError && <p className="field-error consent__error" role="alert">{termsError}</p>}</div><Button type="submit" disabled={isSubmitting || Boolean(successMessage)} className="full-width">{isSubmitting ? 'Creating account...' : successMessage ? 'Account created' : 'Create account'}</Button></form><p className="form-footer">Already have an account? <Link to="/login">Log in</Link></p></FormSectionWrapper></div>{showPolicy && <div className="policy-overlay" onClick={() => setShowPolicy(false)}><div className="policy" role="dialog" aria-modal="true" aria-labelledby="policy-title" onClick={(event) => event.stopPropagation()}><h2 id="policy-title">Terms of Use and Privacy Policy</h2><p className="policy__date">LankaGo · BUS4012 student project · Last updated 15 October 2026</p><h3>Terms of Use</h3><ul><li>LankaGo is a student demonstration app. Journey times and prices are estimates only.</li><li>Bookings and payments are demos: no real tickets are issued and no money is taken.</li><li>Use a real email you can access, and keep your password private.</li><li>Please do not enter real card numbers. Use the demo card shown on the payment page.</li></ul><h3>Privacy Policy</h3><ul><li><strong>What we collect:</strong> your name, email and phone number, and the bookings you make (route, date, passenger names, contact number and assistance notes).</li><li><strong>Why:</strong> only to create your account, manage your bookings and show them in My Bookings.</li><li><strong>Security:</strong> data is stored in Supabase with row-level security, so each user can only see their own bookings. Passwords are handled by Supabase Auth.</li><li><strong>Card details:</strong> never sent to or stored by LankaGo.</li><li><strong>Sharing:</strong> not sold or shared, except with the services that run LankaGo: Supabase (database and login) and Vercel (hosting). Place searches go to OpenStreetMap without personal details.</li><li><strong>Your consent:</strong> we record the date you agreed to these terms with your account.</li><li><strong>Deleting your data:</strong> contact the developer to have your account and bookings removed.</li></ul><Button type="button" className="full-width" onClick={() => setShowPolicy(false)}>Close</Button></div></div>}</main>
}