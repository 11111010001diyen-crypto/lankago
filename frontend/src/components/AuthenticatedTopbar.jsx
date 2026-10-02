import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AuthenticatedTopbar({ children }) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return <header className="topbar"><div className="brand">Lanka<span>Go</span></div><div className="topbar__actions">{children}<button className="text-button" onClick={() => navigate('/my-bookings')}>My Bookings</button><button className="text-button" onClick={() => { logout(); navigate('/login', { replace: true }) }}>Log out</button></div></header>
}