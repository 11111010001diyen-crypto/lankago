const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:8000'
const SESSION_KEY = 'lankago_session'

export function getSession() {
  try { return JSON.parse(window.localStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
}

export function saveSession(session) { window.localStorage.setItem(SESSION_KEY, JSON.stringify(session)) }
export function clearSession() { window.localStorage.removeItem(SESSION_KEY) }

export function getApiErrorMessage(detail) {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const messages = detail.map((item) => {
      const field = Array.isArray(item?.loc) ? item.loc.at(-1) : ''
      return item?.msg ? `${field || 'Request'}: ${item.msg}` : ''
    }).filter(Boolean)
    if (messages.length) return messages.join('; ')
  }
  return 'Something went wrong. Please try again.'
}

export async function api(path, { method = 'GET', body, token, signal } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, { method, signal, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(getApiErrorMessage(data.detail))
  return data
}