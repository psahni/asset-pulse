# Specification: Asset Cards — BTC, Gold, Silver

**SDD Stage:** /define  
**Date:** 2026-06-02  
**Status:** APPROVED — 2026-06-02  
**Depends on brainstorm:** `docs/specs/brainstorm-asset-cards.md`  
**Research:** `docs/specs/research-api-data-availability.md`

---

## Feature Summary

Build three asset price cards — Bitcoin (BTC/USD), Gold (XAU/oz), and Silver (XAG/oz) — displayed as a horizontal row on the Asset Pulse home page. Each card shows the current spot price in USD and INR, directional percentage changes for three time windows (24h, 7d, 30d), and a 30-day sparkline chart. Cards are rendered as Next.js server components, reading exclusively from a Neon PostgreSQL database that is seeded on first deploy and kept current by a scheduled background poller running every 2 hours.

---

## User Stories

### US-1 — View current asset prices
*As a visitor, I want to see the current spot price of Bitcoin, Gold, and Silver so that I can check asset values at a glance without navigating to multiple sources.*

**Acceptance Criteria:**
- AC-1.1: The home page displays exactly three asset cards: BTC, XAU, XAG — in that order left to right.
- AC-1.2: Each card displays the asset's current spot price in USD, formatted with comma separators and two decimal places (e.g. `$96,000.00`, `$2,400.75`, `$30.42`).
- AC-1.3: Each card displays the same price converted to INR, formatted with the ₹ symbol, comma separators, and two decimal places.
- AC-1.4: Price data is sourced from the `price_snapshots` database table, never from an external API at render time.
- AC-1.5: Each card displays the asset's symbol badge: a rounded square icon with a letter abbreviation — "B" (orange) for Bitcoin, "Au" (amber) for Gold, "Ag" (cyan) for Silver.
- AC-1.6: Each card displays the asset's full name and trading pair below the icon: "Bitcoin / BTC·USD", "Gold / XAU·oz", "Silver / XAG·oz".

---

### US-2 — View 24-hour price change
*As a visitor, I want to see how much each asset's price has changed in the last 24 hours so that I can understand short-term movement.*

**Acceptance Criteria:**
- AC-2.1: Each card displays a 24h change badge in the top-right corner showing a directional arrow and percentage value (e.g. `▲ +2.4%` or `▼ -0.3%`).
- AC-2.2: The badge background is green (`#dcfce7` / Tailwind `green-100`) when the 24h change is positive or zero; red (`#fee2e2` / Tailwind `red-100`) when negative.
- AC-2.3: The arrow is an upward triangle (▲) for positive/zero and a downward triangle (▼) for negative.
- AC-2.4: The card's border or left-accent color reflects the 24h direction: green border for positive, red border for negative.
- AC-2.5: The 24h change percentage is calculated as: `((current_price - price_24h_ago) / price_24h_ago) × 100`, where `price_24h_ago` is the closest snapshot to exactly 24 hours before the most recent snapshot.

---

### US-3 — View 7-day and 30-day price changes
*As a visitor, I want to see 7-day and 30-day price changes for each asset so that I can assess medium-term trends without opening a chart.*

**Acceptance Criteria:**
- AC-3.1: Each card displays a row of three change pills below the price: 24h, 7d, 30d — in that order.
- AC-3.2: Each pill shows a directional arrow, the percentage value, and the time label (e.g. `▲ +5.1% 7d`).
- AC-3.3: Each pill uses the same green/red color scheme as AC-2.2.
- AC-3.4: 7d change is calculated using the closest snapshot to 7 days before the most recent snapshot.
- AC-3.5: 30d change is calculated using the closest snapshot to 30 days before the most recent snapshot.
- AC-3.6: If the DB does not yet contain a snapshot old enough to calculate a period (e.g. less than 7 days of data), the pill displays `— %` rather than an incorrect value.

---

### US-4 — View 30-day sparkline chart
*As a visitor, I want to see a sparkline chart of each asset's price over the last 30 days so that I can visually grasp the recent price trajectory.*

**Acceptance Criteria:**
- AC-4.1: Each card displays a sparkline line chart spanning the full card width at the bottom, with no axes, no grid lines, no tooltip, and no legend.
- AC-4.2: The sparkline uses exactly 30 daily data points: the most recent snapshot per calendar day for each of the last 30 days.
- AC-4.3: The sparkline line color is green when the 30d change is positive or zero; red when negative.
- AC-4.4: The chart is rendered using `echarts-for-react` with `smooth: true` on the line series.
- AC-4.5: If fewer than 30 daily data points exist (e.g. within first 30 days of deployment), the sparkline renders with whatever points are available and does not throw an error.

---

### US-5 — Prices refresh automatically
*As a visitor, I want the prices on the cards to stay current so that I don't need to manually reload the page.*

**Acceptance Criteria:**
- AC-5.1: The home page uses Next.js server component revalidation with `revalidate: 180` (3 minutes).
- AC-5.2: A scheduled poller updates the `price_snapshots` table every 2 hours with fresh spot prices for all three assets.
- AC-5.3: When the poller runs, it inserts a new row for each asset — it does not overwrite previous rows.
- AC-5.4: After a revalidation cycle, the displayed price reflects the most recent row in the DB for each asset.

