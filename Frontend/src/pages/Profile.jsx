// ╔══════════════════════════════════════════════════════════════╗
// ║  frontend/src/pages/Profile.jsx                              ║
// ╚══════════════════════════════════════════════════════════════╝
//
// Этот файл — экран "Профиль" в нижней навигации.
// App.jsx передаёт сюда объект user через пропс: <Profile user={user} />
// user содержит данные из таблицы users (см. schema.js)

import { useState, useEffect } from 'react'
import { apiFetch } from '../api/auth.js'

// ─────────────────────────────────────────────
// ГЛАВНЫЙ КОМПОНЕНТ: Profile
// ─────────────────────────────────────────────
// user — объект с данными текущего пользователя, пришедший из App.jsx
export default function Profile({ user }) {

  // useState — "ячейки памяти" компонента.
  // Когда данные в них меняются — React автоматически перерисовывает экран.
  const [tournaments, setTournaments]   = useState([])   // история турниров
  const [loadingHistory, setLoadingHistory] = useState(true) // идёт ли загрузка истории

  // useEffect запускается ОДИН РАЗ после того как компонент появился на экране.
  // Зависимость [user?.id] означает: "перезапусти если поменялся user.id"
  useEffect(() => {
    if (!user?.id) return // если user ещё не загрузился — ждём

    // Запрашиваем историю турниров этого пользователя с бэкенда
    // apiFetch — это обёртка над fetch() из api/auth.js, она добавляет JWT токен
    apiFetch(`/users/${user.id}/tournaments`)
      .then(r => r.json())
      .then(data => {
        // data — массив турниров. Если бэкенд вернул ошибку — ставим пустой массив
        setTournaments(Array.isArray(data) ? data : [])
      })
      .catch(() => setTournaments([]))        // если запрос упал — не ломаем страницу
      .finally(() => setLoadingHistory(false)) // в любом случае — загрузка окончена
  }, [user?.id])

  // Если user ещё не пришёл из App.jsx — показываем заглушку
  if (!user) {
    return (
      <div className="page profile-page">
        <div className="loading">Загрузка профиля...</div>
      </div>
    )
  }

  // Форматируем дату регистрации: "апрель 2025"
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    : null

  // ─── РЕНДЕР (то что видит пользователь) ───────────────────────
  return (
    <div className="page profile-page">

      {/* ── Шапка ── */}
      <header className="profile-header">
        <span className="profile-header-title">СКРЭТЧ</span>
      </header>

      {/* ── Аватар + имя + уровень ── */}
      <div className="profile-hero">
        <div className="profile-avatar-wrap">
          {/* Если у пользователя есть аватар из Telegram — показываем его.
              Если нет — показываем заглушку с первой буквой имени.
              Оператор ? называется "тернарный": если ДА ? то_это : иначе_то */}
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="Аватар"
              className="profile-avatar"
              // onError — если картинка не загрузилась, скрываем тег <img>
              // и вместо него покажется заглушка ниже (но это сложнее,
              // поэтому пока просто скрываем сломанный img)
              onError={e => { e.target.style.display = 'none' }}
            />
          ) : (
            <div className="profile-avatar-placeholder">
              {/* Берём первую букву имени и делаем заглавной */}
              {(user.firstName || user.username || '?')[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Имя пользователя */}
        <div className="profile-name">
          {user.firstName || user.username || 'Игрок'}
        </div>

        {/* Username в Telegram (со значком @) */}
        {user.username && (
          <div className="profile-username">@{user.username}</div>
        )}

      </div>

      {/* ── Статистика ── */}
      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat-value">{user.gamesCount ?? 0}</span>
          <span className="profile-stat-label">Игр сыграно</span>
        </div>

        {/* Вертикальный разделитель между блоками статистики */}
        <div className="profile-stat-divider" />

        <div className="profile-stat">
          {/* Количество турниров из истории */}
          <span className="profile-stat-value">{tournaments.length}</span>
          <span className="profile-stat-label">Турниров</span>
        </div>
      </div>

      {/* ── О себе ── */}
      {/* Показываем блок только если поле bio заполнено */}
      {user.bio && (
        <div className="profile-section">
          <div className="profile-section-title">О себе</div>
          <div className="profile-bio">{user.bio}</div>
        </div>
      )}

      {/* ── Контакты ── */}
      {/* Показываем блок только если есть хоть одно контактное поле */}
      {(user.instagram || memberSince) && (
        <div className="profile-section">
          <div className="profile-section-title">Контакты</div>
          <div className="profile-contacts">

            {/* Instagram — кликабельная ссылка */}
            {user.instagram && (
              <a
                href={`https://instagram.com/${user.instagram.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="profile-contact-row"
              >
                <span className="profile-contact-icon">📸</span>
                <span className="profile-contact-label">Instagram</span>
                <span className="profile-contact-value">@{user.instagram.replace('@', '')}</span>
              </a>
            )}

            {/* Дата регистрации — просто текст */}
            {memberSince && (
              <div className="profile-contact-row">
                <span className="profile-contact-icon">📅</span>
                <span className="profile-contact-label">В Скрэтче с</span>
                <span className="profile-contact-value">{memberSince}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── История турниров ── */}
      <div className="profile-section">
        <div className="profile-section-title">История турниров</div>

        {/* Пока данные грузятся — показываем текст-заглушку */}
        {loadingHistory ? (
          <div className="profile-empty">Загрузка...</div>
        ) : tournaments.length === 0 ? (
          // Турниров нет — мотивируем записаться
          <div className="profile-empty">
            Ты ещё не участвовал в турнирах.<br />Самое время начать! 🎱
          </div>
        ) : (
          // Есть турниры — рендерим список
          // .map() — проходит по каждому элементу массива и возвращает JSX
          <div className="profile-tournaments">
            {tournaments.map(t => (
              <TournamentRow key={t.id} tournament={t} />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────
// ВСПОМОГАТЕЛЬНЫЙ КОМПОНЕНТ: одна строка истории
// ─────────────────────────────────────────────
// Выделяем в отдельный компонент чтобы Profile не был перегружен.
// Принцип: каждый компонент делает одну вещь и делает её хорошо.
function TournamentRow({ tournament: t }) {
  // Форматируем дату турнира
  const date = new Date(t.dateTime).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long'
  })

  // Конфигурация статуса участия
  // Вместо if/else используем объект — это чище и короче
  const statusConfig = {
    registered: { label: 'Записан',  color: '#1DB954' },
    cancelled:  { label: 'Отменён', color: '#888'    },
  }
  const status = statusConfig[t.status] || statusConfig.registered

  return (
    <div className="profile-tournament-row">
      <div className="profile-tournament-info">
        <span className="profile-tournament-name">{t.title}</span>
        <span className="profile-tournament-meta">
          {t.venueName} · {date}
        </span>
      </div>
      {/* Статус записи с цветом */}
      <span style={{ fontSize: 12, color: status.color, fontWeight: 600 }}>
        {status.label}
      </span>
    </div>
  )
}
