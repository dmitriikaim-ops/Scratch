// Profile.jsx — экран профиля пользователя
// Показывает: аватар, имя, статистику, о себе, интересы, мои турниры, контакты

export default function Profile({ user }) {
  // Моковые данные — потом заменим реальными запросами к серверу
  const mockTournaments = [
    { id: 1, title: 'Открытый турнир на Рубинштейна', venueName: 'Бар Стрелка', dateTime: '2025-03-15T18:00:00' },
    { id: 2, title: 'Весенний кубок', venueName: 'Billiard Club SPb', dateTime: '2025-04-02T19:00:00' },
    { id: 3, title: 'Ночной турнир', venueName: 'Шар и кий', dateTime: '2025-04-20T21:00:00' },
  ]

  // Данные пользователя — берём из пропса, с запасными значениями
  const name      = user?.firstName  || 'Игрок'
  const username  = user?.username   ? `@${user.username}` : ''
  const avatar    = user?.avatarUrl  || null
  const rating    = user?.rating     ?? 1000
  const games     = user?.gamesCount ?? 0

  // Уровень игрока по рейтингу Elo
  const getLevel = (r) => {
    if (r >= 1400) return { label: 'Про',       color: '#FFD700' }
    if (r >= 1200) return { label: 'Опытный',   color: '#1DB954' }
    if (r >= 1000) return { label: 'Любитель',  color: '#4A9EFF' }
    return              { label: 'Новичок',    color: '#888'    }
  }
  const level = getLevel(rating)

  return (
    <div className="page profile-page">

      {/* ── Шапка ── */}
      <header className="profile-header">
        <h1 className="profile-header-title">Профиль</h1>
      </header>

      {/* ── Аватар + имя ── */}
      <div className="profile-hero">
        <div className="profile-avatar-wrap">
          {avatar
            ? <img src={avatar} alt={name} className="profile-avatar" />
            : <div className="profile-avatar profile-avatar-placeholder">
                {name.charAt(0).toUpperCase()}
              </div>
          }
        </div>
        <div className="profile-name">{name}</div>
        {username && <div className="profile-username">{username}</div>}
        <div className="profile-level-badge" style={{ color: level.color, borderColor: level.color }}>
          {level.label}
        </div>
      </div>

      {/* ── Статистика: рейтинг + игры ── */}
      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat-value">{rating}</span>
          <span className="profile-stat-label">Рейтинг Elo</span>
        </div>
        <div className="profile-stat-divider" />
        <div className="profile-stat">
          <span className="profile-stat-value">{games}</span>
          <span className="profile-stat-label">Игр сыграно</span>
        </div>
      </div>

      {/* ── О себе ── */}
      <section className="profile-section">
        <div className="profile-section-title">О себе</div>
        <div className="profile-bio">
          {user?.bio || 'Пока ничего не написано. Расскажи о себе!'}
        </div>
      </section>

      {/* ── Интересы ── */}
      <section className="profile-section">
        <div className="profile-section-title">Интересы</div>
        <div className="profile-tags">
          {(user?.interests || ['Пул', 'Снукер', 'Карамболь']).map((tag, i) => (
            <span key={i} className="profile-tag">{tag}</span>
          ))}
        </div>
      </section>

      {/* ── Мои турниры ── */}
      <section className="profile-section">
        <div className="profile-section-title">Мои турниры</div>
        <div className="profile-tournaments">
          {mockTournaments.length === 0
            ? <div className="profile-empty">Ты ещё не участвовал в турнирах</div>
            : mockTournaments.map(t => {
                const date = new Date(t.dateTime).toLocaleDateString('ru-RU', {
                  day: 'numeric', month: 'long'
                })
                return (
                  <div key={t.id} className="profile-tournament-row">
                    <div className="profile-tournament-info">
                      <span className="profile-tournament-name">{t.title}</span>
                      <span className="profile-tournament-meta">{t.venueName} · {date}</span>
                    </div>
                    <span className="profile-tournament-arrow">›</span>
                  </div>
                )
              })
          }
        </div>
      </section>

      {/* ── Контакты ── */}
      <section className="profile-section">
        <div className="profile-section-title">Контакты</div>
        <div className="profile-contacts">
          {username && (
            <a
              href={`https://t.me/${user.username}`}
              className="profile-contact-row"
              target="_blank"
              rel="noreferrer"
            >
              <span className="profile-contact-icon">✈️</span>
              <span className="profile-contact-label">Telegram</span>
              <span className="profile-contact-value">{username}</span>
            </a>
          )}
          {user?.instagram
            ? (
              <a
                href={`https://instagram.com/${user.instagram}`}
                className="profile-contact-row"
                target="_blank"
                rel="noreferrer"
              >
                <span className="profile-contact-icon">📸</span>
                <span className="profile-contact-label">Instagram</span>
                <span className="profile-contact-value">@{user.instagram}</span>
              </a>
            )
            : (
              <div className="profile-contact-row profile-contact-empty">
                <span className="profile-contact-icon">📸</span>
                <span className="profile-contact-label">Instagram</span>
                <span className="profile-contact-value muted">не указан</span>
              </div>
            )
          }
        </div>
      </section>

    </div>
  )
}