---

### US-6 — Graceful handling of data unavailability
*As a visitor, I want the page to remain usable even if fresh price data is temporarily unavailable so that a background API failure doesn't break the UI.*

**Acceptance Criteria:**
- AC-6.1: If the poller fails for one or more assets, the card continues to display the most recently stored price, with no visible error.
- AC-6.2: If the DB returns no rows at all for an asset (empty DB on cold deploy before seed runs), the card renders a skeleton placeholder — no crash, no blank white box.
- AC-6.3: Error logging captures poller failures with asset symbol and timestamp. No `console.log` in production — use a structured logger (e.g. `console.error` at minimum, replaced with a logger in /build).

---

## Data Requirements

### Database Schema

#### Table: `price_snapshots`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `serial` | PRIMARY KEY | |
| `symbol` | `varchar(10)` | NOT NULL | `'BTC'`, `'XAU'`, `'XAG'` |
| `price_usd` | `numeric(18, 6)` | NOT NULL | Spot price in USD |
| `price_inr` | `numeric(18, 2)` | NOT NULL | Spot price in INR, computed at insert time |
| `recorded_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Time of data collection |

**Index:** `(symbol, recorded_at DESC)` — supports all change-window and sparkline queries.

No row is ever updated or deleted. All writes are inserts. This is an append-only log.

---

### Data Sources

#### Bitcoin (BTC)

| Purpose | API | Endpoint | Key required |
|---|---|---|---|
| Historical seed (1yr) | CoinGecko Public | `/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily` | No |
| Live polling (2hr) | CoinGecko Public | `/simple/price?ids=bitcoin&vs_currencies=usd,inr` | No |

- INR price: returned natively by CoinGecko via `vs_currencies=usd,inr`.
- Historical seed endpoint returns daily OHLCV; use closing price (`prices` array).

#### Gold (XAU) and Silver (XAG)

| Purpose | API | Endpoint | Key required |
|---|---|---|---|
| Historical seed (1yr) | metalpriceapi.com | `/v1/timeframe?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&base=USD&currencies=XAU,XAG` | Free signup API key |
| Live polling (2hr) | gold-api.com | `/price/XAU` and `/price/XAG` | No |
| INR conversion (both) | Frankfurter | `/latest?from=USD&to=INR` | No |

- metalpriceapi.com free tier: signup required, no credit card. Provides bulk date-range history. Daily-delay on live prices (acceptable for seed use only).
- gold-api.com: no authentication, real-time, no documented rate limit. Used for live polling only.
- INR price for metals: `price_usd × usd_to_inr_rate` fetched from Frankfurter at poll time.

#### INR Exchange Rate

| Purpose | API | Endpoint | Key required |
|---|---|---|---|
| USD → INR conversion | Frankfurter | `/latest?from=USD&to=INR` | No |

- Called once per 2-hour poll cycle (not per asset) and reused for all three assets in that cycle.

---

### Data Pipeline

#### One-time seed (runs on first deploy)

A protected API route handler (`/api/seed`) performs the following, guarded by an environment variable secret token:

1. Check if `price_snapshots` already contains rows. If yes, exit immediately (idempotent).
2. Fetch 365 days of daily BTC prices from CoinGecko.
3. Fetch 365 days of daily XAU + XAG prices from metalpriceapi.com (single request covers full range).
4. Fetch current USD→INR rate from Frankfurter.
5. Compute INR for each historical row: `price_usd × rate` (note: this uses today's rate for all historical rows — acceptable for sparkline purposes; changes are always calculated as USD-to-USD ratio).
6. Bulk insert all rows into `price_snapshots`.

**Trigger:** Called manually (or via deploy hook) once per environment. Not called in regular traffic.

#### Scheduled live poller (every 2 hours)

An API route handler (`/api/cron/poll-prices`) performs:

1. Fetch current BTC price (USD + INR) from CoinGecko `/simple/price`.
2. Fetch current XAU spot price (USD) from gold-api.com.
3. Fetch current XAG spot price (USD) from gold-api.com.
4. Fetch current USD→INR rate from Frankfurter.
5. Compute INR for XAU and XAG.
6. Insert three rows into `price_snapshots` (one per asset).

**Trigger:** Vercel Cron Job (or equivalent) calling `GET /api/cron/poll-prices` on a `0 */2 * * *` schedule. The route is protected by a `CRON_SECRET` environment variable checked against the `Authorization` header.

---

### Change Calculation Logic

All change calculations happen at query time in the server component, not stored as computed columns.

```
24h_change_pct = ((latest_price - price_at(now - 24h)) / price_at(now - 24h)) × 100
7d_change_pct  = ((latest_price - price_at(now - 7d))  / price_at(now - 7d))  × 100
30d_change_pct = ((latest_price - price_at(now - 30d)) / price_at(now - 30d)) × 100
```

`price_at(target_time)` = price from the single row with the closest `recorded_at` ≤ target_time for the given symbol.

---

## Non-Functional Requirements

### Performance
- NFR-1: Server component render time for the card row must not exceed 300ms under normal DB load (single DB query per asset, indexed lookup).
- NFR-2: The scheduled poller must complete within 10 seconds. If any individual API call exceeds 5 seconds, it should be aborted and logged — the remaining assets continue.

### Accessibility
- NFR-3: Color is never the sole indicator of trend direction. Each badge and pill includes a directional arrow character (▲ / ▼) and the numeric percentage, so the information is available to screen readers and colorblind users.
- NFR-4: All interactive elements (if any are added) meet WCAG 2.1 AA contrast ratios against the card background.

### Responsiveness
- NFR-5: On screens ≥ 1024px, the three cards are displayed in a single horizontal row.
- NFR-6: On screens < 1024px, cards stack vertically, each taking full available width.

### Data Freshness
- NFR-7: The displayed price is at most 2 hours and 3 minutes stale under normal operation (2hr poller + 3min revalidation).
- NFR-8: Price data older than 3 hours is considered stale. No visual indicator is required in this iteration, but the timestamp of the latest snapshot must be available in the DB for future use.

---

## Scope

### In Scope

- Three asset cards: BTC, XAU, XAG
- Fields per card: icon badge, asset name + trading pair, current price (USD + INR), 24h change badge, 24h/7d/30d change pills, 30-day sparkline
- Visual state: card border color reflects 24h direction (green/red)
- Neon DB schema: `price_snapshots` table + index
- One-time seed API route (`/api/seed`)
- Scheduled poller API route (`/api/cron/poll-prices`) with cron schedule
- Server component that queries DB and computes change percentages
- Skeleton placeholder for empty/error state
- Unit tests for change calculation logic
- Component tests for the AssetCard component (renders correctly given mock data)

### Out of Scope

- User authentication or personalisation
- Clickable cards or navigation to asset detail pages
- Price alerts or notifications
- Portfolio tracking
- Additional assets beyond BTC, XAU, XAG
- Additional currencies beyond USD and INR
- Time-range selector on the sparkline (e.g. toggle between 7d/30d/1y view)
- WebSocket or SSE real-time streaming (polling only in this iteration)
- Admin dashboard or data management UI
- Any chart other than the sparkline (OHLCV, candlestick, volume bars)
- End-to-end Playwright tests (deferred to a later iteration; card is a server-rendered display component with no user interactions to cover)

---

## Dependencies

| Dependency | Type | Notes |
|---|---|---|
| CoinGecko Public API | External API | No key. Keyless rate limit ~30 req/min; acceptable for 2hr polling cadence |
| metalpriceapi.com | External API | Free signup key required. Used for seed only. Must verify historical endpoint has no per-request quota for range queries |
| gold-api.com | External API | No key. Real-time. Rate limit unconfirmed — monitor in production |
| Frankfurter API | External API | No key. No quota. Operated by the European Central Bank |
| Neon PostgreSQL | Database | Already provisioned per project stack |
| Drizzle ORM | Library | Already in stack. Schema and migration added in /build |
| echarts + echarts-for-react | Library | Already installed (`package.json`) |
| Next.js App Router | Framework | `revalidate: 180` on home page server component |
| Vercel Cron (or equivalent) | Infrastructure | For triggering `/api/cron/poll-prices` every 2 hours |

---

## Open Questions Resolved

| Question (from brainstorm) | Resolution |
|---|---|
| Which metals API? | metalpriceapi.com for seed (bulk history), gold-api.com for live polling |
| Free tier only? | Confirmed. metalpriceapi.com (free signup, no card), CoinGecko (keyless), gold-api.com (no auth), Frankfurter (no auth) |
| INR prices | CoinGecko returns INR natively for BTC. Metals: `price_usd × usd_to_inr_rate` via Frankfurter |
| Sparkline time range | 30 calendar days, one data point per day |
| Refresh cadence | Page revalidation: 180s. DB update (poller): every 2 hours |
| Need to store history in DB? | Yes — metals APIs have no free bulk historical endpoint suitable for live traffic; sparkline and change calculations use DB rows |
| How is historical data seeded? | One-time seed script on first deploy via metalpriceapi.com + CoinGecko |
| Cards clickable? | No — display only in this iteration |
| Authentication | Not required — cards are publicly visible |
| Mobile layout | Cards stack vertically below 1024px |

### One Unresolved Item (flagged for /build)

- **metalpriceapi.com free tier quota on historical endpoint**: The researcher confirmed bulk date-range support but could not confirm whether the free tier imposes a monthly request cap on the `/timeframe` (historical) endpoint specifically. This must be verified during /build before the seed script is written. Fallback: use goldapi.io for seed (365 req for 1yr history — uses full monthly quota but is a one-time operation).

---

## Out of Scope (explicit)

The following were considered and explicitly excluded from this iteration:

- Price alerts and push notifications
- User accounts and saved preferences
- Asset detail page with extended chart
- Additional currencies (EUR, GBP, etc.)
- Candlestick or OHLCV charts
- Volume indicators
- Market cap display
- News feed integration
- Dark mode
- Internationalisation (i18n)
