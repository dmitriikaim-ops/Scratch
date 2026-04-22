import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import cors from '@fastify/cors'
import { config } from 'dotenv'

import authRoutes from './routes/auth.js'
import tournamentRoutes from './routes/tournaments.js'
import userRoutes from './routes/users.js'

config()

const app = Fastify({ logger: true })

// CORS должен быть зарегистрирован первым — до всех роутов
await app.register(cors, {
  origin: ['https://scratch-eight-theta.vercel.app', 'https://scratch-nn6a.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  credentials: true,
  preflight: true,        // ← явно разрешаем preflight OPTIONS запросы
  strictPreflight: false, // ← не требуем строгой проверки preflight
})

await app.register(jwt, { secret: process.env.JWT_SECRET })
app.addHook('preParsing', async (request, reply) => {
  if (request.method === 'OPTIONS') {
    reply.header('Access-Control-Allow-Origin', request.headers.origin || '*')
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS')
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning')
    reply.header('Access-Control-Allow-Credentials', 'true')
    reply.status(204).send()
  }
})
await app.register(authRoutes,       { prefix: '/auth' })
await app.register(tournamentRoutes, { prefix: '/tournaments' })
await app.register(userRoutes,       { prefix: '/users' })

const port = process.env.PORT || 3000
await app.listen({ port, host: '0.0.0.0' })
