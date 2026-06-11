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

## Git Workflow

### Start a new feature branch

```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature-name
```

### Push branch and open a PR

```bash
git add <files>
git commit -m "feat: your message"
git push -u origin feat/your-feature-name

# Create PR via GitHub CLI
gh pr create --base main --title "feat: your title" --body "Your description"
```

### Sync with main after a PR is merged

```bash
git checkout main
git pull origin main
```

### Delete a feature branch after merge (optional)

```bash
git branch -d feat/your-feature-name                    # local
git push origin --delete feat/your-feature-name         # remote
```

---

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

## External APIs

| API | Used for | Key required |
|---|---|---|
| [CoinGecko](https://www.coingecko.com/en/api) | BTC price (USD + INR), 1yr seed history | **No** — fully public |
| [gold-api.com](https://gold-api.com) | Gold (XAU) and Silver (XAG) live spot prices | **No** — fully public |
| [metalpriceapi.com](https://metalpriceapi.com) | Gold + Silver 1yr historical seed (one-time only) | Yes — free signup, no credit card |
| [Frankfurter](https://www.frankfurter.app) | USD → INR exchange rate | **No** — fully public |

> CoinGecko and gold-api.com require no API key. Only metalpriceapi.com needs a free signup key, and it is only called once during the initial database seed.

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
