const BASE = 'https://api.coingecko.com/api/v3'

export class CoinGeckoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CoinGeckoError'
  }
}

interface SimplePriceResponse {
  bitcoin: { usd: number; inr: number }
}

interface MarketChartResponse {
  prices: [number, number][]
}

function isSimplePriceResponse(data: unknown): data is SimplePriceResponse {
  if (typeof data !== 'object' || data === null) return false
  
  const d = data as Record<string, unknown>
  if (typeof d.bitcoin !== 'object' || d.bitcoin === null) return false
  
  const btc = d.bitcoin as Record<string, unknown>
  return typeof btc.usd === 'number' && typeof btc.inr === 'number'
}

function isMarketChartResponse(data: unknown): data is MarketChartResponse {
  if (typeof data !== 'object' || data === null) return false
  
  const d = data as Record<string, unknown>
  if (!Array.isArray(d.prices)) return false
  
  return d.prices.every(
    (entry) =>
      Array.isArray(entry) &&
      entry.length >= 2 &&
      typeof entry[0] === 'number' &&
      typeof entry[1] === 'number'
  )
}

// BTC Current
export async function fetchBtcCurrentPrice(): Promise<{ usd: number; inr: number }> {
  const res = await fetch(`${BASE}/simple/price?ids=bitcoin&vs_currencies=usd,inr`)

  if (!res.ok) {
    throw new CoinGeckoError(`CoinGecko request failed: ${res.status}`)
  }

  const data: unknown = await res.json()

  if (!isSimplePriceResponse(data)) {
    throw new CoinGeckoError('Unexpected response shape from /simple/price')
  }

  return { usd: data.bitcoin.usd, inr: data.bitcoin.inr }
}

// BTC Historical
export async function fetchBtcHistory365d(): Promise<Array<{ date: Date; priceUsd: number }>> {
  const res = await fetch(
    `${BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily`
  )

  if (!res.ok) {
    throw new CoinGeckoError(`CoinGecko request failed: ${res.status}`)
  }

  const data: unknown = await res.json()

  if (!isMarketChartResponse(data)) {
    throw new CoinGeckoError('Unexpected response shape from /market_chart')
  }

  return data.prices.map(([timestampMs, priceUsd]) => ({
    date: new Date(timestampMs),
    priceUsd,
  }))
}
