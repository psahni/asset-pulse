import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchBtcCurrentPrice, fetchBtcHistory365d, CoinGeckoError } from '../coingecko'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockClear()
})

function mockOk(data: unknown): void {
  fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => data })
}

function mockError(status: number): void {
  fetchMock.mockResolvedValueOnce({ ok: false, status, json: async () => ({}) })
}

// ─── fetchBtcCurrentPrice ────────────────────────────────────────────────────

describe('fetchBtcCurrentPrice', () => {
  it('returns usd and inr from a valid response', async () => {
    mockOk({ bitcoin: { usd: 98000, inr: 8200000 } })
    const result = await fetchBtcCurrentPrice()
    expect(result).toEqual({ usd: 98000, inr: 8200000 })
  })

  it('calls the correct CoinGecko endpoint', async () => {
    mockOk({ bitcoin: { usd: 98000, inr: 8200000 } })
    await fetchBtcCurrentPrice()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,inr'
    )
  })

  it('throws CoinGeckoError on a non-ok HTTP response', async () => {
    mockError(429)
    await expect(fetchBtcCurrentPrice()).rejects.toThrow(CoinGeckoError)
  })

  it('includes the status code in the error message', async () => {
    mockError(429)
    await expect(fetchBtcCurrentPrice()).rejects.toThrow('429')
  })

  it('throws CoinGeckoError when bitcoin key is missing', async () => {
    mockOk({ ethereum: { usd: 3000 } })
    await expect(fetchBtcCurrentPrice()).rejects.toThrow(CoinGeckoError)
  })

  it('throws CoinGeckoError when usd is not a number', async () => {
    mockOk({ bitcoin: { usd: '98000', inr: 8200000 } })
    await expect(fetchBtcCurrentPrice()).rejects.toThrow(CoinGeckoError)
  })
})

// ─── fetchBtcHistory365d ─────────────────────────────────────────────────────

describe('fetchBtcHistory365d', () => {
  const ts1 = 1700000000000
  const ts2 = 1700086400000

  it('returns mapped date/priceUsd array', async () => {
    mockOk({ prices: [[ts1, 37000], [ts2, 37500]] })
    const result = await fetchBtcHistory365d()
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ date: new Date(ts1), priceUsd: 37000 })
    expect(result[1]).toEqual({ date: new Date(ts2), priceUsd: 37500 })
  })

  it('calls the correct CoinGecko endpoint', async () => {
    mockOk({ prices: [] })
    await fetchBtcHistory365d()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily'
    )
  })

  it('returns empty array when prices list is empty', async () => {
    mockOk({ prices: [] })
    const result = await fetchBtcHistory365d()
    expect(result).toEqual([])
  })

  it('throws CoinGeckoError on a non-ok HTTP response', async () => {
    mockError(500)
    await expect(fetchBtcHistory365d()).rejects.toThrow(CoinGeckoError)
  })

  it('throws CoinGeckoError when prices key is missing', async () => {
    mockOk({ market_caps: [], total_volumes: [] })
    await expect(fetchBtcHistory365d()).rejects.toThrow(CoinGeckoError)
  })

  it('throws CoinGeckoError when a price entry has non-numeric values', async () => {
    mockOk({ prices: [['bad', 37000]] })
    await expect(fetchBtcHistory365d()).rejects.toThrow(CoinGeckoError)
  })
})
