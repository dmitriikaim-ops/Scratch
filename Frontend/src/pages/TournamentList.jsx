import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api/auth.js'

export default function TournamentList({ user }) {
  const [tournaments, setTournaments] = useState([])
  const [screen, setScreen]           = useState('list')
  const [selected, setSelected]       = useState(null)

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
          user={user}
          onBack={() => setScreen('list')}
          onCreated={() => { setScreen('list'); loadTournaments() }}
        />
      )}

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
                onOpen={() => setSelected(t)}
              />
            ))}
            {tournaments.length === 0 && (
              <div className="empty">Пока нет турниров. Создай первый!</div>
            )}
          </div>

          {selected && (
            <TournamentModal
              tournament={selected}
              user={user}
              onClose={() => setSelected(null)}
              onJoined={loadTournaments}
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
        {t.isJoined && (
          <span style={{
            marginLeft: 8, fontSize: 11, fontWeight: 600,
            color: '#1DB954', border: '1px solid #1DB954',
            borderRadius: 20, padding: '2px 8px',
          }}>✓ Иду</span>
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
function TournamentModal({ tournament, user, onClose, onJoined }) {
  const [detail, setDetail]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [joined, setJoined]   = useState(false)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    apiFetch(`/tournaments/${tournament.id}`)
      .then(r => r.json())
      .then(data => {
        setDetail(data)
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
      onJoined()
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
  const isFull = detail ? detail.participantsCount >= detail.maxPlayers : false
  const organizer = detail?.participants?.find(p => p.userId === detail.organizerId)
  const others = detail?.participants?.filter(
    p => p.userId !== detail.organizerId && p.status !== 'cancelled'
  ) || []

  return (
    <>
      <div onClick={onClose} style={styles.overlay} />
      <div style={styles.modal}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
        <div style={styles.modalScroll}>
          <div style={styles.modalTitle}>{tournament.title}</div>
          <div style={styles.metaRow}>
            <span style={styles.metaItem}>📍 {tournament.venueName}</span>
            <span style={styles.metaItem}>📅 {date}</span>
          </div>
          <div style={styles.metaRow}>
            <span style={styles.metaItem}>
              💰 {tournament.price > 0 ? `${tournament.price} ₽` : 'Бесплатно'}
            </span>
            <span style={{ ...styles.metaItem, color: isFull ? '#888' : 'var(--accent)' }}>
              👥 {detail?.participantsCount ?? '...'} / {tournament.maxPlayers}
            </span>
          </div>
          {detail?.description && (
            <div style={styles.description}>{detail.description}</div>
          )}
          {loading ? (
            <div style={styles.loadingText}>Загрузка участников...</div>
          ) : (
            <>
              {organizer && (
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>ОРГАНИЗАТОР</div>
                  <ParticipantRow participant={organizer} isOrganizer />
                </div>
              )}
              <div style={styles.section}>
                <div style={styles.sectionTitle}>
                  УЧАСТНИКИ {others.length > 0 && `· ${others.length}`}
                </div>
                {others.length === 0 ? (
                  <div style={styles.emptyText}>Пока никого нет. Будь первым! 🎱</div>
                ) : (
                  others.map(p => <ParticipantRow key={p.participationId} participant={p} />)
                )}
              </div>
            </>
          )}
        </div>
        <div style={styles.footer}>
          <button
            style={{ ...styles.joinBtn, ...(joined || isFull ? styles.joinBtnDisabled : {}) }}
            onClick={handleJoin}
            disabled={joined || isFull || joining || !user?.id}
          >
            {joining ? 'Записываемся...' : joined ? '✓ Ты записан' : isFull ? 'Мест нет' : 'Записаться'}
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
      {p.avatarUrl ? (
        <img src={p.avatarUrl} alt={p.firstName} style={styles.avatar} />
      ) : (
        <div style={styles.avatarPlaceholder}>
          {(p.firstName || p.username || '?')[0].toUpperCase()}
        </div>
      )}
      <div style={styles.participantInfo}>
        <div style={styles.participantName}>
          {p.firstName || p.username || 'Игрок'}
          {isOrganizer && <span style={styles.organizerBadge}>орг</span>}
        </div>
        {p.bio && <div style={styles.participantBio}>{p.bio}</div>}
        {p.interests?.length > 0 && (
          <div style={styles.tagsRow}>
            {p.interests.slice(0, 3).map((tag, i) => (
              <span key={i} style={styles.tag}>{tag}</span>
            ))}
          </div>
        )}
        {p.username && (
          <a href={`https://t.me/${p.username}`} target="_blank" rel="noreferrer"
            style={styles.tgLink} onClick={e => e.stopPropagation()}>
            ✈️ @{p.username}
          </a>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// VenuePicker — выбор клуба из базы
// ─────────────────────────────────────────────
// Как работает:
// 1. При открытии загружает список клубов с /venues
// 2. Пользователь вводит текст — список фильтруется в реальном времени
// 3. При выборе клуба — name и address передаются наверх через onSelect
// 4. Кнопка «Другое место» позволяет ввести вручную
function VenuePicker({ onSelect }) {
  const [venues, setVenues]       = useState([])       // все клубы из БД
  const [query, setQuery]         = useState('')        // что вводит пользователь
  const [selected, setSelected]   = useState(null)     // выбранный клуб
  const [isCustom, setIsCustom]   = useState(false)    // режим ручного ввода
  const [customName, setCustomName]       = useState('')
  const [customAddress, setCustomAddress] = useState('')
  const [open, setOpen]           = useState(false)    // открыт ли дропдаун

  // Загружаем клубы один раз
  useEffect(() => {
    apiFetch('/venues')
      .then(r => r.json())
      .then(data => setVenues(Array.isArray(data) ? data : []))
      .catch(() => setVenues([]))
  }, [])

  // Фильтрация по названию и району
  const filtered = venues.filter(v =>
    v.name.toLowerCase().includes(query.toLowerCase()) ||
    (v.district || '').toLowerCase().includes(query.toLowerCase())
  )

  // Выбор клуба из списка
  const handleSelect = (venue) => {
    setSelected(venue)
    setQuery(venue.name)
    setOpen(false)
    setIsCustom(false)
    onSelect({ venueName: venue.name, venueAddress: venue.address, venueId: venue.id })
  }

  // Переключение в режим ручного ввода
  const handleCustom = () => {
    setIsCustom(true)
    setSelected(null)
    setOpen(false)
    setQuery('')
    onSelect({ venueName: '', venueAddress: '', venueId: null })
  }

  // Обновление при ручном вводе
  const handleCustomChange = (field, value) => {
    const updated = {
      customName:    field === 'name'    ? value : customName,
      customAddress: field === 'address' ? value : customAddress,
    }
    if (field === 'name')    setCustomName(value)
    if (field === 'address') setCustomAddress(value)
    onSelect({ venueName: updated.customName, venueAddress: updated.customAddress, venueId: null })
  }

  // Вернуться к выбору из списка
  const handleBackToList = () => {
    setIsCustom(false)
    setSelected(null)
    setQuery('')
    setCustomName('')
    setCustomAddress('')
    onSelect({ venueName: '', venueAddress: '', venueId: null })
  }

  if (isCustom) {
    return (
      <div>
        <div className="form-group">
          <label className="form-label">Название места</label>
          <input
            placeholder="Например: Бар Стрелка"
            value={customName}
            onChange={e => handleCustomChange('name', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Адрес</label>
          <input
            placeholder="ул. Рубинштейна, 15"
            value={customAddress}
            onChange={e => handleCustomChange('address', e.target.value)}
          />
        </div>
        <button
          onClick={handleBackToList}
          style={venueStyles.backLink}
        >
          ← Выбрать из списка клубов
        </button>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <div className="form-group">
        <label className="form-label">Клуб / место проведения</label>

        {/* Поле ввода с поиском */}
        <div style={venueStyles.inputWrap}>
          <input
            placeholder="Начни вводить название клуба..."
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setOpen(true)
              setSelected(null)
              onSelect({ venueName: e.target.value, venueAddress: '', venueId: null })
            }}
            onFocus={() => setOpen(true)}
            style={selected ? { ...venueStyles.selectedInput } : {}}
          />
          {/* Иконка галочки если выбран клуб */}
          {selected && (
            <span style={venueStyles.checkIcon}>✓</span>
          )}
        </div>

        {/* Адрес выбранного клуба */}
        {selected && (
          <div style={venueStyles.selectedAddress}>
            📍 {selected.address}
          </div>
        )}
      </div>

      {/* Дропдаун со списком */}
      {open && query.length >= 0 && (
        <div style={venueStyles.dropdown}>

          {filtered.length === 0 && (
            <div style={venueStyles.dropdownEmpty}>
              Клуб не найден
            </div>
          )}

          {filtered.map(venue => (
            <div
              key={venue.id}
              style={venueStyles.dropdownItem}
              onClick={() => handleSelect(venue)}
            >
              <div style={venueStyles.dropdownName}>{venue.name}</div>
              <div style={venueStyles.dropdownMeta}>
                {venue.district && <span style={venueStyles.district}>{venue.district}</span>}
                <span style={venueStyles.dropdownAddress}>{venue.address}</span>
              </div>
            </div>
          ))}

          {/* Разделитель и кнопка «другое место» */}
          <div style={venueStyles.dropdownDivider} />
          <div
            style={{ ...venueStyles.dropdownItem, ...venueStyles.customOption }}
            onClick={handleCustom}
          >
            ✏️ Другое место (ввести вручную)
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Форма создания турнира — с VenuePicker
// ─────────────────────────────────────────────
function CreateTournament({ user, onBack, onCreated }) {
  const [form, setForm] = useState({
    title: '', venueName: '', venueAddress: '', venueId: null,
    dateTime: '', price: '', maxPlayers: '8', description: ''
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Вызывается из VenuePicker когда пользователь выбрал клуб
  const handleVenueSelect = ({ venueName, venueAddress, venueId }) => {
    setForm(prev => ({ ...prev, venueName, venueAddress, venueId }))
  }

  const handleSubmit = async () => {
    if (!form.title || !form.venueName || !form.dateTime) {
      alert('Заполни название, клуб и дату!')
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
        price:       Number(form.price),
        maxPlayers:  Number(form.maxPlayers),
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
          <input
            name="title"
            placeholder="Открытый турнир на Рубинштейна"
            value={form.title}
            onChange={handleChange}
          />
        </div>

        {/* VenuePicker заменяет два поля: «Название бара» и «Адрес» */}
        <VenuePicker onSelect={handleVenueSelect} />

        <div className="form-group">
          <label className="form-label">Дата и время</label>
          <input
            name="dateTime"
            type="datetime-local"
            value={form.dateTime}
            onChange={handleChange}
          />
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

        <div className="form-group">
          <label className="form-label">Описание (кого ищу, уровень игры...)</label>
          <textarea
            name="description"
            placeholder="Например: ищу игроков среднего уровня, будем играть пул 8"
            value={form.description}
            onChange={handleChange}
            rows={3}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '12px 14px', color: 'var(--text)',
              fontSize: '14px', outline: 'none', resize: 'none',
              fontFamily: 'inherit', width: '100%', boxSizing: 'border-box'
            }}
          />
        </div>

        <button className="btn-submit" onClick={handleSubmit}>Создать турнир</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Стили VenuePicker
// ─────────────────────────────────────────────
const venueStyles = {
  inputWrap: {
    position: 'relative',
  },
  selectedInput: {
    borderColor: '#1DB954',
    color: '#fff',
  },
  checkIcon: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#1DB954',
    fontSize: 16,
    pointerEvents: 'none',
  },
  selectedAddress: {
    marginTop: 6,
    fontSize: 12,
    color: '#888',
    paddingLeft: 2,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#1e1e1e',
    border: '1px solid #2a2a2a',
    borderRadius: 12,
    zIndex: 100,
    maxHeight: 280,
    overflowY: 'auto',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    marginTop: -8,
  },
  dropdownItem: {
    padding: '12px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid #2a2a2a',
    transition: 'background 0.15s',
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    marginBottom: 3,
  },
  dropdownMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  district: {
    fontSize: 11,
    color: '#1DB954',
    border: '1px solid rgba(29,185,84,0.3)',
    borderRadius: 20,
    padding: '1px 7px',
    background: 'rgba(29,185,84,0.08)',
    flexShrink: 0,
  },
  dropdownAddress: {
    fontSize: 12,
    color: '#666',
  },
  dropdownEmpty: {
    padding: '14px',
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  dropdownDivider: {
    height: 1,
    background: '#333',
    margin: '4px 0',
  },
  customOption: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    borderBottom: 'none',
  },
  backLink: {
    background: 'none',
    border: 'none',
    color: '#1DB954',
    fontSize: 13,
    cursor: 'pointer',
    padding: '4px 0',
    marginTop: 4,
  },
}

// ─────────────────────────────────────────────
// Стили модального окна
// ─────────────────────────────────────────────
const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.6)', zIndex: 200,
  },
  modal: {
    position: 'fixed', bottom: 0,
    left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: 480,
    background: '#1a1a1a',
    borderRadius: '20px 20px 0 0',
    borderTop: '1px solid #2a2a2a',
    zIndex: 201, maxHeight: '85vh',
    display: 'flex', flexDirection: 'column',
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 16,
    background: '#2a2a2a', border: 'none', color: '#888',
    width: 32, height: 32, borderRadius: '50%',
    cursor: 'pointer', fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modalScroll: {
    overflowY: 'auto', padding: '24px 16px 8px', flex: 1,
  },
  modalTitle: {
    fontSize: 20, fontWeight: 700, color: '#fff',
    marginBottom: 12, paddingRight: 40,
  },
  metaRow: { display: 'flex', gap: 16, marginBottom: 6 },
  metaItem: { fontSize: 13, color: '#888' },
  description: {
    marginTop: 14, padding: '12px 14px',
    background: '#111', borderRadius: 10,
    fontSize: 14, color: '#ccc', lineHeight: 1.6,
    borderLeft: '2px solid #1DB954',
  },
  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: 11, fontWeight: 600,
    letterSpacing: '1.5px', color: '#666', marginBottom: 10,
  },
  loadingText: { marginTop: 20, fontSize: 13, color: '#666', textAlign: 'center' },
  emptyText: { fontSize: 13, color: '#666', padding: '12px 0' },
  participantRow: {
    display: 'flex', gap: 12,
    paddingBottom: 14, marginBottom: 14,
    borderBottom: '1px solid #2a2a2a',
  },
  avatar: {
    width: 48, height: 48, borderRadius: '50%',
    objectFit: 'cover', flexShrink: 0, border: '1px solid #2a2a2a',
  },
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: '50%',
    background: '#2a2a2a', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: 20, fontWeight: 700, color: '#1DB954', flexShrink: 0,
  },
  participantInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4 },
  participantName: {
    fontSize: 15, fontWeight: 600, color: '#fff',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  organizerBadge: {
    fontSize: 10, fontWeight: 600, color: '#1DB954',
    border: '1px solid #1DB954', borderRadius: 20,
    padding: '1px 6px', letterSpacing: '0.5px',
  },
  participantBio: { fontSize: 13, color: '#888', lineHeight: 1.5 },
  tagsRow: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  tag: {
    fontSize: 11, color: '#1DB954',
    border: '1px solid rgba(29,185,84,0.4)',
    borderRadius: 20, padding: '2px 8px',
    background: 'rgba(29,185,84,0.07)',
  },
  tgLink: { fontSize: 12, color: '#4A9EFF', textDecoration: 'none', marginTop: 2 },
  footer: { padding: '12px 16px 28px', borderTop: '1px solid #2a2a2a' },
  joinBtn: {
    width: '100%', background: '#1DB954', color: '#000',
    border: 'none', borderRadius: 12, padding: '14px',
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  joinBtnDisabled: { background: '#2a2a2a', color: '#666', cursor: 'default' },
}
