import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, clearSession, getSession, saveSession } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getSession)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const restore = async () => {
      if (!session?.access_token) { setLoading(false); return }
      try { setUser((await api('/api/auth/me', { token: session.access_token })).user) } catch { clearSession(); setSession(null) } finally { setLoading(false) }
    }
    restore()
  }, [session?.access_token])

  const value = useMemo(() => ({ user, loading, token: session?.access_token, async login(credentials) { const nextSession = await api('/api/auth/login', { method: 'POST', body: credentials }); saveSession(nextSession); setSession(nextSession); setUser((await api('/api/auth/me', { token: nextSession.access_token })).user) }, logout() { clearSession(); setSession(null); setUser(null) } }), [user, loading, session])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }