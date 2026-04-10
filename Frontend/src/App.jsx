// App.jsx — корневой компонент
// Теперь он управляет навигацией: какой экран сейчас активен
// useState('tournaments') — стартовый экран

import { useState, useEffect } from 'react'
import { authWithTelegram, fetchMe } from './api/auth.js'
import TournamentList from './pages/TournamentList.jsx'
import Profile from './pages/Profile.jsx'
import Bookings from './pages/Bookings.jsx'

export default function App() {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('tournaments') // 'tournaments' | 'bookings' | 'profile'

  useEffect(() => {
    const init = async () => {
      try {
const result = await authWithTelegram()
console.log('Результат авторизации:', result)
if (result.token) {
  localStorage.setItem('token', result.token)
  setUser(result.user)
 try {
  const me = await fetchMe()
  if (me) setUser(me)
} catch(e) {
  console.log('fetchMe упал:', e)
}
} else {
  setUser(result.user || null)
}
      } catch (e) {
        console.error('Ошибка авторизации', e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  if (loading) return <div className="loading">Загрузка...</div>

  return (
    // Оборачиваем всё в один контейнер
    // tab — это «активная вкладка», она решает что показывать на экране
    <div>

      {/* ── Контент: меняется в зависимости от tab ── */}
      {tab === 'tournaments' && <TournamentList user={user} />}
      {tab === 'bookings' && <Bookings user={user} />}
      {tab === 'profile' && <Profile user={user} />}

      {/* ── Нижняя навигация (теперь живёт здесь, а не в TournamentList) ── */}
      {/* Важно: мы убрали навигацию из TournamentList.jsx и перенесли сюда */}
      {/* Так она всегда видна на любом экране */}
      <nav className="bottom-nav">
        <button
          className={`nav-item ${tab === 'tournaments' ? 'active' : ''}`}
          onClick={() => setTab('tournaments')}
        >
          <span className="nav-icon">🎱</span>
          <span>Турниры</span>
        </button>
        <button
          className={`nav-item ${tab === 'bookings' ? 'active' : ''}`}
          onClick={() => setTab('bookings')}
        >
          <span className="nav-icon">📋</span>
          <span>Мои записи</span>
        </button>
        <button
          className={`nav-item ${tab === 'profile' ? 'active' : ''}`}
          onClick={() => setTab('profile')}
        >
          <span className="nav-icon">👤</span>
          <span>Профиль</span>
        </button>
      </nav>

    </div>
  )
}
