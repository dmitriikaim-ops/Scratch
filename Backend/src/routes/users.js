import { db } from '../db/client.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
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
}
