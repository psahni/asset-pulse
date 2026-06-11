# Asset Pulse

Asset intelligence dashboard for Bitcoin, Gold, and Silver — real-time prices, trends, and market context in one place.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19 + Tailwind CSS
- **Language:** TypeScript (strict mode)
- **Database:** Neon PostgreSQL + Drizzle ORM
- **Charts:** ECharts (echarts-for-react)
- **Testing:** Vitest + React Testing Library + Playwright

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```bash
DATABASE_URL=postgresql://...         # Neon PostgreSQL connection string
METAL_PRICE_API_KEY=...               # metalpriceapi.com free API key
CRON_SECRET=...                       # Random secret to protect the cron endpoint
SEED_SECRET=...                       # Random secret to protect the seed endpoint
```

### 3. Push the database schema

```bash
npm run db:push
```

### 4. Seed historical price data (one-time)

```bash
curl -H "Authorization: Bearer <SEED_SECRET>" http://localhost:3000/api/seed
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once (CI mode) |
| `npm run db:push` | Push Drizzle schema to Neon database |
| `npm run db:studio` | Open Drizzle Studio (visual DB browser) |

## Data Pipeline

Prices are kept fresh by a scheduled background poller:

- **Seed** (`/api/seed`) — one-time historical backfill (1 year of daily data for BTC, Gold, Silver)
- **Poller** (`/api/cron/poll-prices`) — runs every 2 hours via Vercel Cron, inserts fresh spot prices
- **Cards** — server components read from Neon DB, revalidate every 180 seconds

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
├── components/asset-card/  # Asset card UI components
├── lib/
│   ├── db/                 # Drizzle client and schema
│   ├── prices/             # DB queries and calculation utilities
│   └── external/           # External API clients (CoinGecko, gold-api, etc.)
└── types/                  # Shared TypeScript types
```
