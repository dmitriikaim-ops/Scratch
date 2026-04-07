import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'
import { config } from 'dotenv'

// Загружаем .env до подключения к базе
config()

// Одно подключение к базе на всё приложение
const connection = postgres(process.env.DATABASE_URL)
export const db = drizzle(connection, { schema })
