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
  const [joined, setJoined] = useState(false)

  const date = new Date(t.dateTime).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
  })

const handleJoin = async () => {
  await apiFetch(`/tournaments/${t.id}/join`, {
    method: 'POST',
    body: JSON.stringify({ userId: 1 })
  })
  setJoined(true)
}

  return (
    <div className="card">
      <div className="card-title">{t.title}</div>
      <div className="card-venue">{t.venueName}</div>
      <div className="card-meta">
        <span>{date}</span>
        <span>{t.price > 0 ? `${t.price} ₽` : 'Бесплатно'}</span>
      </div>
<div className ="card-players">
  👥 {t.participantsCount} / {t.maxPlayers} игроков
</div>
      <button className="btn-join" onClick={handleJoin} disabled={joined}>
        {joined ? '✓ Записан' : 'Записаться'}
      </button>
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
  if (!form.title || !form.venueName || !form.dateTime) {
    alert('Заполни название, бар и дату!')
    return
  }
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
        <button className="btn-back" onClick={onBack}>← Назад</button>
        <h1>Новый турнир</h1>
      </header>

      <div className="form">
  <div className="form-group">
    <label className="form-label">Название турнира</label>
    <input name="title" placeholder="Например: Открытый турнир на Рубинштейна" value={form.title} onChange={handleChange} />
  </div>
  <div className="form-group">
    <label className="form-label">Название бара</label>
    <input name="venueName" placeholder="Бар Стрелка" value={form.venueName} onChange={handleChange} />
  </div>
  <div className="form-group">
    <label className="form-label">Адрес</label>
    <input name="venueAddress" placeholder="ул. Рубинштейна 15" value={form.venueAddress} onChange={handleChange} />
  </div>
  <div className="form-group">
    <label className="form-label">Дата и время</label>
    <input name="dateTime" type="datetime-local" value={form.dateTime} onChange={handleChange} />
  </div>
  <div style={{display: 'flex', gap: '12px'}}>
    <div className="form-group" style={{flex: 1}}>
      <label className="form-label">Взнос (₽)</label>
      <input name="price" placeholder="500" value={form.price} onChange={handleChange} />
    </div>
    <div className="form-group" style={{flex: 1}}>
      <label className="form-label">Макс. игроков</label>
      <input name="maxPlayers" placeholder="8" value={form.maxPlayers} onChange={handleChange} />
    </div>
  </div>
  <button className="btn-submit" onClick={handleSubmit}>Создать турнир</button>
</div>
    </div>
  )
}