import { CURRENCY } from '@/lib/constants'

export function formatPrice(amount: number): string {
  return `${amount.toLocaleString('ar-LY')} ${CURRENCY}`
}

export function formatPriceCompact(amount: number): string {
  return `${amount.toLocaleString('ar-LY')} ${CURRENCY}`
}

export function formatOrderId(id: string): string {
  return id
}

export function formatDate(dateString: string): string {
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return dateString
  return d.toLocaleDateString('ar-LY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function unslugify(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength).trimEnd() + '…'
}
