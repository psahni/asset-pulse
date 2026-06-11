# Technical Design: Asset Cards — BTC, Gold, Silver

**SDD Stage:** /design  
**Date:** 2026-06-02  
**Status:** APPROVED — 2026-06-02  
**Depends on spec:** `docs/specs/spec-asset-cards.md`

---

## Prerequisites — Setup Required Before /build

The following external services must be provisioned before any code is written. This is a one-time setup checklist.

### 1. Neon PostgreSQL

1. Sign up at [neon.tech](https://neon.tech) (free tier, no credit card)
2. Create a new project → name it `asset-pulse`
3. Copy the connection string from the dashboard: `postgresql://user:pass@host/dbname?sslmode=require`
4. Save as `DATABASE_URL` in `.env.local`

### 2. metalpriceapi.com (Gold/Silver historical seed)

1. Sign up at [metalpriceapi.com](https://metalpriceapi.com) (free tier, no credit card)
2. Retrieve your API key from the dashboard
3. Save as `METAL_PRICE_API_KEY` in `.env.local`
4. Verify the free tier allows the `/v1/timeframe` (date-range) endpoint — check dashboard for quota details

### 3. Cron Secret

Generate a random secret string (any password manager or `openssl rand -hex 32`) and save as `CRON_SECRET` in `.env.local`. This protects `/api/cron/poll-prices` from unauthorized calls.

### `.env.local` template

```bash
# Neon PostgreSQL
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# metalpriceapi.com (historical seed only)
METAL_PRICE_API_KEY=your_key_here

# Cron endpoint protection
CRON_SECRET=your_random_secret_here
```

> No keys are needed for CoinGecko, gold-api.com, or Frankfurter — all are keyless.

> `.env.local` is already in `.gitignore` by Next.js default. Never commit it.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
│   Requests home page → receives fully-rendered HTML             │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP GET /
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER (App Router)                   │
│                                                                  │
│   app/page.tsx  (revalidate: 180)                               │
│       └── AssetCardRow  [Server Component]                      │
│               └── queries DB for all 3 assets                   │
│               └── computes change percentages                    │
│               └── renders 3× AssetCard [Server Component]       │
│                       └── SparklineChart [Client Component]     │
│                                                                  │
│   /api/seed          ← manual trigger on first deploy           │
│   /api/cron/poll-prices  ← Vercel Cron every 2 hours            │
└──────────────┬───────────────────────┬──────────────────────────┘
               │ Drizzle ORM           │ fetch() to external APIs
               ▼                       ▼
┌──────────────────────┐   ┌───────────────────────────────────────┐
│   NEON POSTGRESQL    │   │           EXTERNAL APIS               │
│                      │   │                                       │
│  price_snapshots     │   │  CoinGecko   — BTC price + history   │
│  (append-only log)   │   │  gold-api.com — XAU/XAG spot price   │
│                      │   │  metalpriceapi.com — XAU/XAG history │
│                      │   │  Frankfurter  — USD→INR rate         │
└──────────────────────┘   └───────────────────────────────────────┘
```

---

## Directory Structure

```
src/
├── app/
│   ├── page.tsx                        # Home page — renders AssetCardRow
│   └── api/
│       ├── seed/
│       │   └── route.ts               # One-time historical seed endpoint
│       └── cron/
│           └── poll-prices/
│               └── route.ts           # Scheduled 2-hour poller endpoint
│
├── components/
│   └── asset-card/
│       ├── AssetCardRow.tsx           # Server component — fetches data, renders card row
│       ├── AssetCard.tsx              # Server component — single card layout
│       ├── SparklineChart.tsx         # Client component — ECharts line chart
│       ├── ChangePill.tsx             # Pure UI — 24h/7d/30d badge pill
│       └── AssetBadge.tsx             # Pure UI — colored icon badge (B / Au / Ag)
│
├── lib/
│   ├── db/
│   │   ├── index.ts                   # Drizzle client singleton
│   │   └── schema.ts                  # price_snapshots table definition
│   ├── prices/
│   │   ├── queries.ts                 # DB read functions
│   │   └── calculations.ts            # changePct() utility
│   └── external/
│       ├── coingecko.ts               # CoinGecko API client
│       ├── goldapi.ts                 # gold-api.com client
│       ├── metalpriceapi.ts           # metalpriceapi.com client (seed only)
│       └── frankfurter.ts             # Frankfurter FX client
│
└── types/
    └── prices.ts                      # Shared TypeScript types
```

---

## Database Schema

### Drizzle schema (`src/lib/db/schema.ts`)

```typescript
import { pgTable, serial, varchar, numeric, timestamptz, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const priceSnapshots = pgTable(
  'price_snapshots',
  {
    id:         serial('id').primaryKey(),
    symbol:     varchar('symbol', { length: 10 }).notNull(),    // 'BTC' | 'XAU' | 'XAG'
    priceUsd:   numeric('price_usd', { precision: 18, scale: 6 }).notNull(),
    priceInr:   numeric('price_inr', { precision: 18, scale: 2 }).notNull(),
    recordedAt: timestamptz('recorded_at').notNull().default(sql`now()`),
  },
  (table) => ({
    symbolTimeIdx: index('price_snapshots_symbol_time_idx')
      .on(table.symbol, table.recordedAt),
  })
)
```

No other tables are required for this feature.

---

## TypeScript Types (`src/types/prices.ts`)

```typescript
export type AssetSymbol = 'BTC' | 'XAU' | 'XAG'

export interface PriceSnapshot {
  symbol:     AssetSymbol
  priceUsd:   number
  priceInr:   number
  recordedAt: Date
}

export interface AssetCardData {
  symbol:      AssetSymbol
  priceUsd:    number
  priceInr:    number
  change24h:   number | null   // null = not enough history yet
  change7d:    number | null
  change30d:   number | null
  sparkline:   number[]        // up to 30 daily USD prices, oldest → newest
  recordedAt:  Date
}

export interface AssetMeta {
  name:        string
  pair:        string
  badgeText:   string
  badgeColor:  string          // Tailwind bg class
}

export const ASSET_META: Record<AssetSymbol, AssetMeta> = {
  BTC: { name: 'Bitcoin', pair: 'BTC · USD', badgeText: 'B',  badgeColor: 'bg-orange-100' },
  XAU: { name: 'Gold',    pair: 'XAU · oz',  badgeText: 'Au', badgeColor: 'bg-amber-100'  },
  XAG: { name: 'Silver',  pair: 'XAG · oz',  badgeText: 'Ag', badgeColor: 'bg-cyan-100'   },
}
```

---

## Database Query Layer (`src/lib/prices/queries.ts`)

Two functions per asset. All use Drizzle. All parameters are typed.

```typescript
// Single query: returns current price + closest snapshot to each of now-24h, now-7d, now-30d
// Uses a CTE with DISTINCT ON to find the nearest row to each target timestamp
getPricePoints(symbol: AssetSymbol): Promise<{
  current:   PriceSnapshot
  h24:       PriceSnapshot | null
  d7:        PriceSnapshot | null
  d30:       PriceSnapshot | null
}>

// Returns one price_usd per calendar day for the last 30 days (oldest → newest)
// Uses DISTINCT ON (date_trunc('day', recorded_at)) ordered by day ascending
getSparklineData(symbol: AssetSymbol): Promise<number[]>
```

`getPricePoints` collapses what would naively be 4 separate queries into one CTE:

```sql
WITH targets AS (
  SELECT unnest(ARRAY[
    now(),
    now() - interval '24 hours',
    now() - interval '7 days',
    now() - interval '30 days'
  ]) AS target_time
)
SELECT DISTINCT ON (target_time)
  target_time, price_usd, price_inr, recorded_at
FROM targets
JOIN price_snapshots ON symbol = $1
  AND recorded_at <= target_time
ORDER BY target_time, recorded_at DESC
```

**Total DB queries per revalidation cycle: 2 per asset × 3 assets = 6.**

---

## Change Calculation (`src/lib/prices/calculations.ts`)

```typescript
// Returns percentage change rounded to 2 decimal places, or null if baseline is missing
export function changePct(current: number, baseline: number | null): number | null {
  if (baseline === null || baseline === 0) return null
  return Math.round(((current - baseline) / baseline) * 10000) / 100
}
```

This is a pure function. It is unit-tested directly.

---

## Component Architecture

### `AssetCardRow` — Server Component

- Runs at request time (or on revalidation)
- Queries DB twice per asset (3 assets × 2 queries = 6 DB calls total)
- Computes `AssetCardData` for each asset
- Renders `<AssetCard>` for each
- Passes `revalidate: 180` via the page's segment config

```
AssetCardRow
  ├── fetchAssetCardData('BTC')  → AssetCardData
  ├── fetchAssetCardData('XAU')  → AssetCardData
  ├── fetchAssetCardData('XAG')  → AssetCardData
  └── renders:
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AssetCard data={btcData} />
        <AssetCard data={xauData} />
        <AssetCard data={xagData} />
      </div>
```

### `AssetCard` — Server Component

Receives `AssetCardData` as props. No data fetching. Renders:

```
<article>                              ← card container, border color from change24h
  <header>
    <AssetBadge symbol={symbol} />     ← colored square badge (B / Au / Ag)
    <div>name + pair</div>
    <ChangePill value={change24h} />   ← top-right 24h badge
  </header>
  <p>$price_usd</p>                    ← large price
  <p>₹price_inr</p>                   ← INR sub-price
  <div>                               ← change pill row
    <ChangePill value={change24h} label="24h" />
    <ChangePill value={change7d}  label="7d"  />
    <ChangePill value={change30d} label="30d" />
  </div>
  <SparklineChart data={sparkline} positive={change30d >= 0} />
</article>
```

### `SparklineChart` — Client Component

```typescript
'use client'
```

- Receives `data: number[]` and `positive: boolean`
- Renders an ECharts line series via `echarts-for-react`
- No axes, no grid, no tooltip, no legend
- Line color: `#16a34a` (green-600) if positive, `#dc2626` (red-600) if negative
- `smooth: true`, `symbol: 'none'` (no dot markers)
- Height: `60px`, width: `100%`
- If `data` is empty, renders nothing (no error)

### `ChangePill` — Pure UI Component

```typescript
// Props
{ value: number | null; label?: string }
```

- `null` → renders `— %` in neutral gray
- Positive/zero → green background, ▲ arrow
- Negative → red background, ▼ arrow
- With `label` prop: renders `▲ +2.4% 24h` style (for the pill row)
- Without `label` prop: renders `▲ +2.4%` style (for the top-right badge)

### `AssetBadge` — Pure UI Component

```typescript
// Props
{ symbol: AssetSymbol }
```

Looks up `ASSET_META[symbol]` and renders a rounded square with the badge text and background color.

---

## External API Clients

### `coingecko.ts`

Two functions:

```typescript
// Used by poller — returns current BTC price in USD and INR
fetchBtcCurrentPrice(): Promise<{ usd: number; inr: number }>

// Used by seed — returns array of [timestamp, price_usd] for last 365 days
fetchBtcHistory365d(): Promise<Array<{ date: Date; priceUsd: number }>>
```

Endpoint for current: `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,inr`
Endpoint for history: `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily`

### `goldapi.ts`

```typescript
// Used by poller — returns current spot price in USD for XAU or XAG
fetchMetalSpotPrice(symbol: 'XAU' | 'XAG'): Promise<number>
```

Endpoint: `https://www.gold-api.com/price/XAU` and `/price/XAG`
Response field: `price` (USD spot)

### `frankfurter.ts`

```typescript
// Returns current USD → INR exchange rate
fetchUsdToInr(): Promise<number>
```

Endpoint: `https://api.frankfurter.app/latest?from=USD&to=INR`
Response field: `rates.INR`

### `metalpriceapi.ts`

```typescript
// Used by seed only — returns daily historical prices for XAU and XAG
fetchMetalsHistory365d(apiKey: string): Promise<{
  xau: Array<{ date: Date; priceUsd: number }>
  xag: Array<{ date: Date; priceUsd: number }>
}>
```

Endpoint: `https://api.metalpriceapi.com/v1/timeframe?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&base=USD&currencies=XAU,XAG&api_key=KEY`

Note: metalpriceapi returns inverse rates (USD per 1 XAU is the inverse of XAU per 1 USD). The client normalises this to USD per troy ounce.

---

## API Route Contracts

### `GET /api/seed`

**Purpose:** One-time historical data seed.  
**Auth:** Bearer token checked against `SEED_SECRET` env var (add to `.env.local`).  
**Idempotent:** If `price_snapshots` already contains rows, returns `200 { skipped: true }` immediately.

**Response:**
```json
{ "inserted": 1095, "skipped": false }   // 365 days × 3 assets
```

**Error:**
```json
{ "error": "seed failed", "detail": "..." }  // 500
```

---

### `GET /api/cron/poll-prices`

**Purpose:** Insert fresh price snapshot for all 3 assets.  
**Auth:** `Authorization: Bearer <CRON_SECRET>` header.  
**Called by:** Vercel Cron Job on schedule `0 */2 * * *`.

**Response:**
```json
{ "inserted": 3, "errors": [] }
```

If one asset fails, the others still insert. Errors are logged and returned:
```json
{ "inserted": 2, "errors": [{ "symbol": "XAU", "reason": "fetch timeout" }] }
```

---

## Data Flow — Page Render

```
1. Browser requests GET /
2. Next.js checks revalidation — if stale (>180s), re-executes AssetCardRow
3. AssetCardRow calls fetchAssetCardData() for each of BTC, XAU, XAG
4. fetchAssetCardData():
     a. getPricePoints(symbol)    → { current, h24, d7, d30 }  (1 CTE query)
     b. getSparklineData(symbol)  → 30 daily prices             (1 query)
     c. changePct(current, baseline) for each window           (in-memory)
5. AssetCardRow renders 3× AssetCard with computed AssetCardData
6. SparklineChart hydrates client-side for ECharts rendering
7. Fully-rendered HTML returned to browser
```

---

## Data Flow — Poller

```
1. Vercel Cron fires GET /api/cron/poll-prices (every 2 hours)
2. Verify CRON_SECRET header — reject if missing/wrong
3. Parallel fetch:
     a. fetchBtcCurrentPrice()      → { usd, inr }
     b. fetchMetalSpotPrice('XAU')  → usd
     c. fetchMetalSpotPrice('XAG')  → usd
     d. fetchUsdToInr()             → rate
4. Compute:
     xau_inr = xau_usd × rate
     xag_inr = xag_usd × rate
5. Insert 3 rows into price_snapshots
6. Return { inserted: 3, errors: [] }
```

---

## Environment Variables

| Variable | Required | Used by | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | `lib/db/index.ts` | Neon PostgreSQL connection string |
| `METAL_PRICE_API_KEY` | Yes (seed only) | `metalpriceapi.ts` | metalpriceapi.com API key |
| `CRON_SECRET` | Yes | `/api/cron/poll-prices` | Protects cron endpoint |
| `SEED_SECRET` | Yes | `/api/seed` | Protects seed endpoint |

---

## Error Handling Decisions

| Scenario | Behaviour |
|---|---|
| DB has no rows for an asset | Card renders skeleton — no crash |
| change window has no baseline row | `null` returned — pill renders `— %` |
| Sparkline has < 30 points | Renders available points — no error |
| Poller: one API call fails | Other assets still insert; error logged and returned in response body |
| Seed: already seeded | Returns immediately (`skipped: true`) — safe to call multiple times |
| gold-api.com returns unexpected shape | External client throws typed error; poller catches per-asset and continues |

---

## Testing Plan

| Scope | File | What is tested |
|---|---|---|
| Unit | `src/lib/prices/__tests__/calculations.test.ts` | `changePct()` — positive, negative, zero, null baseline |
| Unit | `src/lib/prices/__tests__/queries.test.ts` | DB query functions with mock Drizzle client |
| Component | `src/components/asset-card/__tests__/AssetCard.test.tsx` | Renders price, change badges, correct colors given mock `AssetCardData` |
| Component | `src/components/asset-card/__tests__/ChangePill.test.tsx` | Positive/negative/null states render correctly |
| Component | `src/components/asset-card/__tests__/AssetBadge.test.tsx` | Correct badge text and color per symbol |

External API clients are not unit-tested directly. They are tested implicitly via the poller integration.

---

## Open Items for /build

1. **Verify metalpriceapi.com `/v1/timeframe` quota** — confirm no per-request cap on the free tier before writing the seed script. Fallback: use goldapi.io for 1yr seed (1 req/day × 365 = 365 requests, uses most of the monthly free quota but is a one-time operation).
2. **Verify gold-api.com response shape** — confirm the `price` field name and that both XAU and XAG are served from the same path pattern (`/price/XAU`, `/price/XAG`).
3. **Vercel Cron configuration** — add cron schedule to `vercel.json` if deploying to Vercel, or document equivalent for other hosts.
