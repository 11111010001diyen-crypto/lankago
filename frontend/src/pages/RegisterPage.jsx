import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { FormSectionWrapper } from '../components/FormSectionWrapper'
import { InputField } from '../components/InputField'
import { emailErrorMessage, emailHelperText, hasOnlyValidNameCharacters, isValidEmail, isValidName, nameErrorMessage, normalizeEmail, sanitizeName } from '../utils/validation'
import { api } from '../services/api'

const IslandHero3D = lazy(() => import('../components/IslandHero3D'))

export function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
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
    setIsSubmitting(true)
    try {
      const result = await api('/api/auth/register', { method: 'POST', body: { full_name: trimmedName, email: trimmedEmail, phone: form.phone.replace(/\D/g, ''), password: form.password } })
      setSuccessMessage(result.message)
    } catch (requestError) { setError(requestError.message) } finally { setIsSubmitting(false) }
  }

  return <main className="page register-page"><header className="register-topbar"><div className="brand">Lanka<span>Go</span><small>SMART TRAVEL, SIMPLIFIED</small></div><Link to="/login">Already a member? <strong>Log in</strong></Link></header><section className="register-hero"><div className="register-hero__overlay"><div><p>YOUR NEXT ADVENTURE STARTS HERE</p><h1>Start your journey with LankaGo</h1><span>One account for smarter, simpler travel across Sri Lanka.</span></div><Suspense fallback={null}><IslandHero3D className="island-hero-3d--register" /></Suspense></div></section><div className="register-content"><FormSectionWrapper title="Create your account" subtitle="Start planning smoother journeys across Sri Lanka.">{successMessage && <p className="auth-message">{successMessage} Redirecting to Login…</p>}<form noValidate onSubmit={submit}><InputField id="name" name="name" label="Full name" value={form.name} onChange={changeName} placeholder="Enter your full name" error={nameError} required /><InputField id="email" name="email" label="Email address" type="email" value={form.email} onChange={changeEmail} placeholder="name@example.com" helperText={emailHelperText} error={emailError} required maxLength={254} autoComplete="email" /><InputField id="phone" name="phone" label="Phone number" type="tel" value={form.phone} onChange={change} placeholder="077 123 4567" required /><InputField id="password" name="password" label="Password" type="password" value={form.password} onChange={change} placeholder="Create a password" required /><InputField id="confirmPassword" name="confirmPassword" label="Confirm password" type="password" value={form.confirmPassword} onChange={change} placeholder="Repeat your password" error={error} required /><Button type="submit" disabled={isSubmitting || Boolean(successMessage)} className="full-width">{isSubmitting ? 'Creating account...' : successMessage ? 'Account created' : 'Create account'}</Button></form><p className="form-footer">Already have an account? <Link to="/login">Log in</Link></p></FormSectionWrapper></div></main>
}