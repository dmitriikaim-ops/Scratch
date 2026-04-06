import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import cors from '@fastify/cors'
import { config } from 'dotenv'

import authRoutes from './routes/auth.js'
import tournamentRoutes from './routes/tournaments.js'
import userRoutes from './routes/users.js'

// Загружаем переменные из .env файла
config()

// Создаём сервер
const app = Fastify({ logger: true })

// Подключаем плагины
await app.register(cors, { origin: '*' })         // разрешаем запросы с фронтенда
await app.register(jwt, { secret: process.env.JWT_SECRET })

// Регистрируем маршруты
await app.register(authRoutes,       { prefix: '/auth' })
await app.register(tournamentRoutes, { prefix: '/tournaments' })
await app.register(userRoutes,       { prefix: '/users' })

// Запускаем сервер
const port = process.env.PORT || 3000
await app.listen({ port, host: '0.0.0.0' })
