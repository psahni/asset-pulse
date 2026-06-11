# Research: API Data Availability for Asset Cards

**Topic:** Evaluate whether CoinGecko, api.metals.live, and Frankfurter provide the data required for BTC/XAU/XAG asset cards — specifically pre-calculated percentage changes (24h, 7d, 30d), INR pricing, and 30-day sparkline history — without paid tiers or database storage.

**Methodology:** Live API calls where accessible, official documentation review, and verified secondary sources (CoinGecko support articles, metals.dev docs, Frankfurter docs, community forums). API endpoints that refused connections were evaluated via documentation and search results. All findings are dated 2026-06-02.

---

## Findings

### Question 1 — Pre-calculated Percentage Changes and INR Pricing

#### CoinGecko — `/api/v3/coins/markets`

- **Base URL (keyless):** `https://api.coingecko.com/api/v3/coins/markets`
- **Endpoint availability:** Available on the free keyless public tier (no API key required).
- **Pre-calculated changes:**
  - `price_change_percentage_24h` is returned by default.
  - `price_change_percentage_7d` and `price_change_percentage_30d` are returned when you pass `price_change_percentage=24h,7d,30d` as a query parameter. These are server-calculated; no client-side computation needed.
- **INR native support:** Yes. Pass `vs_currency=inr` to receive all price and change fields denominated in INR. INR (`"inr"`) is confirmed in `/simple/supported_vs_currencies`. You can also fetch both USD and INR in two separate calls or rely on FX conversion.
- **Sparkline:** The parameter `sparkline=true` returns a `sparkline_in_7d` sub-object containing 168 hourly price points (7 days only). There is no `sparkline_in_30d` equivalent on this endpoint.
- **Single-call coverage for asset card:** One call with `ids=bitcoin&vs_currency=usd&price_change_percentage=24h,7d,30d&sparkline=true` returns current price, all three change percentages, and a 7-day sparkline. A second call with `vs_currency=inr` is needed for INR price, or Frankfurter conversion can be applied.

#### CoinGecko — `/api/v3/simple/price`

- **Pre-calculated changes:** Only 24h change is available (`include_24hr_change=true`). No 7d or 30d parameters exist on this endpoint.
- **INR support:** Yes, via `vs_currencies=usd,inr`.
- **Use case fit:** Narrower than `/coins/markets`; no 7d/30d changes. Not sufficient as a standalone source.

#### api.metals.live — `/v1/spot`

- **Availability:** The domain (`api.metals.live`) was not reachable during research (ECONNREFUSED on multiple attempts). Based on documented sources and community references:
  - The service is a lightweight, no-key-required public API for spot precious metals prices.
  - Free tier is available for applications under ~30,000 requests/month.
  - **Historic data available: last ~24 hours only.** No multi-day history endpoint is documented.
  - Response fields documented: spot price in USD for gold, silver, platinum, palladium. No pre-calculated 24h, 7d, or 30d percentage changes are returned.
  - **INR support:** Not documented. USD-denominated only; INR conversion would require Frankfurter.
  - **Percentage changes:** Not returned. Would require client-side calculation from stored or fetched historical values.
- **Status concern:** The API was unreachable during this research session. Reliability for production use is uncertain without further testing.

#### Frankfurter — `/v2/rate/USD/INR` (and `/v2/rates`)

- **Purpose:** FX conversion only — not an asset price source.
- **INR rate:** Yes, USD→INR is supported. Response: `{ "amount": 1.0, "base": "USD", "date": "2026-06-01", "rates": { "INR": 94.99 } }`.
- **Usage pattern:** Fetch once per cache window (180s) alongside asset prices; multiply USD prices by the INR rate to produce INR values for XAU and XAG.
- **Rate limits:** No monthly/daily caps. Requests are throttled only to prevent abuse; thresholds are undocumented. For high-volume use, the provider recommends caching or self-hosting.
- **Historical rates:** Available via `/v2/rates?from=YYYY-MM-DD&to=YYYY-MM-DD`. Covers 201 currencies from 84 central banks back to 1948.

---

### Question 2 — 30-Day Sparkline History Without DB Storage

#### CoinGecko — `/api/v3/coins/{id}/market_chart`

