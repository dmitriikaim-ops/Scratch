import { db } from '../db/client.js'
import { tournaments, participations } from '../db/schema.js'
import { eq, desc } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth.js'

export default async function tournamentRoutes(app) {

  // GET /tournaments — лента открытых турниров
app.get('/', async (request, reply) => {
  const list = await db.query.tournaments.findMany({
    where: eq(tournaments.status, 'open'),
    orderBy: [desc(tournaments.dateTime)],
    limit: 50,
  })

  const withCounts = await Promise.all(list.map(async (t) => {
    const parts = await db.query.participations.findMany({
      where: eq(participations.tournamentId, t.id)
    })
    return { ...t, participantsCount: parts.length }
  }))

  return withCounts
})

  // GET /tournaments/:id — один турнир + участники с профилями
app.get('/:id', async (request, reply) => {
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, Number(request.params.id)),
  })
  if (!tournament) return reply.status(404).send({ error: 'Турнир не найден' })

  // Достаём участников вместе с данными из таблицы users
  const parts = await db.query.participations.findMany({
    where: eq(participations.tournamentId, tournament.id),
    with: { user: true }  // JOIN с таблицей users
  })

  // Формируем список участников с нужными полями
  const participants = parts.map(p => ({
    participationId: p.id,
    status:    p.status,
    userId:    p.user.id,
    firstName: p.user.firstName,
    username:  p.user.username,
    avatarUrl: p.user.avatarUrl,
    bio:       p.user.bio,
    interests: p.user.interests,
    instagram: p.user.instagram,
  }))

  return {
    ...tournament,
    participantsCount: participants.length,
    participants
  }
})

  // POST /tournaments — создать турнир
app.post('/', async (request, reply) => {
    const userId = request.body.organizerId
    console.log('Создание турнира, body:', request.body)
    const { title, venueName, venueAddress, dateTime, price, maxPlayers, level, description } = request.body

    const [tournament] = await db.insert(tournaments).values({
      title, venueName, venueAddress, price, maxPlayers, level, description,
      organizerId: userId,
      dateTime: new Date(dateTime),
    }).returning()

    return reply.status(201).send(tournament)
  })

// POST /tournaments/:id/join — записаться
app.post('/:id/join', async (request, reply) => {
  const userId = request.body.userId || 1
  const tournamentId = Number(request.params.id)

  const existing = await db.query.participations.findFirst({
    where: (p, { and }) => and(eq(p.tournamentId, tournamentId), eq(p.userId, userId))
  })
  if (existing) return reply.status(400).send({ error: 'Ты уже записан' })

  const [participation] = await db.insert(participations).values({
    tournamentId, userId
  }).returning()

  // ── Уведомление организатору ──────────────────────────────
  // Делаем это после записи — асинхронно, не блокируя ответ
  try {
    // Достаём турнир чтобы узнать кто организатор
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, tournamentId)
    })

    if (tournament) {
      // Достаём данные организатора — нам нужен его telegramId
      const { users } = await import('../db/schema.js')
      const organizer = await db.query.users.findFirst({
        where: eq(users.id, tournament.organizerId)
      })

      // Достаём данные того кто записался — чтобы написать имя в уведомлении
      const newParticipant = await db.query.users.findFirst({
        where: eq(users.id, userId)
      })

      if (organizer?.telegramId && organizer.id !== userId) {
        // organizer.id !== userId — не уведомляем если организатор записался сам на себя
        const name = newParticipant?.firstName || newParticipant?.username || 'Кто-то'
        const username = newParticipant?.username ? ` (@${newParticipant.username})` : ''
        const count = await db.query.participations.findMany({
          where: eq(participations.tournamentId, tournamentId)
        })

        await sendTelegramNotification(
          organizer.telegramId,
          `🎱 <b>${name}${username}</b> записался на твой турнир!\n\n` +
          `<b>${tournament.title}</b>\n` +
          `📍 ${tournament.venueName}\n` +
          `👥 Участников: ${count.length} / ${tournament.maxPlayers}`
        )
      }
    }
  } catch (e) {
    console.error('Ошибка при отправке уведомления:', e)
  }
  // ─────────────────────────────────────────────────────────

  return reply.status(201).send(participation)
})

// PATCH /tournaments/participations/:id/cancel — отменить запись
app.patch('/participations/:id/cancel', { preHandler: requireAuth }, async (request, reply) => {
  const participationId = Number(request.params.id)

  const [updated] = await db
    .update(participations)
    .set({ status: 'cancelled' })
    .where(eq(participations.id, participationId))
    .returning()

  if (!updated) return reply.status(404).send({ error: 'Запись не найдена' })
  return updated
})
}
// Отправляет сообщение в Telegram через Bot API
// chatId — это telegramId организатора (строка вида "123456789")
async function sendTelegramNotification(chatId, text) {
  const token = process.env.BOT_TOKEN
  if (!token || !chatId) return // если нет токена или chatId — молча пропускаем

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML' // позволяет использовать <b>жирный</b> текст
      })
    })
  } catch (e) {
    console.error('Ошибка отправки уведомления в Telegram:', e)
    // Не бросаем ошибку дальше — если уведомление не дошло,
    // запись на турнир всё равно должна сохраниться
  }
}