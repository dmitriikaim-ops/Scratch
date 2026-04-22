import { db } from '../db/client.js'
import { tournaments, participations, users } from '../db/schema.js'
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

  // ── Уведомления — делаем после записи, не блокируем ответ ──
  try {

    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, tournamentId)
    })

    if (tournament) {
      const organizer = await db.query.users.findFirst({
        where: eq(users.id, tournament.organizerId)
      })
      const newParticipant = await db.query.users.findFirst({
        where: eq(users.id, userId)
      })

      const count = await db.query.participations.findMany({
        where: eq(participations.tournamentId, tournamentId)
      })

      const date = new Date(tournament.dateTime).toLocaleString('ru-RU', {
        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
      })

      // ── 1. Уведомление ОРГАНИЗАТОРУ (уже было) ──
      if (organizer?.telegramId && organizer.id !== userId) {
        const name = newParticipant?.firstName || newParticipant?.username || 'Кто-то'
        const username = newParticipant?.username ? ` (@${newParticipant.username})` : ''
        await sendTelegramNotification(
          organizer.telegramId,
          `🎱 <b>${name}${username}</b> записался на твой турнир!\n\n` +
          `<b>${tournament.title}</b>\n` +
          `📍 ${tournament.venueName}\n` +
          `👥 Участников: ${count.length} / ${tournament.maxPlayers}`
        )
      }

      // ── 2. Уведомление УЧАСТНИКУ (новое) ──
      if (newParticipant?.telegramId) {
        await sendTelegramNotification(
          newParticipant.telegramId,
          `✅ Ты записан на турнир!\n\n` +
          `<b>${tournament.title}</b>\n` +
          `📍 ${tournament.venueName}\n` +
          `🗓 ${date}\n` +
          `💰 ${tournament.price > 0 ? tournament.price + ' ₽' : 'Бесплатно'}\n\n` +
          `Удачи за столом! 🎱`
        )
      }
    }
  } catch (e) {
    console.error('Ошибка при отправке уведомления:', e)
  }

  return reply.status(201).send(participation)
})

app.patch('/participations/:id/cancel', { preHandler: requireAuth }, async (request, reply) => {
  const participationId = Number(request.params.id)

  // Шаг 1: обновляем статус в БД
  const [updated] = await db
    .update(participations)
    .set({ status: 'cancelled' })
    .where(eq(participations.id, participationId))
    .returning()

  if (!updated) return reply.status(404).send({ error: 'Запись не найдена' })

  // Шаг 2: отправляем уведомления — асинхронно, не блокируем ответ
  try {

    // Достаём турнир чтобы узнать организатора и детали
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, updated.tournamentId)
    })

    if (tournament) {
      const organizer = await db.query.users.findFirst({
        where: eq(users.id, tournament.organizerId)
      })
      const participant = await db.query.users.findFirst({
        where: eq(users.id, updated.userId)
      })

      // Считаем сколько активных участников осталось
      const remaining = await db.query.participations.findMany({
        where: (p, { and }) => and(
          eq(p.tournamentId, updated.tournamentId),
          eq(p.status, 'registered')
        )
      })

      // Уведомление организатору
      if (organizer?.telegramId && organizer.id !== updated.userId) {
        const name = participant?.firstName || participant?.username || 'Кто-то'
        const username = participant?.username ? ` (@${participant.username})` : ''
        await sendTelegramNotification(
          organizer.telegramId,
          `❌ <b>${name}${username}</b> отменил запись на турнир\n\n` +
          `<b>${tournament.title}</b>\n` +
          `📍 ${tournament.venueName}\n` +
          `👥 Осталось участников: ${remaining.length} / ${tournament.maxPlayers}`
        )
      }

      // Уведомление участнику
      if (participant?.telegramId) {
        const date = new Date(tournament.dateTime).toLocaleString('ru-RU', {
          day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
        })
        await sendTelegramNotification(
          participant.telegramId,
          `🚫 Запись отменена\n\n` +
          `<b>${tournament.title}</b>\n` +
          `📍 ${tournament.venueName}\n` +
          `🗓 ${date}\n\n` +
          `Если передумаешь — записывайся снова! 🎱`
        )
      }
    }
  } catch (e) {
    console.error('Ошибка при отправке уведомления об отмене:', e)
  }

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