import { describe, it, expect } from 'vitest'
import { changePct } from '../calculations'

describe('changePct', () => {
  it('returns positive percentage for a price increase', () => {
    expect(changePct(110, 100)).toBe(10)
  })

  it('returns negative percentage for a price decrease', () => {
    expect(changePct(90, 100)).toBe(-10)
  })

  it('returns null when baseline is null', () => {
    expect(changePct(100, null)).toBeNull()
  })

  it('returns null when baseline is zero', () => {
    expect(changePct(100, 0)).toBeNull()
  })

  it('rounds result to 2 decimal places', () => {
    expect(changePct(102.35, 100)).toBe(2.35)
  })

  it('returns 0 when current equals baseline', () => {
    expect(changePct(100, 100)).toBe(0)
  })

  it('handles large values like BTC price correctly', () => {
    expect(changePct(96000, 93750)).toBe(2.4)
  })

  it('handles small values like Silver price correctly', () => {
    expect(changePct(30.24, 30)).toBe(0.8)
  })
})
