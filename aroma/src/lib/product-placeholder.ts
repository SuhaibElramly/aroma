import type { ProductPlaceholderStyle } from '@/types'

const PALETTE: ProductPlaceholderStyle[] = [
  { bg: '#D8E0E8', dot: '#5070A0' },
  { bg: '#F2E8E5', dot: '#C9A0A0' },
  { bg: '#E0E8F0', dot: '#6080A8' },
  { bg: '#E8DDD0', dot: '#9A7050' },
  { bg: '#2E2830', dot: '#B080C0' },
  { bg: '#EDE0C8', dot: '#B8906A' },
  { bg: '#EDE8F2', dot: '#8878B0' },
  { bg: '#F2E0EC', dot: '#C080A0' },
  { bg: '#DDE8EC', dot: '#507090' },
  { bg: '#E8ECF0', dot: '#809090' },
  { bg: '#EAE0D0', dot: '#A07850' },
  { bg: '#F0E8D0', dot: '#C0A050' },
]

/**
 * Returns a deterministic placeholder style for a product based on its ID.
 * Falls back gracefully when the API response doesn't include a placeholder field.
 */
export function getProductPlaceholder(product: { id: number }): ProductPlaceholderStyle {
  return PALETTE[product.id % PALETTE.length]
}
