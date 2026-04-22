import { eq, desc } from 'drizzle-orm'
import { tournaments, participations, users } from '../db/schema.js'
import { db } from '../db/client.js'
import { requireAuth } from '../middleware/auth.js'

export default async function usersRoutes(fastify) {

  // GET /users/me — профиль текущего пользователя
  fastify.get('/me', {
    preHandler: [requireAuth]
  }, async (request, reply) => {
    const userId = request.user.userId  // из JWT токена

    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (result.length === 0) {
        return reply.status(404).send({ error: 'Пользователь не найден' })
      }

      return reply.send(result[0])

    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Ошибка сервера' })
    }
  })


  // PATCH /users/me — обновить профиль
  fastify.patch('/me', {
    preHandler: [requireAuth]
  }, async (request, reply) => {
    const userId = request.user.userId

    const { bio, age, instagram } = request.body

    const updateData = {}
    if (bio       !== undefined) updateData.bio       = bio
    if (age       !== undefined) updateData.age       = age
    if (instagram !== undefined) updateData.instagram = instagram

    if (Object.keys(updateData).length === 0) {
      return reply.status(400).send({ error: 'Нет данных для обновления' })
    }

    try {
      const updated = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning()

      if (updated.length === 0) {
        return reply.status(404).send({ error: 'Пользователь не найден' })
      }

      return reply.send(updated[0])

    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Ошибка сервера' })
    }
  })


  // GET /users/me/participations — мои записи на турниры
  fastify.get('/me/participations', {
    preHandler: [requireAuth]
  }, async (request, reply) => {
    const userId = request.user.userId

    const result = await db
      .select({
        participationId: participations.id,
        status:          participations.status,
        joinedAt:        participations.joinedAt,
        title:           tournaments.title,
        venueName:       tournaments.venueName,
        dateTime:        tournaments.dateTime,
        price:           tournaments.price,
      })
      .from(participations)
      .innerJoin(tournaments, eq(participations.tournamentId, tournaments.id))
      .where(eq(participations.userId, userId))
      .orderBy(desc(participations.joinedAt))

    return reply.send(result)
  })
}
