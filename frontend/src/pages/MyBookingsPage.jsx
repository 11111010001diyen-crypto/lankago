import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'
import { AuthenticatedTopbar } from '../components/AuthenticatedTopbar'
import { Button } from '../components/Button'
import { FormSectionWrapper } from '../components/FormSectionWrapper'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { quoteQuantitySummary } from '../logic/pricing'
import trainImage from '../assets/icons/train.png'
import busImage from '../assets/icons/bus.png'
import carImage from '../assets/icons/car.png'
import threeWheelImage from '../assets/icons/three-wheel.png'

const modeLabels = { train: 'Train', bus: 'Bus', car: 'Car', 'three-wheel': 'Three-wheel' }
const transportImages = { train: trainImage, bus: busImage, car: carImage, 'three-wheel': threeWheelImage }

export function MyBookingsPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const loadBookings = async () => {
      try { setBookings(await api('/api/bookings', { token })) } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
    }
    loadBookings()
  }, [token])

  return <main className="page"><AuthenticatedTopbar><button className="text-button" onClick={() => navigate('/home')}>← Plan a journey</button></AuthenticatedTopbar><div className="content"><FormSectionWrapper title="My Bookings" subtitle="Your saved LankaGo journeys.">{loading ? <p className="page-intro">Loading your bookings…</p> : error ? <p className="payment-error">{error}</p> : bookings.length === 0 ? <div className="empty-bookings"><p>You do not have any saved bookings yet.</p><Button onClick={() => navigate('/home')}>Plan a journey</Button></div> : <div className="bookings-list">{bookings.map((booking) => { const isTicketBooking = booking.mode === 'train' || booking.mode === 'bus'; const service = booking.bus_type || booking.train_class; const transportImage = transportImages[booking.mode] || carImage; const passengerNames = booking.passenger_names?.length ? booking.passenger_names : [booking.lead_passenger_name]; const seatNumbers = booking.seat_numbers || []; const quantitySummary = quoteQuantitySummary(booking.mode, booking.passengers, booking.units, booking.unit_price); return <article className="booking-list-item" key={booking.booking_reference}><span className="booking-list-item__transport transport-icon transport-icon--clear" aria-hidden="true"><img src={transportImage} alt="" /></span><div className="booking-list-item__body"><span className="booking-list-item__reference">{booking.booking_reference}</span><strong>{booking.from_location} → {booking.to_location}</strong><small>{booking.travel_date} · {modeLabels[booking.mode]}{service ? ` · ${service}` : ''}</small><small>{quantitySummary}</small>{isTicketBooking ? <details className="booking-tickets"><summary>View passenger tickets</summary>{passengerNames.map((name, index) => { const ticketReference = `${booking.booking_reference}-${index + 1}`; return <div className="booking-ticket-row" key={ticketReference}><div><strong>{name}</strong><small>Seat {seatNumbers[index] || 'To be assigned'} · {ticketReference}</small></div><QRCodeSVG value={ticketReference} size={66} level="M" includeMargin title={`QR code for ${ticketReference}`} /></div> })}</details> : <div className="booking-group-qr"><div><strong>{booking.lead_passenger_name}</strong><small>{quantitySummary}</small></div><QRCodeSVG value={booking.booking_reference} size={66} level="M" includeMargin title={`QR code for ${booking.booking_reference}`} /></div>}</div><div className="booking-list-item__price"><strong>LKR {Number(booking.total_price).toLocaleString()}</strong><small>{booking.payment_status === 'paid_demo' ? 'Paid (Demo)' : 'Pending cash'}</small></div></article> })}</div>}</FormSectionWrapper></div></main>
}