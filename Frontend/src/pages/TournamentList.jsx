import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api/auth.js'

export default function TournamentList({ user }) {
  const [tournaments, setTournaments] = useState([])
  const [screen, setScreen] = useState('list')

  const loadTournaments = useCallback(() => {
    apiFetch('/tournaments').then(r => r.json()).then(setTournaments)
  }, [])

  useEffect(() => {
    loadTournaments()
  }, [loadTournaments])

  return (
    <div className="page">
      {screen === 'create' && (
        <CreateTournament
          onBack={() => setScreen('list')}
          onCreated={() => { setScreen('list'); loadTournaments() }}
        />
      )}
      {screen === 'list' && (
        <>
          <header className="header">
            <h1>СКРЭТЧ</h1>
            <button className="btn-create" onClick={() => setScreen('create')}>+ Турнир</button>
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
        </>
      )}
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

function CreateTournament({ onBack, onCreated }) {
  const [form, setForm] = useState({
    title: '', venueName: '', venueAddress: '',
    dateTime: '', price: '', maxPlayers: '8'
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    await apiFetch('/tournaments', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
        maxPlayers: Number(form.maxPlayers),
        organizerId: 1
      })
    })
    onCreated()
  }

  return (
    <div className="page">
      <header className="header">
        <button onClick={onBack}>← Назад</button>
        <h1>Новый турнир</h1>
      </header>

      <div className="form">
        <input name="title" placeholder="Название турнира" value={form.title} onChange={handleChange} />
        <input name="venueName" placeholder="Название бара" value={form.venueName} onChange={handleChange} />
        <input name="venueAddress" placeholder="Адрес" value={form.venueAddress} onChange={handleChange} />
        <input name="dateTime" type="datetime-local" value={form.dateTime} onChange={handleChange} />
        <input name="price" placeholder="Взнос (₽)" value={form.price} onChange={handleChange} />
        <input name="maxPlayers" placeholder="Макс. игроков" value={form.maxPlayers} onChange={handleChange} />
        <button className="btn-submit" onClick={handleSubmit}>Создать турнир</button>
      </div>
    </div>
  )
}