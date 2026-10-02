import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ConfirmationPage } from './pages/ConfirmationPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { MyBookingsPage } from './pages/MyBookingsPage'
import { PassengerDetailsPage } from './pages/PassengerDetailsPage'
import { PaymentPage } from './pages/PaymentPage'
import { RegisterPage } from './pages/RegisterPage'
import { ResultsPage } from './pages/ResultsPage'

function App() {
  const protectedPage = (Page) => <ProtectedRoute><Page /></ProtectedRoute>
  return <BrowserRouter><AuthProvider><Routes><Route path="/register" element={<RegisterPage />} /><Route path="/login" element={<LoginPage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route path="/home" element={protectedPage(HomePage)} /><Route path="/results" element={protectedPage(ResultsPage)} /><Route path="/passenger-details" element={protectedPage(PassengerDetailsPage)} /><Route path="/payment" element={protectedPage(PaymentPage)} /><Route path="/confirmation" element={protectedPage(ConfirmationPage)} /><Route path="/my-bookings" element={protectedPage(MyBookingsPage)} /><Route path="*" element={<Navigate to="/register" replace />} /></Routes></AuthProvider></BrowserRouter>
}
export default App