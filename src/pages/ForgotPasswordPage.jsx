import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { FormSectionWrapper } from '../components/FormSectionWrapper'
import { InputField } from '../components/InputField'
import { emailErrorMessage, emailHelperText, isValidEmail, normalizeEmail } from '../utils/validation'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const submit = (event) => {
    event.preventDefault()
    const trimmedEmail = normalizeEmail(email)
    if (!isValidEmail(trimmedEmail)) {
      setEmailError(emailErrorMessage)
      return
    }
    setEmailError('')
    setEmail(trimmedEmail)
    setIsSending(true)
    setTimeout(() => {
      setIsSending(false)
      setIsSent(true)
    }, 800)
  }

  return <main className="page forgot-password-page"><div className="forgot-password-content"><FormSectionWrapper title="Reset your password" subtitle="Enter your registered email and we’ll send you a reset link.">{isSent ? <div className="forgot-password-success"><CheckCircle2 className="forgot-password-success__icon" aria-hidden="true" /><p>If an account exists for that email, a password reset link has been sent. Please check your inbox.</p><Button onClick={() => navigate('/login')} className="full-width">Back to Login</Button></div> : <form noValidate onSubmit={submit}><InputField id="reset-email" name="email" label="Email address" type="email" value={email} onChange={(event) => { setEmail(event.target.value); if (emailError) setEmailError('') }} placeholder="name@example.com" helperText={emailHelperText} error={emailError} autoComplete="email" required maxLength={254} /><Button type="submit" disabled={isSending} className="full-width">{isSending ? 'Sending...' : 'Send reset link'}</Button></form>}</FormSectionWrapper></div></main>
}