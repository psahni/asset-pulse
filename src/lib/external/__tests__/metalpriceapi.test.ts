import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchMetalsHistory365d, MetalPriceApiError } from '../metalpriceapi'

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

const xauResponse = {
  success: true,
  base: 'USD',
  start_date: '2026-06-10',
  end_date: '2026-06-12',
  rates: {
    '2026-06-10': { USDXAU: 4218.76, XAU: 0.000237 },
    '2026-06-11': { USDXAU: 4048.27, XAU: 0.000247 },
    '2026-06-12': { USDXAU: 4217.11, XAU: 0.000237 },
  },
}

const xagResponse = {
  success: true,
  base: 'USD',
  start_date: '2026-06-10',
  end_date: '2026-06-12',
  rates: {
    '2026-06-10': { USDXAG: 70.18, XAG: 0.01425 },
    '2026-06-11': { USDXAG: 71.02, XAG: 0.01408 },
    '2026-06-12': { USDXAG: 70.55, XAG: 0.01417 },
  },
}

describe('fetchMetalsHistory365d', () => {
  it('returns xau and xag arrays with date and priceUsd', async () => {
    mockOk(xauResponse)
    mockOk(xagResponse)
    const result = await fetchMetalsHistory365d('test-key')

    expect(result.xau).toHaveLength(3)
    expect(result.xag).toHaveLength(3)
    expect(result.xau[0]).toEqual({ date: new Date('2026-06-10'), priceUsd: 4218.76 })
    expect(result.xag[0]).toEqual({ date: new Date('2026-06-10'), priceUsd: 70.18 })
  })

  it('returns prices sorted oldest to newest', async () => {
    mockOk(xauResponse)
    mockOk(xagResponse)
    const result = await fetchMetalsHistory365d('test-key')

    const xauDates = result.xau.map((e) => e.date.getTime())
    expect(xauDates).toEqual([...xauDates].sort((a, b) => a - b))
  })

  it('uses the USDXAU field (not the inverse XAU field)', async () => {
    mockOk(xauResponse)
    mockOk(xagResponse)
    const result = await fetchMetalsHistory365d('test-key')

    // USDXAU is ~4218, not the inverse ~0.000237
    expect(result.xau[0].priceUsd).toBeGreaterThan(100)
  })

  it('throws MetalPriceApiError on non-ok HTTP response', async () => {
    mockError(500)
    mockError(500)
    await expect(fetchMetalsHistory365d('test-key')).rejects.toThrow(MetalPriceApiError)
  })

  it('throws MetalPriceApiError with API error message on success:false', async () => {
    mockOk({
      success: false,
      error: { statusCode: 412, message: 'Timeframe queries with multiple currencies require a paid plan.' },
    })
    mockOk(xagResponse)
    await expect(fetchMetalsHistory365d('test-key')).rejects.toThrow(
      'Timeframe queries with multiple currencies require a paid plan.'
    )
  })

  it('skips dates where USDXAU is missing', async () => {
    mockOk({
      success: true,
      base: 'USD',
      rates: {
        '2026-06-10': { XAU: 0.000237 },  // USDXAU missing
        '2026-06-11': { USDXAU: 4048.27, XAU: 0.000247 },
      },
    })
    mockOk(xagResponse)
    const result = await fetchMetalsHistory365d('test-key')
    expect(result.xau).toHaveLength(1)
    expect(result.xau[0].priceUsd).toBe(4048.27)
  })
})
