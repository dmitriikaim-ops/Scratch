import { pgTable, serial, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Таблица пользователей
export const users = pgTable('users', {
  id:          serial('id').primaryKey(),
  telegramId:  text('telegram_id').notNull().unique(),
  username:    text('username'),
  firstName:   text('first_name'),
  avatarUrl:   text('avatar_url'),
  rating:      integer('rating').default(1000),      // Начальный Elo
  gamesCount:  integer('games_count').default(0),
  bio:         text('bio'),
  age:         integer('age'),
  instagram:   text('instagram'),
  createdAt:   timestamp('created_at').defaultNow(),
})

// Таблица турниров
export const tournaments = pgTable('tournaments', {
  id:           serial('id').primaryKey(),
  title:        text('title').notNull(),
  venueName:    text('venue_name').notNull(),
  venueAddress: text('venue_address'),
  organizerId:  integer('organizer_id').notNull(),
  dateTime:     timestamp('date_time').notNull(),
  price:        integer('price').default(0),
  maxPlayers:   integer('max_players').default(16),
  level:        text('level').default('any'),         // any / beginner / pro
  isPublic:     boolean('is_public').default(true),
  status:       text('status').default('open'),       // open / ongoing / finished
  description:  text('description'),
  createdAt:    timestamp('created_at').defaultNow(),
})

// Таблица записей на турниры
export const participations = pgTable('participations', {
  id:           serial('id').primaryKey(),
  tournamentId: integer('tournament_id').notNull(),
  userId:       integer('user_id').notNull(),
  joinedAt:     timestamp('joined_at').defaultNow(),
  status:       text('status').default('registered'), // registered / cancelled
})

// Таблица матчей (заполним логику в v1.0)
export const matches = pgTable('matches', {
  id:              serial('id').primaryKey(),
  tournamentId:    integer('tournament_id').notNull(),
  player1Id:       integer('player1_id').notNull(),
  player2Id:       integer('player2_id').notNull(),
  winnerId:        integer('winner_id'),
  confirmedByBoth: boolean('confirmed_by_both').default(false),
  playedAt:        timestamp('played_at'),
})

// Связи между таблицами (нужны для with: { user: true } в запросах)

export const participationsRelations = relations(participations, ({ one }) => ({
  user: one(users, {
    fields: [participations.userId],
    references: [users.id],
  }),
  tournament: one(tournaments, {
    fields: [participations.tournamentId],
    references: [tournaments.id],
  }),
}))