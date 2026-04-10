const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function authWithTelegram() {
  const tg = window.Telegram?.WebApp
tg?.ready()
const initData = tg?.initData || ''
  const res = await fetch(BASE_URL + '/auth/telegram', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    },
    body: JSON.stringify({ initData })
  })
  return res.json()
}

export async function fetchMe() {
  const token = localStorage.getItem('token')
  if (!token) return null
  const res = await fetch(BASE_URL + '/users/me', {
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) return null
  return res.json()
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token')
  return fetch(BASE_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    }
  })
}