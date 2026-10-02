import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ConfirmationPage } from './pages/ConfirmationPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { PassengerDetailsPage } from './pages/PassengerDetailsPage'
import { PaymentPage } from './pages/PaymentPage'
import { RegisterPage } from './pages/RegisterPage'
import { ResultsPage } from './pages/ResultsPage'

function App() {
  return <BrowserRouter><Routes><Route path="/register" element={<RegisterPage />} /><Route path="/login" element={<LoginPage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route path="/home" element={<HomePage />} /><Route path="/results" element={<ResultsPage />} /><Route path="/passenger-details" element={<PassengerDetailsPage />} /><Route path="/payment" element={<PaymentPage />} /><Route path="/confirmation" element={<ConfirmationPage />} /><Route path="*" element={<Navigate to="/register" replace />} /></Routes></BrowserRouter>
}
export default App