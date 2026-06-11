import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import type { AssetSymbol, PriceSnapshot } from '@/types/prices'

interface RawSparklineRow extends Record<string, unknown> {
  price_usd: string
}

export interface PricePoints {
  current: PriceSnapshot | null
  h24: PriceSnapshot | null
  d7: PriceSnapshot | null
  d30: PriceSnapshot | null
}

interface RawPricePointRow extends Record<string, unknown> {
  window_name: string
  price_usd: string
  price_inr: string
  recorded_at: Date | string
}

// Sample output
// {
//   current: {
//     symbol: 'BTC',
//     priceUsd: 98450.32,
//     priceInr: 8213740.50,
//     recordedAt: Date('2026-06-11T11:00:00Z')   // ← most recent snapshot in DB
//   },
//   h24: {
//     symbol: 'BTC',
//     priceUsd: 96120.10,
//     priceInr: 8019324.00,
//     recordedAt: Date('2026-06-10T10:58:00Z')   // ← closest snapshot ≤ (now - 24h)
//   },
//   d7: {
//     symbol: 'BTC',
//     priceUsd: 93750.00,
//     priceInr: 7821875.00,
//     recordedAt: Date('2026-06-04T10:00:00Z')   // ← closest snapshot ≤ (now - 7d)
//   },
//   d30: {
//     symbol: 'BTC',
//     priceUsd: 87300.00,
//     priceInr: 7285290.00,
//     recordedAt: Date('2026-05-12T08:00:00Z')   // ← closest snapshot ≤ (now - 30d)
//   }
// }/

export async function getPricePoints(symbol: AssetSymbol): Promise<PricePoints> {
  const result = await db.execute<RawPricePointRow>(sql`
    WITH targets AS (
      SELECT *
      FROM (VALUES
        ('current'::text, now()),
        ('h24'::text,     now() - interval '24 hours'),
        ('d7'::text,      now() - interval '7 days'),
        ('d30'::text,     now() - interval '30 days')
      ) AS t(window_name, target_time)
    )
    SELECT DISTINCT ON (t.target_time)
      t.window_name,
      ps.price_usd,
      ps.price_inr,
      ps.recorded_at
    FROM targets t
    JOIN price_snapshots ps
      ON ps.symbol = ${symbol}
      AND ps.recorded_at <= t.target_time
    ORDER BY t.target_time, ps.recorded_at DESC
  `)

  const toSnapshot = (row: RawPricePointRow): PriceSnapshot => ({
    symbol,
    priceUsd: parseFloat(row.price_usd),
    priceInr: parseFloat(row.price_inr),
    recordedAt: new Date(row.recorded_at),
  })

  const rowMap = new Map(result.rows.map((r) => [r.window_name, r]))
  const get = (key: string): PriceSnapshot | null => {
    const row = rowMap.get(key)
    return row != null ? toSnapshot(row) : null
  }

  return {
    current: get('current'),
    h24: get('h24'),
    d7: get('d7'),
    d30: get('d30'),
  }
}

export async function getSparklineData(symbol: AssetSymbol): Promise<number[]> {
  const result = await db.execute<RawSparklineRow>(sql`
    SELECT DISTINCT ON (date_trunc('day', recorded_at))
      price_usd
    FROM price_snapshots
    WHERE symbol = ${symbol}
      AND recorded_at >= now() - interval '30 days'
    ORDER BY date_trunc('day', recorded_at) ASC, recorded_at ASC
    LIMIT 30
  `)

  return result.rows.map((r) => parseFloat(r.price_usd))
}
