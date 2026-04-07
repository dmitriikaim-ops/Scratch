const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function authWithTelegram() {
  const tg = window.Telegram?.WebApp
  const initData = tg?.initData || ''
  const res = await fetch(BASE_URL + '/auth/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData })
  })
  return res.json()
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token')
  return fetch(BASE_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    }
  })
}
