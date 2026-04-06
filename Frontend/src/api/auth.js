// Middleware — проверяет токен ДО того, как запрос дойдёт до основного кода
export async function requireAuth(request, reply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.status(401).send({ error: 'Нужна авторизация' })
  }
}
