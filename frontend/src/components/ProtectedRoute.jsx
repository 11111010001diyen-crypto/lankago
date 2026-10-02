import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <main className="page auth-page">Checking your session…</main>
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />
}