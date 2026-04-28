import type { StockStatus, OrderStatus, SortOption } from '@/types'

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  'in-stock':     'متوفر',
  'low-stock':    'كمية محدودة',
  'out-of-stock': 'نفذ المخزون',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed:    'تم الطلب',
  confirmed: 'مؤكد',
  preparing: 'قيد التجهيز',
  ready:     'جاهز للاستلام',
  delivered: 'تم التسليم',
  cancelled: 'ملغى',
}

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'featured',   label: 'مميز' },
  { value: 'newest',     label: 'الأحدث' },
  { value: 'price-asc',  label: 'السعر: من الأقل' },
  { value: 'price-desc', label: 'السعر: من الأعلى' },
  { value: 'rating',     label: 'الأعلى تقييمًا' },
]

export const PRODUCT_TYPES = ['EDP', 'EDT', 'Parfum', 'EDC'] as const

export const PRODUCT_CATEGORIES = ['نساء', 'رجال', 'يونيسكس'] as const

export const PRICE_RANGE = { min: 0, max: 600, step: 10 } as const

export const CURRENCY = 'د.ل' as const

export const TOAST_DURATION = 2400 as const

export const MOCK_DELAY = 300 as const
