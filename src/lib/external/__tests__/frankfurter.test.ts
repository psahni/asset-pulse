import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchUsdToInr, FrankfurterError } from '../frankfurter'

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

describe('fetchUsdToInr', () => {
  it('returns the INR rate from a valid response', async () => {
    mockOk({ amount: 1.0, base: 'USD', date: '2026-06-12', rates: { INR: 95.12 } })
    const result = await fetchUsdToInr()
    expect(result).toBe(95.12)
  })

  it('calls the correct Frankfurter endpoint', async () => {
    mockOk({ rates: { INR: 95.12 } })
    await fetchUsdToInr()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.frankfurter.app/latest?from=USD&to=INR'
    )
  })

  it('throws FrankfurterError on a non-ok HTTP response', async () => {
    mockError(503)
    await expect(fetchUsdToInr()).rejects.toThrow(FrankfurterError)
  })

  it('includes the status code in the error message', async () => {
    mockError(503)
    await expect(fetchUsdToInr()).rejects.toThrow('503')
  })

  it('throws FrankfurterError when rates key is missing', async () => {
    mockOk({ amount: 1.0, base: 'USD', date: '2026-06-12' })
    await expect(fetchUsdToInr()).rejects.toThrow(FrankfurterError)
  })

  it('throws FrankfurterError when INR is missing from rates', async () => {
    mockOk({ rates: { EUR: 0.92 } })
    await expect(fetchUsdToInr()).rejects.toThrow(FrankfurterError)
  })

  it('throws FrankfurterError when INR is not a number', async () => {
    mockOk({ rates: { INR: '95.12' } })
    await expect(fetchUsdToInr()).rejects.toThrow(FrankfurterError)
  })
})
