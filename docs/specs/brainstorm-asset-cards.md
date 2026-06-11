# Brainstorm: Asset Cards — BTC, Gold, Silver

**SDD Stage:** /brainstorm  
**Date:** 2026-06-01  
**Status:** APPROVED — Approach C selected (2026-06-02)

---

## Problem Statement

Build a set of three asset cards to be displayed on the Asset Pulse home page — one each for Bitcoin (BTC/USD), Gold (XAU/oz), and Silver (XAG/oz). Each card must display:

- Asset identity: icon badge, name, and trading pair
- Current spot price (large, prominent)
- 24-hour percentage change badge (top-right of card, color-coded)
- Three time-window change badges: 24h, 7d, 30d (each with directional arrow + percentage)
- A sparkline line chart covering approximately 30 days of price history
- Visual state: card border/accent color reflects whether the 24h trend is positive (green) or negative (red)

The design reference (inline image + `docs/mockups/mockup-1.png`) establishes the visual language: rounded cards, colored symbol badges, pill-shaped change indicators, and a thin sparkline at the card bottom.

---

## Open Questions

1. **Data sources for Gold and Silver** — CoinGecko covers BTC well. Metals (XAU, XAG) require a separate API. Which provider is acceptable? (goldapi.io, metals-api.com, Alpha Vantage commodities, Yahoo Finance unofficial?)
2. **Free vs. paid API tier** — Do we have budget for a metals API with historical data, or must we start with free tiers?
3. **Sparkline resolution** — How many data points represent the 30-day chart? (e.g., 1 point/day = 30 pts, or hourly = ~720 pts)
4. **Refresh frequency** — How often should card prices update while the user has the page open? (e.g., every 30s, 60s, or only on page load)
5. **Loading and error states** — Should cards show skeleton loaders while fetching? What renders if an API call fails?
6. **Authentication** — Are cards visible to all visitors (public) or only authenticated users?
7. **Historical data ownership** — Do we store price snapshots in Neon DB for the sparkline, or rely entirely on the API to return historical ranges?
8. **Mobile breakpoint** — Do cards stack vertically on mobile, or does the layout collapse differently?
9. **Card interaction** — Are cards clickable (navigate to an asset detail page), or purely informational at this stage?

---

## Constraints

- **Stack is fixed:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS, Neon PostgreSQL, Drizzle ORM. No new frameworks without explicit approval.
- **ECharts already installed** (`echarts` + `echarts-for-react` in `package.json`). Sparkline must use this library unless a strong case is made.
- **No API keys in client-side code.** Any third-party API key must be handled server-side.
- **No mocking internals.** External APIs (network boundary) may be mocked in tests; internal modules may not.
- **No features beyond the spec.** Alert configuration, portfolio tracking, and detail pages are out of scope for this card feature.
- **Tests required.** A /build task is not complete until unit, component, and (where relevant) e2e tests pass.
- **No `any` in TypeScript** without an explanatory comment.

---

## Candidate Approaches

---

### Approach A — Client-Side Fetch with Free Public APIs

**Summary:** Each card component fetches its own data directly in the browser using `useEffect` / SWR. CoinGecko (free) covers BTC; a free metals endpoint (e.g., `api.metals.live` or similar unofficial endpoint) covers Gold and Silver.

**How it works:**
- A `useAssetPrice(asset)` hook calls external APIs from the client
- ECharts sparkline consumes the returned historical array
- No server components, no DB involvement, no API routes

**Advantages:**
- Fastest path to a working UI — no server infrastructure needed yet
- Easy to iterate on card layout while mocking the data shape
- No DB schema or migration required at this stage

**Trade-offs / Risks:**
- API keys (if required) would be exposed in the browser — acceptable only for fully public endpoints
- Free metals APIs are inconsistent; many lack reliable 30-day historical data or have very low rate limits
- CORS may block direct browser calls to some metals endpoints
- No control over data freshness guarantees or uptime
- Creates a refactor obligation later when real server-side data access is needed

**Complexity:** Low (UI + hooks only, no backend work)

---

### Approach B — Next.js API Routes as Server Proxy + Client Rendering

**Summary:** Next.js API routes (`/api/prices/btc`, `/api/prices/gold`, `/api/prices/silver`) act as a thin proxy to external data providers. The client fetches from these internal routes. API keys stay on the server. Next.js `fetch()` with `revalidate` provides response-level caching.

**How it works:**
- Three API route handlers call external providers (CoinGecko for BTC, a metals API for XAU/XAG)
- Each route returns a normalized `AssetPrice` type: `{ symbol, price, changes: {h24, d7, d30}, sparkline: number[] }`
- Client card components fetch from `/api/prices/[asset]` using SWR with a 60s interval
- ECharts sparkline renders the returned array
- No DB writes; caching is purely HTTP-level via Next.js fetch cache

