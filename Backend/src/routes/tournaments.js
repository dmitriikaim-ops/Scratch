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
