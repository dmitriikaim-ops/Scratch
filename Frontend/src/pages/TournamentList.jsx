import { useState, useEffect } from 'react'
import { apiFetch } from '../api/auth.js'

export default function TournamentList({ user }) {
  const [tournaments, setTournaments] = useState([])

  useEffect(() => {
    apiFetch('/tournaments').then(r => r.json()).then(setTournaments)
  }, [])

  return (
    <div className="page">
      <header className="header">
        <h1>СКРЭТЧ</h1>
        {user && <span className="rating">⬛ {user.rating}</span>}
      </header>

      <div className="search">
        <input placeholder="Поиск по барам и датам..." />
      </div>

      <div className="list">
        {tournaments.map(t => (
          <TournamentCard key={t.id} tournament={t} />
        ))}
        {tournaments.length === 0 && (
          <div className="empty">Пока нет турниров. Создай первый!</div>
        )}
      </div>
    </div>
  )
}

function TournamentCard({ tournament: t }) {
  const date = new Date(t.dateTime).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className="card">
      <div className="card-title">{t.title}</div>
      <div className="card-venue">{t.venueName}</div>
      <div className="card-meta">
        <span>{date}</span>
        <span>{t.price > 0 ? `${t.price} ₽` : 'Бесплатно'}</span>
      </div>
    </div>
  )
}
