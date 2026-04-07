import crypto from 'crypto'
import { db } from '../db/client.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'

export default async function authRoutes(app) {

  // POST /auth/telegram
  app.post('/telegram', async (request, reply) => {
    const { initData } = request.body

    // Проверяем подпись от Telegram — защита от подделки
    const isValid = validateTelegramInitData(initData, process.env.BOT_TOKEN)
    if (!isValid) {
      return reply.status(401).send({ error: 'Данные от Telegram невалидны' })
    }

    // Разбираем данные пользователя
    const params = new URLSearchParams(initData)
    const userData = JSON.parse(params.get('user'))

    // Ищем в БД или создаём нового
    let user = await db.query.users.findFirst({
      where: eq(users.telegramId, String(userData.id))
    })

    if (!user) {
      const [newUser] = await db.insert(users).values({
        telegramId: String(userData.id),
        username:   userData.username,
        firstName:  userData.first_name,
        avatarUrl:  userData.photo_url,
      }).returning()
      user = newUser
    }

    // Выдаём JWT токен
    const token = app.jwt.sign({ userId: user.id, telegramId: user.telegramId })
    return { token, user }
  })
}

// Проверка HMAC подписи по документации Telegram
function validateTelegramInitData(initData, botToken) {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  params.delete('hash')

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  return hash === expectedHash
}
