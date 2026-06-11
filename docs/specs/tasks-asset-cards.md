# Tasks: Asset Cards — BTC, Gold, Silver

**SDD Stage:** /tasks  
**Date:** 2026-06-02  
**Status:** Awaiting user approval  
**Design reference:** `docs/specs/design-asset-cards.md`  
**Spec reference:** `docs/specs/spec-asset-cards.md`

---

## Phase 1 — Project Foundation

> One-time setup: test runner, dependencies, directory structure. No business logic yet.

---

### T01 — Install database and ORM dependencies
**Complexity:** S  
**Blocks:** T05, T06, T09, T10  
**Done when:**
- `drizzle-orm`, `@neondatabase/serverless` added to `dependencies`
- `drizzle-kit` added to `devDependencies`
- `npm install` runs clean with no errors
- `package.json` scripts includes `"db:push": "drizzle-kit push"` and `"db:studio": "drizzle-kit studio"`

---

### T02 — Configure Vitest for unit and component tests
**Complexity:** S  
**Blocks:** T08, T18, T19, T21  
**Done when:**
- `vitest.config.ts` exists at project root with `@vitejs/plugin-react` and `jsdom` environment
- `setupTests.ts` exists at `src/` with `@testing-library/jest-dom` import
- `package.json` scripts includes `"test": "vitest"` and `"test:run": "vitest run"`
- Running `npm test -- --run` exits with code 0 (no tests yet — that's fine)

---

### T03 — Create src/ directory structure
**Complexity:** S  
**Blocks:** T04, T05, T06, T11–T14, T18–T22  
**Done when:**
- The following directories exist (empty, with `.gitkeep` if needed):
  - `src/app/`
  - `src/app/api/seed/`
  - `src/app/api/cron/poll-prices/`
  - `src/components/asset-card/`
  - `src/lib/db/`
  - `src/lib/prices/`
  - `src/lib/external/`
  - `src/types/`
- `src/app/layout.tsx` exists with minimal root layout (html + body tags, Tailwind CSS import)
- `src/app/page.tsx` exists as a placeholder (`export default function Home() { return <main /> }`)
- `npm run dev` starts without errors and `localhost:3000` returns a page

---

## Phase 2 — Types and Database

> Foundational types and DB schema. Everything else depends on these.

---

### T04 — Define shared TypeScript types
**Complexity:** S  
**Depends on:** T03  
**Blocks:** T08, T09, T10, T11, T12, T14, T18, T19, T20, T21  
**Done when:**
- `src/types/prices.ts` exists and exports:
  - `AssetSymbol` type (`'BTC' | 'XAU' | 'XAG'`)
  - `PriceSnapshot` interface
  - `AssetCardData` interface
  - `AssetMeta` interface
  - `ASSET_META` constant (all three assets with name, pair, badgeText, badgeColor)
- `tsc --noEmit` passes with no type errors on this file

---

### T05 — Create Drizzle DB client singleton
**Complexity:** S  
**Depends on:** T01, T03  
**Blocks:** T09, T10, T15, T16  
**Done when:**
- `src/lib/db/index.ts` exports a single `db` instance using `@neondatabase/serverless` + `drizzle-orm`
- Client reads `DATABASE_URL` from `process.env` and throws a clear error if missing
- `tsc --noEmit` passes

---

### T06 — Write Drizzle schema for price_snapshots
**Complexity:** S  
**Depends on:** T01, T03  
**Blocks:** T07, T09, T10, T15, T16  
**Done when:**
- `src/lib/db/schema.ts` defines `priceSnapshots` table with columns: `id`, `symbol`, `price_usd`, `price_inr`, `recorded_at`
- Composite index on `(symbol, recorded_at)` is declared
- `tsc --noEmit` passes

---

### T07 — Run Drizzle migration to create table in Neon
**Complexity:** S  
**Depends on:** T05, T06  
**Blocks:** T24, T25  
**Done when:**
- `npm run db:push` runs without errors
- Neon dashboard (or `SELECT * FROM price_snapshots LIMIT 1`) confirms the table exists with correct columns
- Index `price_snapshots_symbol_time_idx` is present

---

## Phase 3 — Data Utilities

---

### T08 — Implement changePct() with unit tests
**Complexity:** S  
**Depends on:** T02, T04  
**Blocks:** T22  
**Done when:**
- `src/lib/prices/calculations.ts` exports `changePct(current: number, baseline: number | null): number | null`
- `src/lib/prices/__tests__/calculations.test.ts` covers:
  - Positive change returns correct positive percentage
  - Negative change returns correct negative percentage
  - Zero baseline returns `null`
  - `null` baseline returns `null`
  - Result is rounded to 2 decimal places
- `npm test -- --run` passes all tests

---

### T09 — Implement getPricePoints() CTE query
**Complexity:** M  
**Depends on:** T04, T05, T06  
**Blocks:** T22  
**Done when:**
- `src/lib/prices/queries.ts` exports `getPricePoints(symbol: AssetSymbol)` returning `{ current, h24, d7, d30 }` where each is `PriceSnapshot | null`
- Uses a single raw SQL CTE via Drizzle's `sql` template tag (4 target timestamps, `DISTINCT ON`)
- Returns `null` for any window where no prior snapshot exists
- `tsc --noEmit` passes

---

### T10 — Implement getSparklineData() query
**Complexity:** S  
**Depends on:** T04, T05, T06  
**Blocks:** T22  
**Done when:**
- `src/lib/prices/queries.ts` exports `getSparklineData(symbol: AssetSymbol): Promise<number[]>`
- Returns up to 30 `price_usd` values, one per calendar day, oldest → newest
- Uses `DISTINCT ON (date_trunc('day', recorded_at))` ordered ascending
- Returns empty array (not error) when no data exists
- `tsc --noEmit` passes

---

## Phase 4 — External API Clients

> Four independent clients. No inter-dependencies within this phase.

---

### T11 — Implement CoinGecko client
**Complexity:** S  
**Depends on:** T03, T04  
**Blocks:** T15  
**Done when:**
- `src/lib/external/coingecko.ts` exports:
  - `fetchBtcCurrentPrice(): Promise<{ usd: number; inr: number }>`
  - `fetchBtcHistory365d(): Promise<Array<{ date: Date; priceUsd: number }>>`
- Both functions throw a typed error if the response shape is unexpected
- `tsc --noEmit` passes

---

### T12 — Implement gold-api.com client
**Complexity:** S  
**Depends on:** T03, T04  
**Blocks:** T16  
**Done when:**
- `src/lib/external/goldapi.ts` exports `fetchMetalSpotPrice(symbol: 'XAU' | 'XAG'): Promise<number>`
- Calls `https://www.gold-api.com/price/{symbol}` and returns the `price` field
- Throws a typed error on unexpected response shape
- Response shape verified against live API during implementation (open item from design)
- `tsc --noEmit` passes

---

### T13 — Implement Frankfurter FX client
**Complexity:** S  
**Depends on:** T03  
**Blocks:** T15, T16  
**Done when:**
- `src/lib/external/frankfurter.ts` exports `fetchUsdToInr(): Promise<number>`
- Calls `https://api.frankfurter.app/latest?from=USD&to=INR` and returns `rates.INR`
- Throws a typed error on unexpected response shape
- `tsc --noEmit` passes

---

### T14 — Implement metalpriceapi.com client
**Complexity:** S  
**Depends on:** T03, T04  
**Blocks:** T15  
**Done when:**
- `src/lib/external/metalpriceapi.ts` exports `fetchMetalsHistory365d(apiKey: string)`
- Returns `{ xau: Array<{ date: Date; priceUsd: number }>, xag: Array<{ date: Date; priceUsd: number }> }`
- Correctly inverts the metalpriceapi rate (API returns units of metal per USD; we need USD per troy oz)
- Quota on `/v1/timeframe` free tier verified during implementation; fallback documented if capped
- `tsc --noEmit` passes

---

## Phase 5 — API Routes

---

### T15 — Implement /api/seed route
**Complexity:** M  
**Depends on:** T05, T06, T11, T13, T14  
**Blocks:** T24  
**Done when:**
- `src/app/api/seed/route.ts` exists and handles `GET /api/seed`
- Verifies `Authorization: Bearer <SEED_SECRET>` header; returns 401 if missing or wrong
- If `price_snapshots` already has rows, returns `{ skipped: true }` immediately (idempotent)
- Fetches 365d BTC history (CoinGecko), 365d XAU/XAG history (metalpriceapi.com), and USD→INR rate (Frankfurter)
- Bulk inserts all rows to `price_snapshots`; returns `{ inserted: N, skipped: false }`
- On any fetch error, returns `{ error: "seed failed", detail: "..." }` with status 500
- `tsc --noEmit` passes

---

### T16 — Implement /api/cron/poll-prices route
**Complexity:** M  
**Depends on:** T05, T06, T12, T13  
**Blocks:** T17, T25  
**Done when:**
- `src/app/api/cron/poll-prices/route.ts` exists and handles `GET /api/cron/poll-prices`
- Verifies `Authorization: Bearer <CRON_SECRET>` header; returns 401 if missing or wrong
- Fetches BTC (CoinGecko), XAU spot, XAG spot (gold-api.com), and USD→INR rate (Frankfurter) in parallel
- Computes INR price for XAU and XAG
- Inserts 3 rows into `price_snapshots`
- If one asset fetch fails, the others still insert; errors are collected and returned in response body
- Returns `{ inserted: N, errors: [] }` with status 200
- `tsc --noEmit` passes

---

### T17 — Configure Vercel Cron Job
**Complexity:** S  
**Depends on:** T16  
**Done when:**
- `vercel.json` exists at project root with a cron entry:
  ```json
  { "crons": [{ "path": "/api/cron/poll-prices", "schedule": "0 */2 * * *" }] }
  ```
- `vercel.json` also sets the `Authorization` header via environment variable reference
- A comment in the file or a note in this doc explains how to trigger manually in development

---

## Phase 6 — UI Components

---

### T18 — Build AssetBadge component with tests
**Complexity:** S  
**Depends on:** T02, T04  
**Blocks:** T21  
**Done when:**
- `src/components/asset-card/AssetBadge.tsx` renders a rounded square with correct badge text and background color per `AssetSymbol`
- `src/components/asset-card/__tests__/AssetBadge.test.tsx` covers: BTC renders "B" with orange bg, XAU renders "Au" with amber bg, XAG renders "Ag" with cyan bg
- `npm test -- --run` passes

---

### T19 — Build ChangePill component with tests
**Complexity:** S  
**Depends on:** T02, T04  
**Blocks:** T21  
**Done when:**
- `src/components/asset-card/ChangePill.tsx` accepts `{ value: number | null; label?: string }`
- Positive value: green pill, ▲ arrow, `+X.XX%` (with label if provided)
- Negative value: red pill, ▼ arrow, `-X.XX%`
- `null` value: neutral gray pill, `— %`
- `src/components/asset-card/__tests__/ChangePill.test.tsx` covers all four states
- `npm test -- --run` passes

---

### T20 — Build SparklineChart client component
**Complexity:** M  
**Depends on:** T04  
**Blocks:** T21  
**Done when:**
- `src/components/asset-card/SparklineChart.tsx` has `'use client'` directive
- Accepts `{ data: number[]; positive: boolean }`
- Renders ECharts line series via `echarts-for-react` with: no axes, no grid, no tooltip, no legend, `smooth: true`, `symbol: 'none'`, height 60px
- Line color: `#16a34a` when `positive`, `#dc2626` when not
- Renders nothing (not an error) when `data` is empty
- `tsc --noEmit` passes

---

### T21 — Build AssetCard server component with tests
**Complexity:** M  
**Depends on:** T04, T18, T19, T20  
**Blocks:** T22  
**Done when:**
- `src/components/asset-card/AssetCard.tsx` accepts `{ data: AssetCardData }` and renders:
  - `AssetBadge` with correct symbol
  - Asset name and trading pair
  - `ChangePill` (no label) in top-right for 24h change
  - Current price in USD (`$X,XXX.XX`) and INR (`₹X,XX,XXX.XX`)
  - Row of three `ChangePill` components with labels 24h, 7d, 30d
  - `SparklineChart` with sparkline data and `positive` derived from `change30d`
  - Card border is `border-green-300` when `change24h >= 0`, `border-red-300` when negative, `border-gray-200` when null
- `src/components/asset-card/__tests__/AssetCard.test.tsx` covers:
  - Renders USD and INR prices correctly formatted
  - Renders correct border class for positive, negative, and null 24h change
  - Renders `— %` pills when change values are null
- `npm test -- --run` passes

---

### T22 — Build AssetCardRow server component
**Complexity:** M  
**Depends on:** T08, T09, T10, T21  
**Blocks:** T23  
**Done when:**
- `src/components/asset-card/AssetCardRow.tsx` is a server component (no `'use client'`)
- Calls `fetchAssetCardData()` for BTC, XAU, XAG — a local async function that calls `getPricePoints()`, `getSparklineData()`, and `changePct()`
- Renders three `AssetCard` components inside a responsive grid: `grid-cols-1 lg:grid-cols-3 gap-4`
- If `getPricePoints` returns no `current` row for an asset, renders a skeleton `<div>` placeholder (no crash)
- `tsc --noEmit` passes

---

## Phase 7 — Page Integration

---

### T23 — Integrate AssetCardRow into home page
**Complexity:** S  
**Depends on:** T22  
**Blocks:** T26  
**Done when:**
- `src/app/page.tsx` imports and renders `<AssetCardRow />` inside a `<main>` element
- File exports `export const revalidate = 180`
- `src/app/layout.tsx` has the global Tailwind CSS import and correct `<html lang="en">` structure
- `npm run build` completes with no errors

---

## Phase 8 — Verification

---

### T24 — Seed the database and verify 1-year history
**Complexity:** S  
**Depends on:** T07, T15  
**Blocks:** T26  
**Done when:**
- `GET /api/seed` called with correct `SEED_SECRET` header returns `{ inserted: ~1095, skipped: false }`
- Neon DB query confirms rows exist for all three symbols across the past 365 days:
  ```sql
  SELECT symbol, count(*), min(recorded_at), max(recorded_at)
  FROM price_snapshots GROUP BY symbol;
  ```
- BTC, XAU, and XAG each have ≥ 300 rows (accounting for weekends/market closures on metals)

---

### T25 — Verify live poller inserts correctly
**Complexity:** S  
**Depends on:** T16  
**Done when:**
- `GET /api/cron/poll-prices` called with correct `CRON_SECRET` header returns `{ inserted: 3, errors: [] }`
- Three new rows appear in `price_snapshots` with `recorded_at` within the last 60 seconds
- `price_usd` and `price_inr` values are non-zero and plausible (BTC > 1000, XAU > 100, XAG > 1)

---

### T26 — Verify home page renders all three cards with live data
**Complexity:** S  
**Depends on:** T23, T24  
**Done when:**
- `npm run dev` starts without errors
- `localhost:3000` renders three visible asset cards in a horizontal row (desktop viewport)
- Each card shows a non-zero USD price, INR price, at least one non-`— %` change pill, and a sparkline
- On a viewport < 1024px, cards stack vertically
- No console errors in the browser

---

## Task Dependency Order

```
T01 → T05, T06
T02 → T08, T18, T19, T21
T03 → T04, T05, T06, T11–T14, T18–T22
T04 → T08, T09, T10, T11, T12, T14, T18, T19, T20, T21
T05 → T09, T10, T15, T16
T06 → T07, T09, T10, T15, T16
T07 → T24
T08 → T22
T09 → T22
T10 → T22
T11 → T15
T12 → T16
T13 → T15, T16
T14 → T15
T15 → T24
T16 → T17, T25
T18 → T21
T19 → T21
T20 → T21
T21 → T22
T22 → T23
T23 → T26
T24 → T26
```

---

## Total Estimate

| Complexity | Count | Range |
|---|---|---|
| S (< 1 hour) | 20 | 10–20 hrs |
| M (1–4 hours) | 6 | 6–24 hrs |
| **Total** | **26** | **~16–44 hrs** |

Realistic working estimate: **2–3 focused days**.

No L tasks. All tasks are independently completable within a single session.

---

## Risks and Flags

| Task | Risk | Mitigation |
|---|---|---|
| T09 | Raw SQL CTE via Drizzle `sql` tag — verify Drizzle supports this pattern with Neon serverless driver | Use `db.execute(sql\`...\`)` if ORM query builder cannot express `DISTINCT ON` |
| T12 | gold-api.com response shape unverified — `price` field name assumed | Verify with a live curl request at the start of T12 before writing the client |
| T14 | metalpriceapi.com free tier `/v1/timeframe` quota unconfirmed | Check quota in dashboard before calling; fallback is goldapi.io (365 daily requests = one-time operation) |
| T15 | Seed inserts ~1095 rows — Neon serverless may be slow for large batch inserts | Use chunked inserts (100 rows per batch) if a single bulk insert times out |
| T17 | Vercel Cron requires deployment to Vercel — not testable locally | Document manual curl command for local development testing |
