import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchMetalSpotPrice, GoldApiError } from '../goldapi'

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

describe('fetchMetalSpotPrice', () => {
  it('returns the price for XAU', async () => {
    mockOk({ price: 4314.0, symbol: 'XAU', currency: 'USD' })
    const result = await fetchMetalSpotPrice('XAU')
    expect(result).toBe(4314.0)
  })

  it('returns the price for XAG', async () => {
    mockOk({ price: 70.18, symbol: 'XAG', currency: 'USD' })
    const result = await fetchMetalSpotPrice('XAG')
    expect(result).toBe(70.18)
  })

  it('calls the correct endpoint for XAU', async () => {
    mockOk({ price: 4314.0, symbol: 'XAU', currency: 'USD' })
    await fetchMetalSpotPrice('XAU')
    expect(fetchMock).toHaveBeenCalledWith('https://api.gold-api.com/price/XAU')
  })

  it('calls the correct endpoint for XAG', async () => {
    mockOk({ price: 70.18, symbol: 'XAG', currency: 'USD' })
    await fetchMetalSpotPrice('XAG')
    expect(fetchMock).toHaveBeenCalledWith('https://api.gold-api.com/price/XAG')
  })

  it('throws GoldApiError on a non-ok HTTP response', async () => {
    mockError(500)
    await expect(fetchMetalSpotPrice('XAU')).rejects.toThrow(GoldApiError)
  })

  it('includes the status code in the error message', async () => {
    mockError(503)
    await expect(fetchMetalSpotPrice('XAU')).rejects.toThrow('503')
  })

  it('throws GoldApiError when price field is missing', async () => {
    mockOk({ symbol: 'XAU', currency: 'USD' })
    await expect(fetchMetalSpotPrice('XAU')).rejects.toThrow(GoldApiError)
  })

  it('throws GoldApiError when price is not a number', async () => {
    mockOk({ price: '4314.0', symbol: 'XAU' })
    await expect(fetchMetalSpotPrice('XAU')).rejects.toThrow(GoldApiError)
  })
})
