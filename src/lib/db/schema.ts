import { pgTable, serial, varchar, numeric, timestamp, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const priceSnapshots = pgTable(
  'price_snapshots',
  {
    id:         serial('id').primaryKey(),
    symbol:     varchar('symbol', { length: 10 }).notNull(),
    priceUsd:   numeric('price_usd', { precision: 18, scale: 6 }).notNull(),
    priceInr:   numeric('price_inr', { precision: 18, scale: 2 }).notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index('price_snapshots_symbol_time_idx').on(table.symbol, table.recordedAt),
  ]
)
