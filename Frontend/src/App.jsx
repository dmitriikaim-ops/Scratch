import { useState, useEffect } from 'react'
import { authWithTelegram } from './api/auth.js'
import TournamentList from './pages/TournamentList.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // При запуске сразу авторизуемся через Telegram
    const init = async () => {
      try {
        const result = await authWithTelegram()
        setUser(result.user)
        localStorage.setItem('token', result.token)
      } catch (e) {
        console.error('Ошибка авторизации', e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  if (loading) return <div className="loading">Загрузка...</div>

  return <TournamentList user={user} />
}
