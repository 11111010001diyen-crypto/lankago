import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle2, CircleX, Clock3 } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import trainImage from '../assets/icons/train.png'
import busImage from '../assets/icons/bus.png'
import carImage from '../assets/icons/car.png'
import threeWheelImage from '../assets/icons/three-wheel.png'
import { Button } from '../components/Button'
import { AuthenticatedTopbar } from '../components/AuthenticatedTopbar'
import { FormSectionWrapper } from '../components/FormSectionWrapper'

const transportImages = { train: trainImage, bus: busImage, car: carImage, 'three-wheel': threeWheelImage }

export function ConfirmationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { success, option, passenger, paymentMethod } = location.state || {}

  if (success === undefined) return <Navigate to="/home" replace />

  if (!success) return <main className="page confirmation-page"><AuthenticatedTopbar /><div className="content"><FormSectionWrapper title="Booking could not be completed" subtitle="We could not reserve your journey this time." className="confirmation-card"><CircleX className="confirmation-status-icon confirmation-status-icon--failure" aria-hidden="true" /><p className="confirmation-copy">Please check your details and try again. No payment has been taken.</p><Button onClick={() => navigate('/passenger-details', { state: location.state })} className="full-width">Try again</Button></FormSectionWrapper></div></main>

  const reference = `LG-${String(option.price).slice(0, 2)}${String(passenger.contact).slice(-4) || '2026'}`
  const transportImage = transportImages[option.id] || carImage
  const passengerName = passenger?.name?.trim() || 'the passenger'
  const isCashOnBoarding = paymentMethod === 'cash'
  const paymentDetails = isCashOnBoarding ? { method: 'Cash on boarding', status: 'Pending (Pay on boarding)', statusClass: 'payment-status--pending', StatusIcon: Clock3 } : { method: 'Demo payment (mock)', status: 'Paid (Demo)', statusClass: '', StatusIcon: CheckCircle2 }

  return <main className="page confirmation-page"><AuthenticatedTopbar /><div className="content"><FormSectionWrapper title="Your journey is booked!" subtitle="Your LankaGo booking is confirmed." className="confirmation-card"><CheckCircle2 className="confirmation-status-icon confirmation-status-icon--success" aria-hidden="true" /><div className="ticket"><div><span>Booking reference</span><strong>{reference}</strong></div><div className="transport-ticket-detail"><span>Transport</span><strong><span className="transport-icon"><img src={transportImage} alt="" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} /></span>{option.name}</strong></div><div><span>Seat</span><strong>Seat 12A</strong></div><section className="payment-details" aria-labelledby="payment-heading"><h2 id="payment-heading">Payment</h2><div><span>Amount paid</span><strong>LKR {option.price.toLocaleString()}</strong></div><div><span>Payment method</span><strong>{paymentDetails.method}</strong></div><div><span>Status</span><strong className={`payment-status ${paymentDetails.statusClass}`}><paymentDetails.StatusIcon aria-hidden="true" />{paymentDetails.status}</strong></div></section></div><div className="qr-code" aria-label={`QR code for booking reference ${reference}`}><QRCodeSVG value={reference} size={148} level="M" includeMargin /><small>Scan at boarding</small></div><p className="confirmation-copy">A confirmation for {passengerName} has been prepared for your journey.</p><Button onClick={() => navigate('/home')} className="full-width">Return home</Button></FormSectionWrapper></div></main>
}