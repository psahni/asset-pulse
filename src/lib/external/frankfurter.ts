const BASE = 'https://api.frankfurter.app'

export class FrankfurterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FrankfurterError'
  }
}

interface LatestRatesResponse {
  rates: { INR: number }
}

function isLatestRatesResponse(data: unknown): data is LatestRatesResponse {
  if (typeof data !== 'object' || data === null) return false
  
  const d = data as Record<string, unknown>
  
  if (typeof d.rates !== 'object' || d.rates === null) return false
  const rates = d.rates as Record<string, unknown>
  
  return typeof rates.INR === 'number'
}

export async function fetchUsdToInr(): Promise<number> {
  const res = await fetch(`${BASE}/latest?from=USD&to=INR`)

  if (!res.ok) {
    throw new FrankfurterError(`Frankfurter request failed: ${res.status}`)
  }

  const data: unknown = await res.json()

  if (!isLatestRatesResponse(data)) {
    throw new FrankfurterError('Unexpected response shape from Frankfurter /latest')
  }

  return data.rates.INR
}
