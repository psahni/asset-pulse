export type AssetSymbol = 'BTC' | 'XAU' | 'XAG'

export interface PriceSnapshot {
  symbol:     AssetSymbol
  priceUsd:   number
  priceInr:   number
  recordedAt: Date
}

export interface AssetCardData {
  symbol:     AssetSymbol
  priceUsd:   number
  priceInr:   number
  change24h:  number | null  // null = not enough history yet
  change7d:   number | null
  change30d:  number | null
  sparkline:  number[]       // up to 30 daily USD prices, oldest → newest
  recordedAt: Date
}

export interface AssetMeta {
  name:       string
  pair:       string
  badgeText:  string
  badgeColor: string         // Tailwind bg class
}

export const ASSET_META: Record<AssetSymbol, AssetMeta> = {
  BTC: { name: 'Bitcoin', pair: 'BTC · USD', badgeText: 'B',  badgeColor: 'bg-orange-100' },
  XAU: { name: 'Gold',    pair: 'XAU · oz',  badgeText: 'Au', badgeColor: 'bg-amber-100'  },
  XAG: { name: 'Silver',  pair: 'XAG · oz',  badgeText: 'Ag', badgeColor: 'bg-cyan-100'   },
}
