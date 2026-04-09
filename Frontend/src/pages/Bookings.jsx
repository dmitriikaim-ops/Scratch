// Bookings.jsx — экран «Мои записи»
// Показывает предстоящие турниры пользователя с возможностью отмены

import { useState, useEffect } from 'react'
import { apiFetch } from '../api/auth.js'

export default function Bookings({ user }) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)

  // Загружаем записи при открытии экрана
  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/users/me/participations')
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Ошибка загрузки записей', e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  // Отмена записи на турнир
  const handleCancel = async (participationId) => {
    const ok = window.confirm('Отменить запись на турнир?')
    if (!ok) return

    await apiFetch(`/tournaments/participations/${participationId}/cancel`, {
      method: 'PATCH'
    })

    // Перезагружаем список после отмены
    loadBookings()
  }

  if (loading) return <div className="loading">Загрузка...</div>

  return (
    <div className="page">
      <header className="header">
        <h1>МОИ ЗАПИСИ</h1>
      </header>

      {items.length === 0 ? (
        <div className="empty">
          Нет предстоящих турниров.<br />
          Запишись на турнир в ленте!
        </div>
      ) : (
        <div className="list">
          {items.map(item => (
            <BookingCard
              key={item.participationId}
              item={item}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BookingCard({ item, onCancel }) {
  const date = new Date(item.dateTime).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
  })

  const isCancelled = item.status === 'cancelled'

  return (
    <div className={`card booking-card ${isCancelled ? 'booking-cancelled' : ''}`}>
      <div className="card-title">{item.title}</div>
      <div className="card-venue">{item.venueName}</div>
      <div className="card-meta">
        <span>📅 {date}</span>
        <span className={`booking-status ${isCancelled ? 'status-cancelled' : 'status-active'}`}>
          {isCancelled ? '✕ Отменил' : '✓ Иду'}
        </span>
      </div>
      {!isCancelled && (
        <button
          className="btn-cancel"
          onClick={() => onCancel(item.participationId)}
        >
          Отменить запись
        </button>
      )}
    </div>
  )
}
