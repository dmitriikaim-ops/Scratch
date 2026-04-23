import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api/auth.js'

export default function TournamentList({ user }) {
  const [tournaments, setTournaments] = useState([])
  const [screen, setScreen]           = useState('list')
  const [selected, setSelected]       = useState(null) // турнир открытый в модалке

  const loadTournaments = useCallback(() => {
    apiFetch('/tournaments').then(r => r.json()).then(setTournaments)
  }, [])

  useEffect(() => {
    loadTournaments()
  }, [loadTournaments])

  return (
    <div className="page">

      {/* ── Экран создания турнира ── */}
      {screen === 'create' && (
        <CreateTournament
          user={user}
          onBack={() => setScreen('list')}
          onCreated={() => { setScreen('list'); loadTournaments() }}
        />
      )}

      {/* ── Лента турниров ── */}
      {screen === 'list' && (
        <>
          <header className="header">
            <h1>СКРЭТЧ</h1>
            <button className="btn-create" onClick={() => setScreen('create')}>+ Турнир</button>
          </header>

          <div className="search">
            <input placeholder="Поиск по барам и датам..." />
          </div>

          <div className="list">
            {tournaments.map(t => (
              <TournamentCard
                key={t.id}
                tournament={t}
                user={user}
                onOpen={() => setSelected(t)} // открываем модалку по нажатию на карточку
              />
            ))}
            {tournaments.length === 0 && (
              <div className="empty">Пока нет турниров. Создай первый!</div>
            )}
          </div>

          {/* ── Модальное окно турнира ── */}
          {/* Показываем только если selected не null */}
          {selected && (
            <TournamentModal
              tournament={selected}
              user={user}
              onClose={() => setSelected(null)}
              onJoined={loadTournaments} // обновляем счётчик после записи
            />
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Карточка турнира в ленте
// ─────────────────────────────────────────────
function TournamentCard({ tournament: t, user, onOpen }) {
  const date = new Date(t.dateTime).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
  })

  const isFull = t.participantsCount >= t.maxPlayers

  return (
    <div className="card" onClick={onOpen} style={{ cursor: 'pointer' }}>
      <div className="card-title">
        {t.title}
        {/* Бейдж — показываем если пользователь уже записан */}
        {t.isJoined && (
          <span style={{
            marginLeft: 8,
            fontSize: 11,
            fontWeight: 600,
            color: '#1DB954',
            border: '1px solid #1DB954',
            borderRadius: 20,
            padding: '2px 8px',
          }}>
            ✓ Иду
          </span>
        )}
      </div>
      <div className="card-venue">{t.venueName}</div>
      <div className="card-meta">
        <span>{date}</span>
        <span>{t.price > 0 ? `${t.price} ₽` : 'Бесплатно'}</span>
      </div>
      <div className="card-players" style={{ color: isFull ? '#888' : 'var(--accent)' }}>
        👥 {t.participantsCount} / {t.maxPlayers} игроков
        {isFull && ' — мест нет'}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Модальное окно турнира
// ─────────────────────────────────────────────
// Открывается снизу поверх ленты.
// Загружает полные данные турнира включая участников с профилями.
function TournamentModal({ tournament, user, onClose, onJoined }) {
  const [detail, setDetail]   = useState(null)  // полные данные с участниками
  const [loading, setLoading] = useState(true)
  const [joined, setJoined]   = useState(false)
  const [joining, setJoining] = useState(false) // идёт ли запрос записи

  // Загружаем полные данные турнира когда модалка открылась
  useEffect(() => {
    apiFetch(`/tournaments/${tournament.id}`)
      .then(r => r.json())
      .then(data => {
        setDetail(data)
        // Проверяем — не записан ли уже текущий пользователь
        const alreadyJoined = data.participants?.some(
          p => p.userId === user?.id && p.status !== 'cancelled'
        )
        setJoined(alreadyJoined)
      })
      .finally(() => setLoading(false))
  }, [tournament.id])

  const handleJoin = async () => {
    if (!user?.id) return
    setJoining(true)
    try {
      await apiFetch(`/tournaments/${tournament.id}/join`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id })
      })
      setJoined(true)
      onJoined() // обновляем счётчик в ленте
      // Перезагружаем участников чтобы новый участник появился сразу
      const updated = await apiFetch(`/tournaments/${tournament.id}`).then(r => r.json())
      setDetail(updated)
    } catch (e) {
      console.error('Ошибка записи', e)
    } finally {
      setJoining(false)
    }
  }

  const date = new Date(tournament.dateTime).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
  })

  const isFull = detail
    ? detail.participantsCount >= detail.maxPlayers
    : false

  // Организатор — участник у которого userId совпадает с organizerId турнира
  const organizer = detail?.participants?.find(
    p => p.userId === detail.organizerId
  )
  // Остальные участники без организатора
  const others = detail?.participants?.filter(
    p => p.userId !== detail.organizerId && p.status !== 'cancelled'
  ) || []

  return (
    <>
      {/* Затемнение фона — клик закрывает модалку */}
      <div onClick={onClose} style={styles.overlay} />

      {/* Само модальное окно */}
      <div style={styles.modal}>

        {/* Кнопка закрыть */}
        <button onClick={onClose} style={styles.closeBtn}>✕</button>

        {/* Скролл внутри модалки */}
        <div style={styles.modalScroll}>

          {/* ── Название и мета ── */}
          <div style={styles.modalTitle}>{tournament.title}</div>

          <div style={styles.metaRow}>
            <span style={styles.metaItem}>📍 {tournament.venueName}</span>
            <span style={styles.metaItem}>📅 {date}</span>
          </div>

          <div style={styles.metaRow}>
            <span style={styles.metaItem}>
              💰 {tournament.price > 0 ? `${tournament.price} ₽` : 'Бесплатно'}
            </span>
            <span style={{
              ...styles.metaItem,
              color: isFull ? '#888' : 'var(--accent)'
            }}>
              👥 {detail?.participantsCount ?? '...'} / {tournament.maxPlayers}
            </span>
          </div>

          {/* ── Описание от организатора ── */}
          {detail?.description && (
            <div style={styles.description}>
              {detail.description}
            </div>
          )}

          {loading ? (
            <div style={styles.loadingText}>Загрузка участников...</div>
          ) : (
            <>
              {/* ── Организатор ── */}
              {organizer && (
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>ОРГАНИЗАТОР</div>
                  <ParticipantRow participant={organizer} isOrganizer />
                </div>
              )}

              {/* ── Участники ── */}
              <div style={styles.section}>
                <div style={styles.sectionTitle}>
                  УЧАСТНИКИ {others.length > 0 && `· ${others.length}`}
                </div>
                {others.length === 0 ? (
                  <div style={styles.emptyText}>
                    Пока никого нет. Будь первым! 🎱
                  </div>
                ) : (
                  others.map(p => (
                    <ParticipantRow key={p.participationId} participant={p} />
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Кнопка записи — всегда внизу ── */}
        <div style={styles.footer}>
          <button
            style={{
              ...styles.joinBtn,
              ...(joined || isFull ? styles.joinBtnDisabled : {})
            }}
            onClick={handleJoin}
            disabled={joined || isFull || joining || !user?.id}
          >
            {joining ? 'Записываемся...'
              : joined ? '✓ Ты записан'
              : isFull ? 'Мест нет'
              : 'Записаться'}
          </button>
        </div>

      </div>
    </>
  )
}

// ─────────────────────────────────────────────
// Строка участника
// ─────────────────────────────────────────────
function ParticipantRow({ participant: p, isOrganizer }) {
  return (
    <div style={styles.participantRow}>
      {/* Аватар */}
      {p.avatarUrl ? (
        <img src={p.avatarUrl} alt={p.firstName} style={styles.avatar} />
      ) : (
        <div style={styles.avatarPlaceholder}>
          {(p.firstName || p.username || '?')[0].toUpperCase()}
        </div>
      )}

      {/* Имя и bio */}
      <div style={styles.participantInfo}>
        <div style={styles.participantName}>
          {p.firstName || p.username || 'Игрок'}
          {isOrganizer && (
            <span style={styles.organizerBadge}>орг</span>
          )}
        </div>
        {p.bio && (
          <div style={styles.participantBio}>{p.bio}</div>
        )}
        {/* Интересы */}
        {p.interests?.length > 0 && (
          <div style={styles.tagsRow}>
            {p.interests.slice(0, 3).map((tag, i) => (
              <span key={i} style={styles.tag}>{tag}</span>
            ))}
          </div>
        )}
        {/* Telegram */}
        {p.username && (
          <a
            href={`https://t.me/${p.username}`}
            target="_blank"
            rel="noreferrer"
            style={styles.tgLink}
            onClick={e => e.stopPropagation()}
          >
            ✈️ @{p.username}
          </a>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Форма создания турнира
// ─────────────────────────────────────────────
function CreateTournament({ user, onBack, onCreated }) {
  const [form, setForm] = useState({
    title: '', venueName: '', venueAddress: '',
    dateTime: '', price: '', maxPlayers: '8', description: ''
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    if (!form.title || !form.venueName || !form.dateTime) {
      alert('Заполни название, бар и дату!')
      return
    }
    if (!user?.id) {
      alert('Не удалось определить пользователя')
      return
    }
    await apiFetch('/tournaments', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        price:      Number(form.price),
        maxPlayers: Number(form.maxPlayers),
        organizerId: user.id
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
          <input name="title" placeholder="Открытый турнир на Рубинштейна" value={form.title} onChange={handleChange} />
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
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Взнос (₽)</label>
            <input name="price" placeholder="500" value={form.price} onChange={handleChange} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Макс. игроков</label>
            <input name="maxPlayers" placeholder="8" value={form.maxPlayers} onChange={handleChange} />
          </div>
        </div>
        {/* Поле описания — кого ищу, уровень, детали */}
        <div className="form-group">
          <label className="form-label">Описание (кого ищу, уровень игры...)</label>
          <textarea
            name="description"
            placeholder="Например: ищу игроков среднего уровня, будем играть пул 8"
            value={form.description}
            onChange={handleChange}
            rows={3}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '12px 14px',
              color: 'var(--text)',
              fontSize: '14px',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <button className="btn-submit" onClick={handleSubmit}>Создать турнир</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Стили модального окна
// (инлайн, чтобы не трогать styles.css)
// ─────────────────────────────────────────────
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 200,
  },
  modal: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 480,
    background: '#1a1a1a',
    borderRadius: '20px 20px 0 0',
    borderTop: '1px solid #2a2a2a',
    zIndex: 201,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    background: '#2a2a2a',
    border: 'none',
    color: '#888',
    width: 32,
    height: 32,
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    overflowY: 'auto',
    padding: '24px 16px 8px',
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 12,
    paddingRight: 40, // чтобы не налезало на кнопку закрыть
  },
  metaRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 6,
  },
  metaItem: {
    fontSize: 13,
    color: '#888',
  },
  description: {
    marginTop: 14,
    padding: '12px 14px',
    background: '#111',
    borderRadius: 10,
    fontSize: 14,
    color: '#ccc',
    lineHeight: 1.6,
    borderLeft: '2px solid #1DB954',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '1.5px',
    color: '#666',
    marginBottom: 10,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
    padding: '12px 0',
  },
  participantRow: {
    display: 'flex',
    gap: 12,
    paddingBottom: 14,
    marginBottom: 14,
    borderBottom: '1px solid #2a2a2a',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
    border: '1px solid #2a2a2a',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: '#2a2a2a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 700,
    color: '#1DB954',
    flexShrink: 0,
  },
  participantInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  participantName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  organizerBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: '#1DB954',
    border: '1px solid #1DB954',
    borderRadius: 20,
    padding: '1px 6px',
    letterSpacing: '0.5px',
  },
  participantBio: {
    fontSize: 13,
    color: '#888',
    lineHeight: 1.5,
  },
  tagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  tag: {
    fontSize: 11,
    color: '#1DB954',
    border: '1px solid rgba(29,185,84,0.4)',
    borderRadius: 20,
    padding: '2px 8px',
    background: 'rgba(29,185,84,0.07)',
  },
  tgLink: {
    fontSize: 12,
    color: '#4A9EFF',
    textDecoration: 'none',
    marginTop: 2,
  },
  footer: {
    padding: '12px 16px 28px',
    borderTop: '1px solid #2a2a2a',
  },
  joinBtn: {
    width: '100%',
    background: '#1DB954',
    color: '#000',
    border: 'none',
    borderRadius: 12,
    padding: '14px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  joinBtnDisabled: {
    background: '#2a2a2a',
    color: '#666',
    cursor: 'default',
  },
}