- **Availability:** Available on the free keyless public tier.
- **Parameters:** `vs_currency=usd&days=30` returns hourly price data for the past 30 days (for ranges 2–90 days, granularity is automatically hourly). This yields approximately 720 data points.
- **Downsampling for sparkline:** 30 hourly points can be selected by sampling every 24th entry, or the `interval=daily` override can be requested (though daily override may be restricted to paid tiers — see Open Questions).
- **Rate limits (keyless):** Dynamic IP-based throttling; approximately 5–30 calls/minute depending on global load. No fixed monthly cap documented for keyless tier. At a 180s revalidation interval, the app makes ~20 calls/hour to this endpoint per asset — this is within safe bounds for low-traffic deployments but vulnerable to throttling under concurrent load.
- **sparkline_in_7d:** Covers 7 days (168 hourly points) only. Cannot be extended to 30 days.
- **30-day history verdict:** Available via market_chart with `days=30`, returning hourly data. Sufficient for a 30-point sparkline with client-side downsampling.

#### api.metals.live — Historical Range

- **Historical data:** Only the last ~24 hours is documented as available. No 30-day history endpoint exists. This is a critical gap for XAU and XAG sparklines.
- **Workaround required:** A different metals data source is needed for 30-day history.

#### Stooq (Fallback for Metals History)

- **Access method:** CSV download via URL pattern: `https://stooq.com/q/d/l/?s=xauusd&i=d` (gold) and `https://stooq.com/q/d/l/?s=xagusd&i=d` (silver). Returns daily OHLCV CSV.
- **Data depth:** Gold data available back to the late 1700s; silver back to at least 2010.
- **Granularity:** Daily (one row per trading day).
- **Key requirement:** Stooq added a CAPTCHA/key requirement for direct programmatic downloads; direct API use via pandas-datareader is known to be broken. Web-scraping or manual key generation may be required.
- **Rate limits:** Not documented; CSV endpoint behavior is inconsistent for automated use.
- **Verdict:** Stooq is unreliable for automated production use without a stable programmatic interface.

#### metals.dev (Fallback for Metals History)

- **Timeseries endpoint:** Available; returns daily historical rates for a specified date range (max 30-day window per request).
- **Coverage:** 5+ years of historical precious metals data.
- **Free tier:** 100 requests/month total. At 180s revalidation intervals, a single page load cycle for XAU + XAG history = 2 calls. Monthly budget is exhausted in ~50 page loads. **Not viable for serving live traffic.**
- **Key required:** Yes — free account signup required.
- **INR support:** 170+ currencies supported, including INR.

#### freegoldapi.com (Fallback — Gold Only)

- **Access:** No API key required; CORS-enabled.
- **Endpoint:** `https://freegoldapi.com/data/latest.json` returns a full historical array (gold prices from 1258 to present), refreshed daily.
- **Silver:** Not available in the merged dataset.
- **Use case:** Suitable for 30-day gold sparkline (slice the last 30 records from the daily dataset). Not a source for silver or for real-time intraday prices.
- **Rate limits:** None documented.

---

### Question 3 — Trade-offs: API-Only vs. DB-Cached History

#### API-Only (No DB Storage)

**What works:**
- CoinGecko `market_chart?days=30` delivers 30-day BTC history on every request at 180s intervals for low-traffic deployments. At ~20 requests/hour per asset, this stays within observed keyless limits for a single-user or low-concurrency app.
- Frankfurter provides FX conversion reliably with no quota constraints.
- freegoldapi.com provides gold daily history with no rate limit concerns.

**Gaps and risks:**
- **Metals history is the primary gap.** api.metals.live provides no multi-day history. metals.dev's free tier has a hard 100 req/month cap. freegoldapi.com covers gold but not silver. No confirmed free, key-free, reliable silver 30-day history source was identified.
- **CoinGecko keyless throttling is undocumented and variable.** Under concurrent users (e.g., 10+ simultaneous page loads), the 180s revalidation cache in Next.js ISR helps, but cold cache hits could trigger rate limiting (HTTP 429). The app would need exponential backoff and graceful degradation.
- **Data loss on cold starts / cache eviction.** If the Next.js edge cache is invalidated (deployment, restart), the app will re-fetch all history endpoints simultaneously. With keyless CoinGecko, this burst could trigger 429 errors.
- **No point-in-time replay.** If an external API goes down between revalidation cycles, the cached stale data is served — but if the cache itself expires during an outage, price cards will show errors or stale data with no fallback.

#### DB-Cached History (Daily Snapshots in Neon)

**What you gain:**
- **Reliable sparkline source.** One background job writes daily closing prices to Neon. The sparkline query becomes a local DB read — zero external API dependency per page load.
- **Silver coverage.** A DB store solves the silver history gap without relying on an unreliable free API.
- **Resilience.** If an external API is temporarily unavailable, the DB serves the last N days of data.
- **Burst safety.** Concurrent page loads read from DB; only background refresh jobs (running once/day or once/hour) hit external APIs. No user-facing 429 exposure.
- **Percentage change calculation.** 7d and 30d changes for metals can be computed precisely from stored closing prices (close_today / close_N_days_ago - 1), removing reliance on any API providing pre-calculated multi-period changes.

