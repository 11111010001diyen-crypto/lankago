import { useNavigate } from 'react-router-dom'

export function AuthenticatedTopbar({ children }) {
  const navigate = useNavigate()

  return <header className="topbar"><div className="brand">Lanka<span>Go</span></div><div className="topbar__actions">{children}<button className="text-button" onClick={() => navigate('/login', { replace: true })}>Log out</button></div></header>
}