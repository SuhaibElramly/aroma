// aroma-admin/src/types/index.ts

export type OrderStatus =
  | 'placed' | 'confirmed' | 'preparing'
  | 'ready'  | 'delivered' | 'cancelled'

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export type ProductType = 'EDP' | 'EDT' | 'Parfum' | 'EDC'

// ── Pagination ────────────────────────────────────────────────────────
export interface PageMeta {
  total: number
  currentPage: number
  lastPage: number
}

// ── Auth ──────────────────────────────────────────────────────────────
export interface AdminUser {
  id: number
  name: string
  email: string
  is_admin: boolean
}

// ── Dashboard ─────────────────────────────────────────────────────────
export interface DashboardStats {
  totalOrders:   number
  totalRevenue:  string
  totalProducts: number
  totalUsers:    number

  // period-over-period % change vs last month; null = no prior data
  revenueChange: number | null
  ordersChange:  number | null
  usersChange:   number | null

  // chart data — 12 months rolling
  monthlyOrderCounts:    number[]
  monthlyOrderLabels:    string[]
  monthlyRevenueAmounts: number[]
  monthlyRevenueLabels:  string[]

  // weekly channel breakdown (Mon–Sun, last 28 days)
  weeklyOnline: number[]
  weeklyLabels: string[]

  recentOrders: RecentOrderRow[]
}

export interface RecentOrderRow {
  id: string
  user: string
  total: string
  status: OrderStatus
  date: string
}

// ── Orders ────────────────────────────────────────────────────────────
export interface AdminOrder {
  id: string
  user: string
  userEmail: string
  total: string
  status: OrderStatus
  isPickup: boolean
  note: string
  adminNote: string | null
  date: string
  itemCount: number
  items?: AdminOrderItem[]
  timeline?: AdminTimelineEntry[]
  couponCode?: string | null
  discountAmount?: number | null
}

export interface AdminOrderItem {
  name: string
  brand: string
  size: string
  qty: number
  unitPrice: string
}

export interface AdminTimelineEntry {
  status: string
  done: boolean
  date: string | null
}

// ── Products ──────────────────────────────────────────────────────────
export interface AdminProduct {
  id:           number
  slug:         string
  name:         string
  nameEn:       string | null
  brand:        string
  brandId:      string
  category:     string
  categoryId:   string
  type:         ProductType
  isNew:        boolean
  isBestseller: boolean
  isOffer:      boolean
  variantCount:   number
  price:          string | null
  thumbnailUrl:   string | null
  placeholderBg:  string
  placeholderDot: string
}

export interface ProductVariant {
  id:                 number
  productId:          number
  size:               string
  price:              string
  originalPrice:      string | null
  quantity:           number
  lowStockThreshold:  number
  stock:              StockStatus
  isDefault:          boolean
}

export interface ProductImage {
  id:           number
  url:          string
  originalName: string | null
  isThumbnail:  boolean
  sortOrder:    number
}

// ── Brands ────────────────────────────────────────────────────────────
export interface AdminBrand {
  id: string
  name: string
  nameEn: string | null
  origin: string | null
  tagline: string | null
  bg: string
  logoUrl: string | null
  productCount: number
}

// ── Categories ────────────────────────────────────────────────────────
export interface AdminCategory {
  id: number
  slug: string
  label: string
  bg: string
  productCount: number
}

// ── Users ─────────────────────────────────────────────────────────────
export interface AdminUserOrder {
  id: string
  total: string
  status: OrderStatus
  isPickup: boolean
  itemCount: number
  date: string
}

export interface AdminUserRow {
  id: number
  name: string
  email: string
  phone: string
  orderCount: number
  joinedAt: string
}

export interface AdminCartItem {
  product: {
    id: number
    name: string
    brand: string
    price: string
    selectedSize: string
    thumbnailUrl: string | null
  }
  quantity: number
}

export interface AdminWishlistProduct {
  id: number
  name: string
  brand: string
  price: string
  selectedSize: string
  stock: string
  thumbnailUrl: string | null
}

// ── Coupons ───────────────────────────────────────────────────────────
export interface AdminCoupon {
  id: number
  code: string
  type: 'percentage' | 'fixed'
  value: number
  minOrderAmount: number | null
  maxUses: number | null
  usesCount: number
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}
