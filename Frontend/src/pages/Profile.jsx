import { useState } from 'react'
import { apiFetch } from '../api/auth.js'

export default function Profile({ user }) {
  const [profile, setProfile] = useState({
    firstName: user?.firstName  || '',
    bio:       user?.bio        || '',
    age:       user?.age        || '',
    instagram: user?.instagram  || '',
    interests: user?.interests  || ['Пул', 'Снукер', 'Карамболь'],
  })

  const [editing, setEditing] = useState(null)
  const [showInstagram, setShowInstagram] = useState(false)
  const [newInterest, setNewInterest] = useState('')
  const [showInterestInput, setShowInterestInput] = useState(false)

  const save = async (field, value) => {
    const updated = { ...profile, [field]: value }
    setProfile(updated)
    setEditing(null)
    try {
      await apiFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: updated.firstName,
          bio:       updated.bio,
          age:       updated.age ? Number(updated.age) : null,
          instagram: updated.instagram || null,
        })
      })
    } catch (e) {
      console.error('Ошибка сохранения', e)
    }
  }

  const addInterest = () => {
    const tag = newInterest.trim()
    if (!tag || profile.interests.includes(tag)) return
    setProfile({ ...profile, interests: [...profile.interests, tag] })
    setNewInterest('')
    setShowInterestInput(false)
  }

  const removeInterest = (tag) => {
    setProfile({ ...profile, interests: profile.interests.filter(t => t !== tag) })
  }

  const rating = user?.rating     ?? 1000
  const games  = user?.gamesCount ?? 0

  const getLevel = (r) => {
    if (r >= 1400) return { label: 'Про',      color: '#FFD700' }
    if (r >= 1200) return { label: 'Опытный',  color: '#1DB954' }
    if (r >= 1000) return { label: 'Любитель', color: '#4A9EFF' }
    return              { label: 'Новичок',   color: '#888'    }
  }
  const level = getLevel(rating)

  return (
    <div className="page profile-page">

      <header className="profile-header">
        <h1 className="profile-header-title">Профиль</h1>
      </header>

      <div className="profile-hero">
        <div className="profile-avatar-wrap">
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt={profile.firstName} className="profile-avatar" />
            : <div className="profile-avatar profile-avatar-placeholder">
                {(profile.firstName || 'И').charAt(0).toUpperCase()}
              </div>
          }
        </div>

        {editing === 'firstName' ? (
          <div className="profile-inline-edit">
            <input
              className="profile-edit-input"
              value={profile.firstName}
              autoFocus
              onChange={e => setProfile({ ...profile, firstName: e.target.value })}
              onBlur={() => save('firstName', profile.firstName)}
              onKeyDown={e => e.key === 'Enter' && save('firstName', profile.firstName)}
            />
          </div>
        ) : (
          <div className="profile-name profile-editable" onClick={() => setEditing('firstName')}>
            {profile.firstName || 'Игрок'} <span className="edit-hint">✏️</span>
          </div>
        )}

        {user?.username && (
          <div className="profile-username">@{user.username}</div>
        )}

        <div className="profile-level-badge" style={{ color: level.color, borderColor: level.color }}>
          {level.label}
        </div>
      </div>

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
        <div className="profile-stat-divider" />
        <div className="profile-stat">
          {editing === 'age' ? (
            <input
              className="profile-edit-input profile-edit-input--center"
              value={profile.age}
              autoFocus
              type="number"
              onChange={e => setProfile({ ...profile, age: e.target.value })}
              onBlur={() => save('age', profile.age)}
              onKeyDown={e => e.key === 'Enter' && save('age', profile.age)}
            />
          ) : (
            <span className="profile-stat-value profile-editable" onClick={() => setEditing('age')}>
              {profile.age || '—'} <span className="edit-hint">✏️</span>
            </span>
          )}
          <span className="profile-stat-label">Возраст</span>
        </div>
      </div>

      <section className="profile-section">
        <div className="profile-section-title">О себе</div>
        {editing === 'bio' ? (
          <textarea
            className="profile-edit-textarea"
            value={profile.bio}
            autoFocus
            rows={3}
            onChange={e => setProfile({ ...profile, bio: e.target.value })}
            onBlur={() => save('bio', profile.bio)}
            placeholder="Расскажи о себе..."
          />
        ) : (
          <div className="profile-bio profile-editable" onClick={() => setEditing('bio')}>
            {profile.bio || 'Пока ничего не написано. Нажми чтобы добавить!'}
            <span className="edit-hint"> ✏️</span>
          </div>
        )}
      </section>

      <section className="profile-section">
        <div className="profile-section-title">Интересы</div>
        <div className="profile-tags">
          {profile.interests.map((tag, i) => (
            <span key={i} className="profile-tag">
              {tag}
              <button className="profile-tag-remove" onClick={() => removeInterest(tag)}>×</button>
            </span>
          ))}
          {showInterestInput ? (
            <div className="profile-tag-add-wrap">
              <input
                className="profile-tag-input"
                value={newInterest}
                autoFocus
                placeholder="Напиши тег..."
                onChange={e => setNewInterest(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addInterest()}
                onBlur={() => { addInterest(); setShowInterestInput(false) }}
              />
            </div>
          ) : (
            <button className="profile-tag profile-tag-add" onClick={() => setShowInterestInput(true)}>
              + Добавить
            </button>
          )}
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section-title">Контакты</div>
        <div className="profile-contacts">

          <div className="profile-contact-row">
            <span className="profile-contact-icon">✈️</span>
            <span className="profile-contact-label">Telegram</span>
            <span className="profile-contact-value">
              {user?.username ? `@${user.username}` : 'подключён'}
            </span>
          </div>

          {showInstagram ? (
            <div className="profile-contact-row">
              <span className="profile-contact-icon">📸</span>
              <span className="profile-contact-label">Instagram</span>
              {editing === 'instagram' ? (
                <input
                  className="profile-edit-input profile-edit-input--inline"
                  value={profile.instagram}
                  autoFocus
                  placeholder="username"
                  onChange={e => setProfile({ ...profile, instagram: e.target.value })}
                  onBlur={() => save('instagram', profile.instagram)}
                  onKeyDown={e => e.key === 'Enter' && save('instagram', profile.instagram)}
                />
              ) : (
                <span
                  className="profile-contact-value profile-editable"
                  onClick={() => setEditing('instagram')}
                >
                  {profile.instagram ? `@${profile.instagram}` : 'не указан'}
                  <span className="edit-hint"> ✏️</span>
                </span>
              )}
            </div>
          ) : (
            <button className="profile-contact-row profile-contact-add" onClick={() => setShowInstagram(true)}>
              <span className="profile-contact-icon">📸</span>
              <span className="profile-contact-label">Добавить Instagram</span>
              <span className="profile-contact-value" style={{ color: 'var(--accent)' }}>+</span>
            </button>
          )}

        </div>
      </section>

    </div>
  )
}
