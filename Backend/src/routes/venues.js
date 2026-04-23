import { db } from '../db/client.js'
import { venues } from '../db/schema.js'
import { eq } from 'drizzle-orm'

export default async function venueRoutes(app) {
  // GET /venues — список всех активных клубов
  app.get('/', async (request, reply) => {
    const list = await db.query.venues.findMany({
      where: eq(venues.isActive, true),
    })
    return list
  })
}