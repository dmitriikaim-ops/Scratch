import { db } from '../db/client.js'
import { users, tournaments, participations } from '../db/schema.js'
import { eq, and, gte } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth.js'

export default async function userRoutes(app) {

  // GET /users/me — мой профиль (нужен токен)
  app.get('/me', { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })
    return user
  })

  // GET /users/:id — профиль любого игрока (публичный)
  app.get('/:id', async (request, reply) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, Number(request.params.id))
    })
    if (!user) return reply.status(404).send({ error: 'Пользователь не найден' })
    return user
  })

  // GET /users/me/participations — мои записи на турниры
app.get('/me/participations', { preHandler: requireAuth }, async (request, reply) => {
  const { userId } = request.user

  const rows = await db
    .select({
      participationId: participations.id,
      status:          participations.status,
      joinedAt:        participations.joinedAt,
      tournamentId:    tournaments.id,
      title:           tournaments.title,
      venueName:       tournaments.venueName,
      dateTime:        tournaments.dateTime,
      tournamentStatus: tournaments.status,
    })
    .from(participations)
    .innerJoin(tournaments, eq(participations.tournamentId, tournaments.id))
   .where(
and(
eq(participations.userId, userId),
    gte(tournaments.dateTime, new Date())
  )
)
    .orderBy(tournaments.dateTime)

  return rows
 })

// PATCH /users/me — обновить профиль
app.patch('/me', { preHandler: requireAuth }, async (request, reply) => {
  const { userId } = request.user
  const { firstName, bio, age, instagram } = request.body

  const [updated] = await db
    .update(users)
    .set({ firstName, bio, age, instagram })
    .where(eq(users.id, userId))
    .returning()

  return updated
})
}
