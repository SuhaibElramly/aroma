// ── Domain Types ─────────────────────────────────────────────────────

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock'

export interface StorefrontVariant {
  id: number
  label: string
  price: number
  originalPrice: number | null
  stock: StockStatus
  isDefault: boolean
  images?: { id: number; url: string }[]
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled'

export type ProductType = 'EDP' | 'EDT' | 'Parfum' | 'EDC'

export type ProductCategory = string

export type SortOption =
  | 'featured'
  | 'newest'
  | 'price-asc'
  | 'price-desc'
  | 'rating'

export type PickupOption = 'pickup' | 'delivery'

// ── Entities ──────────────────────────────────────────────────────────

export interface Brand {
  id: string
  name: string
  nameEn: string
  origin: string
  tagline: string
  count: number
  bg?: string
  logoUrl?: string | null
}

export interface ProductNotes {
  top: string[]
  heart: string[]
  base: string[]
}

export interface ProductPlaceholderStyle {
  bg: string
  dot: string
}

export interface ProductImage {
  id: number
  url: string
  isThumbnail: boolean
}

export interface Product {
  id: number
  slug: string
  name: string
  nameEn: string
  brand: string
  brandId: string
  brandLogoUrl?: string | null
  price: number
  originalPrice: number | null
  selectedVariant: string
  type: ProductType
  category: ProductCategory
  notes: ProductNotes
  tags: string[]
  description: string
  stock: StockStatus
  rating: number
  reviews: number
  new: boolean
  bestseller: boolean
  offer: boolean
  placeholder?: ProductPlaceholderStyle
  thumbnailUrl?: string | null
  images?: ProductImage[]
  variants?: StorefrontVariant[]
}

export interface Category {
  id: string
  label: string
  count: number
  bg: string
}

export interface Banner {
  id: string
  title: string
  subtitle: string
  cta: string
  href: string
  bg: string
}

// ── Order ─────────────────────────────────────────────────────────────

export interface OrderItem {
  name: string
  brand: string
  label: string
  qty: number
  price: number
}

export interface OrderStatusHistory {
  status: string
  date: string | null
  time: string | null
  done: boolean
}

export interface Order {
  id: string
  date: string
  status: OrderStatus
  items: OrderItem[]
  total: number
  timeline: OrderStatusHistory[]
  note: string
  adminNote: string
  placeholder: ProductPlaceholderStyle
  isPickup?: boolean
  deliveryAddress?: {
    city: string
    description?: string
  } | null
  couponCode?: string | null
  discountAmount?: number | null
}

// ── Cart ──────────────────────────────────────────────────────────────

export type CartProduct = Product

export interface CartItem {
  id: number           // cart_items.id — used for PATCH/DELETE
  variantId: number    // product_variant_id — used for order payload
  product: CartProduct
  quantity: number
}

// ── User ──────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  phone?: string
}

// ── Address ───────────────────────────────────────────────────────────

export interface Address {
  id: number
  label: string
  city: string
  description?: string
  isDefault: boolean
}

// ── Auth ──────────────────────────────────────────────────────────────

export interface AuthCredentials {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
}

// ── Checkout ──────────────────────────────────────────────────────────

export interface CheckoutPayload {
  addressId?: number
  note?: string
  pickup: boolean
  items: CartItem[]
  total: number
  couponCode?: string
}

// ── Filters ───────────────────────────────────────────────────────────

export interface SearchFilters {
  query?: string
  category?: string | null
  brand?: string | null
  type?: string | null
  special?: string | null
  minPrice?: number
  maxPrice?: number
  sort?: SortOption
  page?: number
}

export interface PageMeta {
  total: number
  currentPage: number
  lastPage: number
}

// ── API Responses ─────────────────────────────────────────────────────

export interface HeroConfig {
  headline: string
  subtext: string
  cta_primary_label: string
  cta_primary_url: string
  cta_secondary_label: string
  cta_secondary_url: string
  bg_image_url: string | null
}

export interface HomeBlock {
  id: number
  type: 'bestsellers' | 'new_arrivals' | 'offers' | 'categories' | 'featured_brand' | 'curated'
  config: {
    label?: string
    title?: string
    limit?: number
    product_limit?: number
    brand_id?: string
    product_ids?: number[]
  }
  data: {
    products?: Product[]
    categories?: Category[]
    brand?: Brand
  }
}

export interface HomePageData {
  hero: HeroConfig
  blocks: HomeBlock[]
  logo_url?: string | null
}
