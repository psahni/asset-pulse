export function changePct(current: number, baseline: number | null): number | null {
  if (baseline === null || baseline === 0) return null
  return Math.round(((current - baseline) / baseline) * 10000) / 100
}
