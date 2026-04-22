// Bookings.jsx — экран «Мои записи»
// Показывает предстоящие турниры пользователя с возможностью отмены

import { useState, useEffect } from 'react'
import { apiFetch } from '../api/auth.js'

export default function Bookings({ user }) {
  const [items, setItems]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [cancelling, setCancelling] = useState(null) // id записи которую отменяем

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

  // Первый клик — показываем кнопки подтверждения
  const handleCancel = (participationId) => {
    setCancelling(participationId)
  }

  // Второй клик (подтверждение) — отправляем запрос
  const confirmCancel = async (participationId) => {
    await apiFetch(`/tournaments/participations/${participationId}/cancel`, {
      method: 'PATCH'
    })
    setCancelling(null)
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
              cancelling={cancelling}
              onCancel={handleCancel}
              onConfirmCancel={confirmCancel}
              onCancelDismiss={() => setCancelling(null)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BookingCard({ item, cancelling, onCancel, onConfirmCancel, onCancelDismiss }) {
  const date = new Date(item.dateTime).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
  })

  const isCancelled = item.status === 'cancelled'
  const isConfirming = cancelling === item.participationId // эта карточка в режиме подтверждения

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
        isConfirming ? (
          // Режим подтверждения — вместо confirm() показываем кнопки прямо в карточке
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, color: '#aaa', marginBottom: 8 }}>
              Точно отменить запись?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-cancel"
                style={{ flex: 1, background: '#c0392b' }}
                onClick={() => onConfirmCancel(item.participationId)}
              >
                Да, отменить
              </button>
              <button
                className="btn-cancel"
                style={{ flex: 1, background: '#2a2a2a', color: '#888' }}
                onClick={onCancelDismiss}
              >
                Нет
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn-cancel"
            onClick={() => onCancel(item.participationId)}
          >
            Отменить запись
          </button>
        )
      )}
    </div>
  )
}
