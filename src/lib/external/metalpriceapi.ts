// Free tier: 100 req/month, one currency per timeframe request.
// Seed uses 2 calls total (XAU + XAG). Response includes USDXAU/USDXAG fields
// (USD per troy oz) directly — no inversion required.
const BASE = 'https://api.metalpriceapi.com/v1'

export class MetalPriceApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MetalPriceApiError'
  }
}

type TimeframeResponse = {
  success: true
  base: string
  rates: Record<string, Record<string, number>>
}

type ErrorResponse = {
  success: false
  error: { statusCode: number; message: string }
}

export type MetalHistory = {
  date: Date
  priceUsd: number
}

export type MetalsHistory = {
  xau: MetalHistory[]
  xag: MetalHistory[]
}

function isTimeframeResponse(data: unknown): data is TimeframeResponse {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return (
    d.success === true &&
    typeof d.base === 'string' &&
    typeof d.rates === 'object' &&
    d.rates !== null
  )
}

function isErrorResponse(data: unknown): data is ErrorResponse {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return d.success === false && typeof d.error === 'object' && d.error !== null
}

function extractPrices(
  rates: Record<string, Record<string, number>>,
  priceKey: string
): MetalHistory[] {
  return Object.entries(rates)
    .flatMap(([dateStr, dayRates]) => {
      const priceUsd = dayRates[priceKey]
      if (typeof priceUsd !== 'number' || isNaN(priceUsd)) return []
      return [{ date: new Date(dateStr), priceUsd }]
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

async function fetchTimeframe(
  symbol: 'XAU' | 'XAG',
  startDate: string,
  endDate: string,
  apiKey: string
): Promise<Record<string, Record<string, number>>> {
  const url =
    `${BASE}/timeframe?start_date=${startDate}&end_date=${endDate}` +
    `&base=USD&currencies=${symbol}&api_key=${apiKey}`

  const res = await fetch(url)

  if (!res.ok) {
    throw new MetalPriceApiError(`metalpriceapi.com request failed: ${res.status}`)
  }

  const data: unknown = await res.json()

  if (isErrorResponse(data)) {
    throw new MetalPriceApiError(data.error.message)
  }

  if (!isTimeframeResponse(data)) {
    throw new MetalPriceApiError('Unexpected response shape from metalpriceapi.com')
  }

  return data.rates
}

export async function fetchMetalsHistory365d(apiKey: string): Promise<MetalsHistory> {
  const now = new Date()
  const yearAgo = new Date(now)
  yearAgo.setDate(yearAgo.getDate() - 365)

  const fmt = (d: Date): string => d.toISOString().slice(0, 10)
  const start = fmt(yearAgo)
  const end = fmt(now)

  const [xauRates, xagRates] = await Promise.all([
    fetchTimeframe('XAU', start, end, apiKey),
    fetchTimeframe('XAG', start, end, apiKey),
  ])

  return {
    xau: extractPrices(xauRates, 'USDXAU'),
    xag: extractPrices(xagRates, 'USDXAG'),
  }
}
