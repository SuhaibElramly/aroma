// aroma-admin/src/types/index.ts

export type OrderStatus =
  | 'placed' | 'confirmed' | 'preparing'
  | 'ready'  | 'delivered' | 'cancelled'

export type PaymentStatus = 'not_paid' | 'partially_paid' | 'paid'

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export type ProductType = 'EDP' | 'EDT' | 'Parfum' | 'EDC'

// ── Pagination ────────────────────────────────────────────────────────
export interface PageMeta {
  total: number
  currentPage: number
  lastPage: number
}

// ── Notifications ─────────────────────────────────────────────────────
export type NotifKind = 'order' | 'stock'

export interface AdminNotification {
  id:    number
  kind:  NotifKind
  title: string
  sub:   string
  time:  string
  read:  boolean
  data:  Record<string, unknown> | null
}

// ── Auth ──────────────────────────────────────────────────────────────
export interface AdminUser {
  id: number
  name: string
  email: string
  is_admin: boolean
  role: string | null
}

export interface AdminMember {
  id:          number
  name:        string
  phone:       string
  email:       string
  role:        string
  adminStatus: 'active' | 'suspended'
  createdAt:   string
}

export interface AdminRole {
  id:          number
  name:        string
  slug:        string
  color:       string
  permissions: Record<string, number[]>
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

  // Profit stats (from delivered orders)
  grossProfit:       number
  avgMargin:         number
  cogs:              number
  categoryBreakdown: Array<{
    category: string
    revenue:  number
    cogs:     number
    profit:   number
    margin:   number
  }>
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
  paymentStatus: PaymentStatus | null
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

export interface OrderPayment {
  id: number
  amount: number
  note: string | null
  createdAt: string
}

export interface OrderPaymentsResponse {
  paymentStatus: PaymentStatus
  total: number
  paid: number
  payments: OrderPayment[]
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
  description?:   string
  variantCount:   number
  price:          string | null
  thumbnailUrl:   string | null
  placeholderBg:  string
  placeholderDot: string
}

export interface VariantSpec {
  name: string
  unit: string | null
  value: string
}

export interface ProductVariant {
  id:                 number
  productId:          number
  price:              string
  costPrice:          string | null
  originalPrice:      string | null
  quantity:           number
  lowStockThreshold:  number
  stock:              StockStatus
  isDefault:          boolean
  specs:              VariantSpec[]
  images?:            ProductImage[]
}

export interface ProductImage {
  id:           number
  url:          string
  originalName: string | null
  isThumbnail:  boolean
  sortOrder:    number
}

export interface SpecType {
  id:           number
  name:         string
  unit:         string | null
  productCount: number
}

export interface ProductSpecValue {
  id:         number
  value:      string
  sort_order: number
}

export interface ProductSpec {
  spec_type_id: number
  name:         string
  unit:         string | null
  sort_order:   number
  values:       ProductSpecValue[]
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

export interface CouponOrder {
  id: string
  user: string
  userEmail: string
  date: string
  total: number
  discountAmount: number | null
  status: string
}

export interface ProductDiscount {
  id: number
  product_id: number
  name: string
  type: 'percentage' | 'fixed'
  value: string
  scope: 'all' | 'specific'
  variant_ids: number[] | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  created_at: string
}

// ── Homepage ──────────────────────────────────────────────────────────
export type HomepageBlockType =
  | 'bestsellers'
  | 'new_arrivals'
  | 'offers'
  | 'categories'
  | 'featured_brand'
  | 'curated'

export interface HeroConfig {
  headline: string
  subtext: string
  cta_primary_label: string
  cta_primary_url: string
  cta_secondary_label: string
  cta_secondary_url: string
  bg_image_path: string | null
}

export interface HomepageBlock {
  id: number
  type: HomepageBlockType
  position: number
  enabled: boolean
  config: {
    label?: string
    title?: string
    limit?: number
    product_limit?: number
    brand_id?: string
    product_ids?: number[]
  }
}

export interface HomepageConfig {
  hero: HeroConfig
  blocks: HomepageBlock[]
}

export interface NewBlockPayload {
  type: HomepageBlockType
  config: HomepageBlock['config']
  enabled: boolean
}

export interface ReorderItem {
  id: number
  position: number
}
