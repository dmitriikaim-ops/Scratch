import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import cors from '@fastify/cors'
import { config } from 'dotenv'

import authRoutes from './routes/auth.js'
import tournamentRoutes from './routes/tournaments.js'
import userRoutes from './routes/users.js'
import venueRoutes from './routes/venues.js' 

config()

const app = Fastify({ logger: true })

// ← 1. Сначала этот парсер — он должен быть до всего
app.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, done) {
  if (body === '') {
    done(null, {})  // пустое тело → пустой объект, не падаем
    return
  }
  try {
    done(null, JSON.parse(body))
  } catch (err) {
    done(err)
  }
})

// ← 2. Потом плагины
await app.register(cors, {
  origin: ['https://scratch-eight-theta.vercel.app', 'https://scratch-nn6a.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  credentials: true,
  preflight: true,
  strictPreflight: false,
})

await app.register(jwt, { secret: process.env.JWT_SECRET })

// ← 3. Потом хук для OPTIONS
app.addHook('preParsing', async (request, reply) => {
  if (request.method === 'OPTIONS') {
    reply.header('Access-Control-Allow-Origin', request.headers.origin || '*')
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS')
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning')
    reply.header('Access-Control-Allow-Credentials', 'true')
    reply.status(204).send()
  }
})

// ← 4. Потом роуты
await app.register(authRoutes,       { prefix: '/auth' })
await app.register(tournamentRoutes, { prefix: '/tournaments' })
await app.register(userRoutes,       { prefix: '/users' })
await app.register(venueRoutes, { prefix: '/venues' })	

const port = process.env.PORT || 3000
await app.listen({ port, host: '0.0.0.0' })
