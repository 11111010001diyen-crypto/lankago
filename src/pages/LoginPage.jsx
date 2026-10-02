import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { FormSectionWrapper } from '../components/FormSectionWrapper'
import { InputField } from '../components/InputField'

export function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ identity: '', password: '' })
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value })

  return <main className="page login-page"><section className="login-hero"><div className="login-hero__content"><div className="login-hero__brand">Lanka<span>Go</span><small>SMART TRAVEL, SIMPLIFIED</small></div><div className="login-hero__copy"><p className="login-hero__eyebrow">Discover Sri Lanka, effortlessly</p><h1>Every journey, beautifully planned.</h1><p>Move with confidence from coast to hill country, with thoughtful travel suggestions at every turn.</p></div><div className="login-hero__features" aria-label="LankaGo benefits"><span>✦ Smart route ideas</span><span>✦ Clear travel choices</span><span>✦ Local journeys, simplified</span></div></div></section><section className="login-panel"><div className="login-panel__inner"><FormSectionWrapper title="Welcome back" subtitle="Log in to plan your next journey."><form onSubmit={(event) => { event.preventDefault(); navigate('/home') }}><InputField id="identity" name="identity" label="Email or phone number" value={form.identity} onChange={change} placeholder="you@example.com" required /><InputField id="password" name="password" label="Password" type="password" value={form.password} onChange={change} placeholder="Enter your password" required /><p className="forgot-password-link"><Link to="/forgot-password">Forgot password?</Link></p><Button type="submit" className="full-width">Log in</Button></form><p className="form-footer">New to LankaGo? <Link to="/register">Create an account</Link></p></FormSectionWrapper></div></section></main>
}