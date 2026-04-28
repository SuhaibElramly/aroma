// ── Domain Types ─────────────────────────────────────────────────────

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock'

export interface StorefrontVariant {
  id: number
  size: string
  price: number
  originalPrice: number | null
  stock: StockStatus
  isDefault: boolean
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
  price: number
  originalPrice: number | null
  sizes: string[]
  selectedSize: string
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
  placeholder: ProductPlaceholderStyle
  thumbnailUrl: string | null
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
  size: string
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
}

// ── Cart ──────────────────────────────────────────────────────────────

export interface CartProduct extends Product {
  selectedSize: string
}

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

export interface HomePageData {
  featuredBrand: Brand
  featuredBrandProducts: Product[]
  bestsellers: Product[]
  newArrivals: Product[]
  offers: Product[]
  categories: Category[]
  brands: Brand[]
}
