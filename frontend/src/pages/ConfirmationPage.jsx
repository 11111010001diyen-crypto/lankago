import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle2, Clock3 } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import trainImage from '../assets/icons/train.png'
import busImage from '../assets/icons/bus.png'
import carImage from '../assets/icons/car.png'
import threeWheelImage from '../assets/icons/three-wheel.png'
import { Button } from '../components/Button'
import { AuthenticatedTopbar } from '../components/AuthenticatedTopbar'
import { FormSectionWrapper } from '../components/FormSectionWrapper'
import { JourneyRoute } from '../components/JourneyRoute'
import { quoteQuantitySummary } from '../logic/pricing'

const transportImages = { train: trainImage, bus: busImage, car: carImage, 'three-wheel': threeWheelImage }

export function ConfirmationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { booking, option } = location.state || {}
  if (!booking) return <Navigate to="/my-bookings" replace />

  const isTicketBooking = booking.mode === 'train' || booking.mode === 'bus'
  const passengerNames = booking.passenger_names?.length ? booking.passenger_names : [booking.lead_passenger_name]
  const seatNumbers = booking.seat_numbers || []
  const transportImage = transportImages[booking.mode] || carImage
  const isCashOnBoarding = booking.payment_status === 'pending_cash'
  const paymentDetails = isCashOnBoarding ? { method: 'Cash on boarding', status: 'Pending (Pay on boarding)', statusClass: 'payment-status--pending', StatusIcon: Clock3 } : { method: 'Demo payment (mock)', status: 'Paid (Demo)', statusClass: '', StatusIcon: CheckCircle2 }
  const unitLabel = booking.unit_label || (isTicketBooking ? 'tickets' : 'vehicles')
  const unitName = booking.units === 1 ? unitLabel.slice(0, -1) : unitLabel
  const transportName = option?.name || booking.mode
  const quantitySummary = quoteQuantitySummary(booking.mode, booking.passengers, booking.units, booking.unit_price)

  return <main className="page confirmation-page"><AuthenticatedTopbar /><div className="content"><FormSectionWrapper title="Your journey is booked!" subtitle="Your LankaGo booking is confirmed." className="confirmation-card"><CheckCircle2 className="confirmation-status-icon confirmation-status-icon--success" aria-hidden="true" /><div className="ticket"><div><span>Booking reference</span><strong>{booking.booking_reference}</strong></div><div className="transport-ticket-detail"><span>Transport</span><strong><span className="transport-icon transport-icon--clear"><img src={transportImage} alt="" /></span>{transportName}</strong></div><div><span>Journey</span><JourneyRoute fromName={booking.from_name} fromArea={booking.from_area} fromFullAddress={booking.from_location} toName={booking.to_name} toArea={booking.to_area} toFullAddress={booking.to_location} discloseAddress /></div><div><span>Fare breakdown</span><strong>LKR {Number(booking.unit_price).toLocaleString()} {'×'} {booking.units} {unitName} = LKR {Number(booking.total_price).toLocaleString()}</strong></div><section className="payment-details" aria-labelledby="payment-heading"><h2 id="payment-heading">Payment</h2><div><span>Amount due</span><strong>LKR {Number(booking.total_price).toLocaleString()}</strong></div><div><span>Payment method</span><strong>{paymentDetails.method}</strong></div><div><span>Status</span><strong className={`payment-status ${paymentDetails.statusClass}`}><paymentDetails.StatusIcon aria-hidden="true" />{paymentDetails.status}</strong></div></section></div>{isTicketBooking ? <section className="ticket-manifest" aria-label="Individual traveller tickets">{passengerNames.map((name, index) => { const ticketReference = `${booking.booking_reference}-${index + 1}`; return <article className="passenger-ticket" key={ticketReference}><div><span>Ticket {index + 1}</span><strong>{name}</strong><small>Seat {seatNumbers[index] || 'To be assigned'}</small><small>{ticketReference}</small></div><div className="qr-code qr-code--compact" aria-label={`QR code for ticket ${ticketReference}`}><QRCodeSVG value={ticketReference} size={104} level="M" includeMargin /><small>Scan at boarding</small></div></article> })}</section> : <section className="group-booking"><div><span>Group booking</span><strong>{booking.lead_passenger_name}</strong><small>{quantitySummary}</small></div><div className="qr-code" aria-label={`QR code for booking reference ${booking.booking_reference}`}><QRCodeSVG value={booking.booking_reference} size={148} level="M" includeMargin /><small>Scan at boarding</small></div></section>}<p className="confirmation-copy">A confirmation for {booking.lead_passenger_name} has been saved to My Bookings.</p><Button onClick={() => navigate('/my-bookings')} className="full-width">View my bookings</Button></FormSectionWrapper></div></main>
}