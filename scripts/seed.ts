import { db } from '../src/lib/db'
import { priceSnapshots } from '../src/lib/db/schema'
import {
  fetchBtcCurrentPrice,
  fetchBtcHistory365d,
} from '../src/lib/external/coingecko'
import { fetchMetalSpotPrice } from '../src/lib/external/goldapi'
import { fetchUsdToInr } from '../src/lib/external/frankfurter'
import { fetchMetalsHistory30d } from '../src/lib/external/metalpriceapi'

const CHUNK_SIZE = 100

async function main() {
  console.log('🌱 Asset Pulse Seed: Starting...')

  // Check if already seeded
  const existing = await db
    .select()
    .from(priceSnapshots)
    .limit(1)

  if (existing.length > 0) {
    console.log('✓ Database already seeded. Skipping.')
    process.exit(0)
  }

  console.log('📡 Fetching data from external APIs...')

  const apiKey = process.env.METAL_PRICE_API_KEY
  if (!apiKey) {
    throw new Error('METAL_PRICE_API_KEY env var is required')
  }

  const [btcCurrent, btcHistory, usdToInr] = await Promise.all([
    fetchBtcCurrentPrice(),
    fetchBtcHistory365d(),
    fetchUsdToInr(),
  ])

  // metalpriceapi.com free tier: max 30 days. Fetch separately with custom date range
  const metalsHistory = await fetchMetalsHistory30d(apiKey)

  // Fetch current XAU/XAG prices
  const [xauCurrent, xagCurrent] = await Promise.all([
    fetchMetalSpotPrice('XAU'),
    fetchMetalSpotPrice('XAG'),
  ])

  console.log(`✓ Fetched BTC history (${btcHistory.length} days)`)
  console.log(`✓ Fetched XAU history (${metalsHistory.xau.length} days, limited by free tier quota)`)
  console.log(`✓ Fetched XAG history (${metalsHistory.xag.length} days, limited by free tier quota)`)
  console.log(`✓ Current exchange rate: 1 USD = ₹${usdToInr}`)

  // Build rows to insert (prices as strings for numeric columns)
  const rows = [
    // BTC history
    ...btcHistory.map((h) => ({
      symbol: 'BTC',
      priceUsd: h.priceUsd.toString(),
      priceInr: (h.priceUsd * usdToInr).toString(),
      recordedAt: h.date,
    })),
    // XAU history
    ...metalsHistory.xau.map((h) => ({
      symbol: 'XAU',
      priceUsd: h.priceUsd.toString(),
      priceInr: (h.priceUsd * usdToInr).toString(),
      recordedAt: h.date,
    })),
    // XAG history
    ...metalsHistory.xag.map((h) => ({
      symbol: 'XAG',
      priceUsd: h.priceUsd.toString(),
      priceInr: (h.priceUsd * usdToInr).toString(),
      recordedAt: h.date,
    })),
    // Current prices
    {
      symbol: 'BTC',
      priceUsd: btcCurrent.usd.toString(),
      priceInr: btcCurrent.inr.toString(),
      recordedAt: new Date(),
    },
    {
      symbol: 'XAU',
      priceUsd: xauCurrent.toString(),
      priceInr: (xauCurrent * usdToInr).toString(),
      recordedAt: new Date(),
    },
    {
      symbol: 'XAG',
      priceUsd: xagCurrent.toString(),
      priceInr: (xagCurrent * usdToInr).toString(),
      recordedAt: new Date(),
    },
  ]

  console.log(`\n📝 Inserting ${rows.length} rows (chunk size: ${CHUNK_SIZE})...`)

  let inserted = 0
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE)
    await db.insert(priceSnapshots).values(chunk)
    inserted += chunk.length
    console.log(`  ✓ Inserted ${inserted}/${rows.length}`)
  }

  console.log(`\n✅ Seed complete!`)
  console.log(`   • BTC: ${btcHistory.length} history rows + 1 current (365d from CoinGecko)`)
  console.log(`   • XAU: ${metalsHistory.xau.length} history rows + 1 current (5d from metalpriceapi free tier)`)
  console.log(`   • XAG: ${metalsHistory.xag.length} history rows + 1 current (5d from metalpriceapi free tier)`)
  console.log(`   • Total: ${inserted} rows inserted`)
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message)
  process.exit(1)
})
