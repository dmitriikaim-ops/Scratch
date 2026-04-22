// ╔══════════════════════════════════════════════════════════════╗
// ║  backend/src/routes/users.js                                 ║
// ╚══════════════════════════════════════════════════════════════╝
//
// Этот файл обрабатывает запросы фронтенда о пользователях.
// Подключается в index.js через: fastify.register(usersRoutes)
//
// КАК РАБОТАЕТ МАРШРУТ (route):
//   Фронтенд делает запрос → Fastify смотрит какой маршрут подходит
//   → вызывает нашу функцию → мы идём в БД → возвращаем JSON

import { eq, desc } from 'drizzle-orm'
import { tournaments, participations } from '../db/schema.js'
import { db } from '../db/client.js'
import { requireAuth } from '../middleware/auth.js'

export default async function usersRoutes(fastify) {

  // ──────────────────────────────────────────────────────────────
  // МАРШРУТ 1: GET /users/me
  // Отдаёт профиль ТЕКУЩЕГО пользователя (по JWT токену)
  //
  // Фронтенд в App.jsx вызывает fetchMe() — это запрос сюда.
  // preHandler: [requireAuth] — middleware, который проверяет
  // JWT токен из заголовка Authorization. Если токен невалидный — 401.
  // ──────────────────────────────────────────────────────────────
  fastify.get('/users/me', {
    preHandler: [requireAuth]
  }, async (request, reply) => {
    // request.user.id — это ID пользователя из JWT токена.
    // Токен создаётся в auth.js при входе и хранится у фронтенда.
    const userId = request.user.id

    try {
      // Ищем пользователя в таблице users по его внутреннему id
      // eq(users.id, userId) → SQL: WHERE id = userId
      const user = await fastify.db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)    // нам нужна только 1 запись

      if (user.length === 0) {
        return reply.status(404).send({ error: 'Пользователь не найден' })
      }

      // user — это массив, берём первый (и единственный) элемент
      return reply.send(user[0])

    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Ошибка сервера' })
    }
  })


  // ──────────────────────────────────────────────────────────────
  // МАРШРУТ 2: GET /users/:id/tournaments
  // Отдаёт историю турниров пользователя
  //
  // :id — это "параметр" в URL. Если запрос /users/42/tournaments,
  // то request.params.id будет строкой "42"
  // ──────────────────────────────────────────────────────────────
  fastify.get('/users/:id/tournaments', {
    preHandler: [requireAuth]
  }, async (request, reply) => {
    const userId = Number(request.params.id)
    // Number() превращает строку "42" в число 42

    try {
      // Делаем JOIN двух таблиц: participations + tournaments
      //
      // JOIN — это SQL операция, которая объединяет данные из двух таблиц.
      // Например: participations.tournament_id = 5 → берём турнир с id=5
      //
      // Drizzle ORM позволяет делать JOIN так:
      const result = await fastify.db
        .select({
          // Выбираем нужные поля из таблицы tournaments
          id:          tournaments.id,
          title:       tournaments.title,
          venueName:   tournaments.venueName,
          dateTime:    tournaments.dateTime,
          // И статус из таблицы participations
          status:      participations.status,
          joinedAt:    participations.joinedAt,
        })
        .from(participations)
        // innerJoin — "объедини с таблицей tournaments по условию"
        // participations.tournamentId === tournaments.id
        .innerJoin(tournaments, eq(participations.tournamentId, tournaments.id))
        // Фильтруем: только записи этого пользователя
        .where(eq(participations.userId, userId))
        // Сортируем: сначала самые новые записи
        .orderBy(desc(participations.joinedAt))

      return reply.send(result)

    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Ошибка сервера' })
    }
  })


  // ──────────────────────────────────────────────────────────────
  // МАРШРУТ 3: PATCH /users/me
  // Обновляет профиль текущего пользователя
  //
  // PATCH — это HTTP метод для частичного обновления.
  // Отличие от PUT: PUT заменяет весь объект, PATCH — только указанные поля.
  // Используется когда пользователь редактирует bio, instagram, age.
  // ──────────────────────────────────────────────────────────────
  fastify.patch('/users/me', {
    preHandler: [requireAuth]
  }, async (request, reply) => {
    const userId = request.user.id

    // Достаём только разрешённые поля из тела запроса.
    // Деструктуризация: берём нужные поля из объекта request.body
    const { bio, age, instagram } = request.body

    // Собираем объект с полями для обновления.
    // Мы обновляем только то, что пришло в запросе (не undefined).
    // Это позволяет отправить только { bio: "текст" } и не трогать остальное.
    const updateData = {}
    if (bio       !== undefined) updateData.bio       = bio
    if (age       !== undefined) updateData.age       = age
    if (instagram !== undefined) updateData.instagram = instagram

    // Если нечего обновлять — отвечаем ошибкой
    if (Object.keys(updateData).length === 0) {
      return reply.status(400).send({ error: 'Нет данных для обновления' })
    }

    try {
      // UPDATE users SET bio=..., age=... WHERE id=userId
      const updated = await fastify.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning()  // returning() возвращает обновлённую запись

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