**What you add in complexity:**
- A scheduled job (cron or Next.js Route Handler with revalidation) to write daily metal price snapshots.
- A Neon table (e.g., `asset_price_history`) with ~90 rows per asset per quarter.
- Drizzle schema and migration for the history table.
- The job must handle the case where the source API (metals.dev or another) is unavailable — retry logic or alerting needed.

**What you lose:**
- Nothing that wasn't already a gap in the API-only approach. DB storage eliminates gaps rather than introducing them.

---

## Comparison Table

| Dimension | CoinGecko (BTC) | api.metals.live (XAU/XAG) | metals.dev (XAU/XAG) | freegoldapi.com (XAU) | Frankfurter (FX) |
|---|---|---|---|---|---|
| API key required | No (keyless) | No (under 30k req/mo) | Yes (free signup) | No | No |
| Current spot price | Yes | Yes (USD only) | Yes (170+ currencies) | No (daily data only) | N/A |
| 24h % change | Yes (native) | Not returned | Via Spot endpoint (prev-day delta) | No | No |
| 7d % change | Yes (via param) | Not returned | Not returned | No | No |
| 30d % change | Yes (via param) | Not returned | Not returned | No | No |
| INR native | Yes (vs_currency=inr) | No | Yes | No | USD→INR rate only |
| 30-day history | Yes (hourly via market_chart) | No (~24h only) | Yes (daily, 100 req/mo free) | Yes (daily, no limit) | Yes (rates only) |
| Silver 30d history | N/A | No | Yes (paid viable) | No | N/A |
| Rate limit (free) | ~5–30 req/min (variable) | ~30k req/mo | 100 req/mo | None documented | None documented |
| Reliability concern | Keyless throttle variable | Domain unreachable in test | Quota too low for live traffic | Daily refresh only | High reliability |

---

## Open Questions

1. **api.metals.live availability:** The domain was unreachable during research (ECONNREFUSED). Is this a temporary outage or permanent deprecation? If deprecated, a replacement metals spot source must be confirmed before /define proceeds.

2. **CoinGecko `interval=daily` on keyless tier:** The docs note that forcing `interval=daily` on `market_chart` may be restricted to paid plans. If true, the app receives ~720 hourly points for 30 days and must downsample client-side. This is functionally fine but should be confirmed before implementation.

3. **Silver 30-day history source:** No confirmed free, key-free, reliable source for XAG 30-day daily history was found. If api.metals.live is confirmed unreachable, the /define spec must either: (a) accept DB storage for metal history, (b) accept a free-with-key provider (metals.dev, but only 100 req/mo), or (c) scope silver sparkline out of v1.

4. **CoinGecko Demo API vs. keyless for production:** The Demo API (free, requires registration) provides a stable 100 calls/min vs. keyless's variable 5–30 calls/min. If the spec targets production traffic rather than personal use, the Demo key may be required — which changes the "no key required" assumption for BTC.

5. **Frankfurter v1 vs. v2:** The active API appears to be on `api.frankfurter.dev/v2/`. The previously documented `api.frankfurter.app/v1/latest` endpoint was used in the original brief; confirm which base URL and version is current before implementation.

6. **INR for metals via api.metals.live:** Since api.metals.live returns USD only and was unreachable, INR conversion for XAU/XAG will require Frankfurter regardless of metals source. This is a confirmed two-API dependency for metals INR pricing.

---

**Date:** 2026-06-02
**Researcher:** Claude Code (claude-sonnet-4-6)
**Sources:**
- CoinGecko Keyless Public API docs: https://docs.coingecko.com/docs/keyless-public-api
- CoinGecko /coins/markets reference: https://docs.coingecko.com/reference/coins-markets
- CoinGecko /coins/{id}/market_chart reference: https://docs.coingecko.com/reference/coins-id-market-chart
- CoinGecko rate limit support article: https://support.coingecko.com/hc/en-us/articles/4538771776153-What-is-the-rate-limit-for-CoinGecko-API-public-plan
- CoinGecko common errors / rate limits: https://docs.coingecko.com/docs/common-errors-rate-limit
- api.metals.live homepage (unreachable during research): https://api.metals.live/
- metals.dev pricing: https://metals.dev/pricing
- metals.dev docs: https://metals.dev/docs
- Frankfurter API docs: https://www.frankfurter.dev/docs/
- freegoldapi.com: https://freegoldapi.com/
- Stooq commodities discussion: https://forum.portfolio-performance.info/t/historical-data-good-source-for-csv-imports-stooq/37973
- CoinGecko best free crypto APIs 2026: https://www.coingecko.com/learn/best-free-crypto-api
