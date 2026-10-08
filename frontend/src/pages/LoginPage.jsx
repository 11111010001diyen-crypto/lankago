import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { FormSectionWrapper } from '../components/FormSectionWrapper'
import { InputField } from '../components/InputField'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [form, setForm] = useState({ identity: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await login(form)
      navigate(location.state?.from || '/home', { replace: true })
    } catch (requestError) { setError(requestError.message) } finally { setIsSubmitting(false) }
  }

  return <main className="page login-page"><section className="login-hero"><div className="login-hero__content"><div className="login-hero__brand">Lanka<span>Go</span><small>SMART TRAVEL, SIMPLIFIED</small></div><div className="login-hero__copy"><p className="login-hero__eyebrow">Discover Sri Lanka, effortlessly</p><h1>Every journey, beautifully planned.</h1><p>Move with confidence from coast to hill country, with thoughtful travel suggestions at every turn.</p></div><div className="login-hero__features" aria-label="LankaGo benefits"><span>✦ Smart route ideas</span><span>✦ Clear travel choices</span><span>✦ Local journeys, simplified</span></div><Link to="/journey" className="login-hero__journey">Explore Sri Lanka in 3D <span aria-hidden="true">→</span></Link></div></section><section className="login-panel"><div className="login-panel__inner"><FormSectionWrapper title="Welcome back" subtitle="Log in to plan your next journey.">{location.state?.message && <p className="auth-message">{location.state.message}</p>}<form onSubmit={submit}><InputField id="identity" name="identity" label="Email or phone number" value={form.identity} onChange={change} placeholder="you@example.com" required /><InputField id="password" name="password" label="Password" type="password" value={form.password} onChange={change} placeholder="Enter your password" required /><p className="forgot-password-link"><Link to="/forgot-password">Forgot password?</Link></p>{error && <p className="payment-error">{error}</p>}<Button type="submit" disabled={isSubmitting} className="full-width">{isSubmitting ? 'Logging in...' : 'Log in'}</Button></form><p className="form-footer">New to LankaGo? <Link to="/register">Create an account</Link></p></FormSectionWrapper></div></section></main>
}