**Advantages:**
- API keys are never exposed to the browser
- Normalized response type decouples the card UI from any upstream API shape changes
- Next.js fetch cache reduces upstream API call frequency — one server-side response serves many concurrent users
- Straightforward to swap the upstream provider later without touching card components
- Medium complexity; no DB schema needed

**Trade-offs / Risks:**
- Still dependent on third-party API availability and rate limits
- Free-tier metals APIs may not offer 30-day historical arrays; sparkline data may need approximation or stub points
- API route cold starts add latency on first load
- No persistent store means sparkline history resets if the upstream endpoint goes down

**Complexity:** Medium (API routes + normalized types + client SWR polling)

---

### Approach C — Server Components + Neon DB Price Cache + ECharts

**Summary:** Next.js server components render cards with data fetched from Neon PostgreSQL, which stores the latest prices and rolling 30-day snapshots. A lightweight background refresh mechanism (Next.js revalidation or a cron-style route handler) keeps the DB fresh from external APIs. Cards render fully server-side with zero client-side loading state.

**How it works:**
- Drizzle schema: `asset_prices` table (symbol, price, pct_24h, pct_7d, pct_30d, updated_at) + `price_history` table (symbol, timestamp, price)
- A `/api/refresh` route handler (called via Next.js `revalidatePath` or a webhook) fetches from external APIs and upserts into DB
- Server components query the DB directly via Drizzle and pass typed props to the card UI component
- ECharts sparkline data comes from the `price_history` rows
- No client-side data fetching for the initial render

**Advantages:**
- Cards render with real data on first paint — no loading shimmer on initial page load
- Historical price data is owned and controlled; sparkline is reliable regardless of upstream API availability
- Clean separation: data access in server components, rendering in pure UI components (easy to unit test)
- Foundation for future features (alerts, price history charts, notifications) is already in place
- Resilient to upstream API downtime once data is seeded

**Trade-offs / Risks:**
- Highest upfront complexity: requires DB schema, migration, and a refresh mechanism before the first card renders real data
- Refresh staleness: if the background refresh fails, cards show stale prices
- Needs a solution for real-time or near-real-time price updates (revalidation tags, or a secondary client-side polling layer for the live price)
- More moving parts to test (DB, server component data access, refresh handler)

**Complexity:** High (DB schema + server components + refresh mechanism + ECharts)

---

## Visual Design Notes (from references)

Both references agree on these card elements:

| Element | Detail |
|---|---|
| Icon badge | Colored rounded square, asset symbol letter(s) — B (orange), Au (amber), Ag (cyan) |
| Asset name | Bold, e.g. "Bitcoin"; sub-label trading pair "BTC / USD" |
| 24h badge | Top-right pill, green background + up arrow or red background + down arrow |
| Price | Large bold number, formatted with commas and two decimal places |
| Change row | Three pills side by side: 24h / 7d / 30d, each with arrow + percentage + timeframe label |
| Sparkline | Full-width thin line chart at card bottom; green if net positive over period, red if negative |
| Card border | Subtle colored border or shadow reflecting 24h direction |
| Card shape | Rounded corners, white/light background (light theme), slight drop shadow |

The `echarts-for-react` library already in the project handles the sparkline. A minimal ECharts line series with no axes, no tooltip, and `smooth: true` matches the reference aesthetic.

---

## Selected Approach

**Approach C — Server Components + Neon DB Price Cache** is selected with the following constraints confirmed by the user:

| Constraint | Decision |
|---|---|
| API cost | Free tier only — no paid API keys |
| Currencies | USD and INR (Indian Rupee) |
| Rendering | Server components (Next.js App Router) |
| Refresh interval | 180 seconds (`next: { revalidate: 180 }` on fetch calls) |
| Sparkline | 30-day history via ECharts (echarts-for-react already installed) |

### Candidate Free APIs (to be confirmed in /define)

**Bitcoin (BTC):**
- CoinGecko Public API (no key required on free tier)
  - `/coins/bitcoin?market_data=true` — price in USD + INR, 24h/7d/30d change percentages natively
  - `/coins/bitcoin/market_chart?vs_currency=usd&days=30` — sparkline history

**Gold (XAU) and Silver (XAG):**
- `api.metals.live` (completely free, no key) — current spot prices in USD; INR conversion via secondary FX step
- Frankfurter API (free, no key) — FX rates for USD→INR conversion
- Historical data for sparkline from metals.live range endpoint
- *To be evaluated and confirmed in /define*

### Next Step

Proceed to `/define` to write the formal specification with acceptance criteria.
