import type {
  Brand, Product, Category, Order,
  HomePageData, SearchFilters, CheckoutPayload,
  User, Address, RegisterPayload, CartItem,
} from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

function authHeaders(): HeadersInit {
  const token = getToken()
  return {
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export type CouponValidation =
  | { valid: true; type: 'percentage' | 'fixed'; value: string; discountAmount: string; finalTotal: string }
  | { valid: false; error: string }

export async function validateCoupon(code: string, orderTotal: number): Promise<CouponValidation> {
  const res = await fetch(`${API_URL}/api/coupons/validate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body:    JSON.stringify({ code, order_total: orderTotal }),
  })
  if (!res.ok) throw new Error('Failed to validate coupon')
  return res.json()
}

// ── Home ──────────────────────────────────────────────────────────────
export async function getHomePageData(): Promise<HomePageData> {
  const res = await fetch(`${API_URL}/api/home`)
  if (!res.ok) throw new Error('Failed to fetch home data')
  return res.json()
}

// ── Brands / Categories ───────────────────────────────────────────────
export async function getBrands(): Promise<Brand[]> {
  const res = await fetch(`${API_URL}/api/brands`)
  if (!res.ok) throw new Error('Failed to fetch brands')
  const json = await res.json()
  return json.data || json
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`)
  if (!res.ok) throw new Error('Failed to fetch categories')
  const json = await res.json()
  return json.data || json
}

// ── Products ──────────────────────────────────────────────────────────
export async function searchProducts(filters: SearchFilters): Promise<{ data: Product[]; meta: import('@/types').PageMeta }> {
  const params = new URLSearchParams()
  if (filters.query)    params.append('query',     filters.query)
  if (filters.category) params.append('category',  filters.category)
  if (filters.brand)    params.append('brand',     filters.brand)
  if (filters.type)     params.append('type',      filters.type)
  if (filters.special)  params.append('special',   filters.special)
  if (filters.minPrice) params.append('min_price', String(filters.minPrice))
  if (filters.maxPrice) params.append('max_price', String(filters.maxPrice))
  if (filters.sort)     params.append('sort',      filters.sort)
  if (filters.page && filters.page > 1) params.append('page', String(filters.page))

  const res = await fetch(`${API_URL}/api/products?${params}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('Failed to fetch products')
  const json = await res.json()
  return {
    data: json.data ?? [],
    meta: {
      total:       json.meta?.total       ?? json.data?.length ?? 0,
      currentPage: json.meta?.current_page ?? 1,
      lastPage:    json.meta?.last_page    ?? 1,
    },
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const res = await fetch(`${API_URL}/api/products/${slug}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to fetch product')
  const json = await res.json()
  return json.data || json
}

export async function getSimilarProducts(productId: number): Promise<Product[]> {
  const res = await fetch(`${API_URL}/api/products/${productId}/similar`)
  if (!res.ok) throw new Error('Failed to fetch similar products')
  const json = await res.json()
  return json.data || json
}

export async function getWishlist(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/api/wishlist`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to fetch wishlist')
  const json = await res.json()
  return json.data || json
}

// ── Orders ────────────────────────────────────────────────────────────
export async function getOrders(): Promise<Order[]> {
  const res = await fetch(`${API_URL}/api/orders`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to fetch orders')
  const json = await res.json()
  return json.data || json
}

export async function getOrderById(id: string): Promise<Order | null> {
  const res = await fetch(`${API_URL}/api/orders/${id}`, { headers: authHeaders() })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to fetch order')
  const json = await res.json()
  return json.data || json
}

export async function createOrder(payload: CheckoutPayload): Promise<Order> {
  const res = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      items:       payload.items.map(i => ({
        product_variant_id: i.variantId,
        quantity:           i.quantity,
      })),
      note:        payload.note ?? null,
      is_pickup:   payload.pickup,
      address_id:  payload.pickup ? null : (payload.addressId ?? null),
      total:       payload.total,
      coupon_code: payload.couponCode ?? null,
    }),
  })
  if (!res.ok) throw new Error('Failed to create order')
  const json = await res.json()
  return json.data || json
}

export async function cancelOrder(id: string): Promise<Order> {
  const res = await fetch(`${API_URL}/api/orders/${id}/cancel`, {
    method: 'PATCH',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to cancel order')
  const json = await res.json()
  return json.data || json
}

// ── Auth ──────────────────────────────────────────────────────────────
export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error('Invalid email or password')
  return res.json()
}

export async function register(payload: RegisterPayload): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Registration failed')
  }
  return res.json()
}

export async function updateProfile(userId: string, updates: Partial<User>): Promise<User> {
  const res = await fetch(`${API_URL}/api/user`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update profile')
  const json = await res.json()
  return json.data || json
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/user/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: newPassword,
    }),
  })
  if (!res.ok) throw new Error('Failed to change password')
}

// ── Addresses ─────────────────────────────────────────────────────────
export async function getAddresses(): Promise<Address[]> {
  const res = await fetch(`${API_URL}/api/addresses`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to fetch addresses')
  const json = await res.json()
  return json.data || json
}

export async function addAddress(data: {
  label: string
  city: string
  description?: string
  isDefault?: boolean
}): Promise<Address> {
  const res = await fetch(`${API_URL}/api/addresses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      label:       data.label,
      city:        data.city,
      description: data.description ?? null,
      is_default:  data.isDefault ?? false,
    }),
  })
  if (!res.ok) throw new Error('Failed to add address')
  const json = await res.json()
  return json.data
}

export async function updateAddress(
  id: number,
  data: { label?: string; city?: string; description?: string; isDefault?: boolean }
): Promise<Address> {
  const res = await fetch(`${API_URL}/api/addresses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      label:       data.label,
      city:        data.city,
      description: data.description ?? null,
      is_default:  data.isDefault ?? false,
    }),
  })
  if (!res.ok) throw new Error('Failed to update address')
  const json = await res.json()
  return json.data
}

export async function deleteAddress(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/addresses/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to delete address')
}

// ── Cart ──────────────────────────────────────────────────────────────
export async function getCart(): Promise<CartItem[]> {
  const res = await fetch(`${API_URL}/api/cart`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to fetch cart')
  const json = await res.json()
  return json.data ?? []
}

export async function addToCart(data: {
  variantId: number
  quantity: number
}): Promise<CartItem> {
  const res = await fetch(`${API_URL}/api/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      product_variant_id: data.variantId,
      quantity:           data.quantity,
    }),
  })
  if (!res.ok) throw new Error('Failed to add to cart')
  const json = await res.json()
  return json.data
}

export async function updateCartItem(id: number, quantity: number): Promise<CartItem> {
  const res = await fetch(`${API_URL}/api/cart/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ quantity }),
  })
  if (!res.ok) throw new Error('Failed to update cart item')
  const json = await res.json()
  return json.data
}

export async function removeFromCart(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/cart/${id}`, {
    method:  'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to remove from cart')
}

// ── Wishlist ──────────────────────────────────────────────────────────
export async function addToWishlist(productId: number): Promise<Product> {
  const res = await fetch(`${API_URL}/api/wishlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ product_id: productId }),
  })
  if (!res.ok) throw new Error('Failed to add to wishlist')
  const json = await res.json()
  return json.data || json
}

export async function removeFromWishlist(productId: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/wishlist/${productId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to remove from wishlist')
}
