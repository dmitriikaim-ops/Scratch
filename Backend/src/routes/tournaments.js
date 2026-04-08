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
    return list
  })

  // GET /tournaments/:id — один турнир + участники
  app.get('/:id', async (request, reply) => {
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, Number(request.params.id)),
    })
    if (!tournament) return reply.status(404).send({ error: 'Турнир не найден' })

    const parts = await db.query.participations.findMany({
      where: eq(participations.tournamentId, tournament.id),
    })

    return { ...tournament, participantsCount: parts.length, participants: parts }
  })

  // POST /tournaments — создать турнир
app.post('/', async (request, reply) => {
    const userId = request.body.organizerId
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
}
