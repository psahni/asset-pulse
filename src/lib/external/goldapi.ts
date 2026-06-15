const BASE = 'https://api.gold-api.com'

export class GoldApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GoldApiError'
  }
}

interface SpotPriceResponse {
  price: number
  symbol: string
}

function isSpotPriceResponse(data: unknown): data is SpotPriceResponse {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return typeof d.price === 'number' && typeof d.symbol === 'string'
}

export async function fetchMetalSpotPrice(symbol: 'XAU' | 'XAG'): Promise<number> {
  const res = await fetch(`${BASE}/price/${symbol}`)

  if (!res.ok) {
    throw new GoldApiError(`gold-api.com request failed: ${res.status}`)
  }

  const data: unknown = await res.json()

  if (!isSpotPriceResponse(data)) {
    throw new GoldApiError(`Unexpected response shape from /price/${symbol}`)
  }

  return data.price
}
