import { client } from './client'
import type {
  AdminUser, DashboardStats, AdminOrder, AdminProduct,
  AdminBrand, AdminCategory, AdminUserRow, PageMeta, ProductVariant, ProductImage,
  AdminCartItem, AdminWishlistProduct, ProductType, AdminCoupon, CouponOrder,
  SpecType, ProductSpec, AdminUserOrder, AdminMember,
} from '../types'

// ── Auth ──────────────────────────────────────────────────────────────
export const apiLogin = (email: string, password: string) =>
  client.post<{ user: AdminUser; token: string }>('/auth/login', { email, password })

// ── Dashboard ─────────────────────────────────────────────────────────
export const apiGetStats = () =>
  client.get<DashboardStats>('/admin/stats')

// ── Orders ────────────────────────────────────────────────────────────
export const apiGetOrders = (params: {
  status?:    string
  order_id?:  string
  phone?:     string
  date_from?: string
  date_to?:   string
  page?:      number
}) =>
  client.get<{ data: AdminOrder[]; meta: PageMeta }>('/admin/orders', { params })

export const apiGetOrder = (id: string) =>
  client.get<AdminOrder>(`/admin/orders/${id}`)

export const apiUpdateOrderStatus = (id: string, status: string) =>
  client.patch<AdminOrder>(`/admin/orders/${id}/status`, { status })

export const apiAddAdminNote = (id: string, admin_note: string) =>
  client.patch<{ admin_note: string }>(`/admin/orders/${id}/note`, { admin_note })

// ── Products ──────────────────────────────────────────────────────────
export const apiGetProducts = (params: {
  search?:      string
  brand_id?:    string
  category_id?: string
  type?:        ProductType
  price_min?:   number
  price_max?:   number
  page?:        number
}) =>
  client.get<{ data: AdminProduct[]; meta: PageMeta }>('/admin/products', { params })

export const apiCreateProduct = (data: Record<string, unknown>) =>
  client.post<{ id: number }>('/admin/products', data)

export const apiUpdateProduct = (id: number, data: Record<string, unknown>) =>
  client.put<{ id: number }>(`/admin/products/${id}`, data)

export const apiDeleteProduct = (id: number) =>
  client.delete(`/admin/products/${id}`)

export const apiGetProduct = (id: number) =>
  client.get<AdminProduct>(`/admin/products/${id}`)

// ── Variants ──────────────────────────────────────────────────────────
export const apiGetVariants = (productId: number) =>
  client.get<ProductVariant[]>(`/admin/products/${productId}/variants`)


export const apiSetDefaultVariant = (productId: number, variantId: number) =>
  client.patch<ProductVariant>(`/admin/products/${productId}/variants/${variantId}/default`)

export const apiBulkUpdateVariants = (
  productId: number,
  variants: Array<{
    id:                  number
    price:               number
    cost_price:          number | null
    original_price:      number | null
    quantity:            number
    low_stock_threshold: number
  }>
) =>
  client.put<ProductVariant[]>(`/admin/products/${productId}/variants/bulk`, { variants })

// ── Brands ────────────────────────────────────────────────────────────
export const apiGetBrands = (params?: {
  name?:         string
  origin?:       string
  tagline?:      string
  min_products?: number
  max_products?: number
}) =>
  client.get<AdminBrand[]>('/admin/brands', { params })

export const apiGetBrand = (id: string) =>
  client.get<AdminBrand>(`/admin/brands/${id}`)

export const apiCreateBrand = (data: Record<string, unknown>) =>
  client.post<{ id: string }>('/admin/brands', data)

export const apiUpdateBrand = (id: string, data: Record<string, unknown>) =>
  client.put<{ id: string }>(`/admin/brands/${id}`, data)

export const apiDeleteBrand = (id: string) =>
  client.delete(`/admin/brands/${id}`)

export const apiUploadBrandLogo = (id: string, file: File) => {
  const form = new FormData()
  form.append('logo', file)
  return client.post<{ logoUrl: string }>(`/admin/brands/${id}/logo`, form)
}

export const apiDeleteBrandLogo = (id: string) =>
  client.delete(`/admin/brands/${id}/logo`)

// ── Categories ────────────────────────────────────────────────────────
export const apiGetCategories = (params?: {
  label?: string
  min_products?: number
  max_products?: number
}) =>
  client.get<AdminCategory[]>('/admin/categories', { params })

export const apiCreateCategory = (data: Record<string, unknown>) =>
  client.post<{ id: string }>('/admin/categories', data)

export const apiUpdateCategory = (id: string, data: Record<string, unknown>) =>
  client.put<{ id: string }>(`/admin/categories/${id}`, data)

export const apiDeleteCategory = (id: string) =>
  client.delete(`/admin/categories/${id}`)

// ── Product Images ────────────────────────────────────────────────────
export const apiGetImages = (productId: number) =>
  client.get<ProductImage[]>(`/admin/products/${productId}/images`)

export const apiUploadImages = (productId: number, files: File[]) => {
  const form = new FormData()
  files.forEach(f => form.append('images[]', f))
  return client.post<ProductImage[]>(`/admin/products/${productId}/images`, form)
}

export const apiSetThumbnail = (productId: number, imageId: number) =>
  client.patch<ProductImage>(`/admin/products/${productId}/images/${imageId}/thumbnail`)

export const apiDeleteImage = (productId: number, imageId: number) =>
  client.delete(`/admin/products/${productId}/images/${imageId}`)

// ── Variant Images ────────────────────────────────────────────────────
export const apiGetVariantImages = (productId: number, variantId: number) =>
  client.get<ProductImage[]>(`/admin/products/${productId}/variants/${variantId}/images`)

export const apiUploadVariantImages = (productId: number, variantId: number, files: File[]) => {
  const form = new FormData()
  files.forEach(f => form.append('images[]', f))
  return client.post<ProductImage[]>(`/admin/products/${productId}/variants/${variantId}/images`, form)
}

export const apiDeleteVariantImage = (productId: number, variantId: number, imageId: number) =>
  client.delete(`/admin/products/${productId}/variants/${variantId}/images/${imageId}`)

// ── Users ─────────────────────────────────────────────────────────────
export const apiGetUser = (userId: number) =>
  client.get<AdminUserRow>(`/admin/users/${userId}`)

export const apiGetUsers = (params: {
  search?:       string
  phone?:        string
  joined_from?:  string
  joined_to?:    string
  min_orders?:   number
  max_orders?:   number
  page?:         number
}) =>
  client.get<{ data: AdminUserRow[]; meta: PageMeta }>('/admin/users', { params })

export const apiGetUserOrders = (userId: number) =>
  client.get<AdminUserOrder[]>(`/admin/users/${userId}/orders`)

export const apiGetUserCart = (userId: number) =>
  client.get<AdminCartItem[]>(`/admin/users/${userId}/cart`)

export const apiGetUserWishlist = (userId: number) =>
  client.get<AdminWishlistProduct[]>(`/admin/users/${userId}/wishlist`)

// ── Coupons ───────────────────────────────────────────────────────────
export const apiGetCoupons = (params?: { search?: string }) =>
  client.get<AdminCoupon[]>('/admin/coupons', { params })

export const apiCreateCoupon = (data: {
  code: string
  type: 'percentage' | 'fixed'
  value: number
  min_order_amount?: number | null
  max_uses?: number | null
  expires_at?: string | null
  is_active?: boolean
}) =>
  client.post<AdminCoupon>('/admin/coupons', data)

export const apiUpdateCoupon = (id: number, data: Partial<{
  code: string
  type: 'percentage' | 'fixed'
  value: number
  min_order_amount: number | null
  max_uses: number | null
  expires_at: string | null
  is_active: boolean
}>) =>
  client.put<AdminCoupon>(`/admin/coupons/${id}`, data)

export const apiDeleteCoupon = (id: number) =>
  client.delete(`/admin/coupons/${id}`)

export const apiToggleCoupon = (id: number) =>
  client.patch<AdminCoupon>(`/admin/coupons/${id}/toggle`)

export const apiGetCouponOrders = (id: number) =>
  client.get<CouponOrder[]>(`/admin/coupons/${id}/orders`)

// ── Spec Types ────────────────────────────────────────────────────────
export const apiGetSpecTypes = () =>
  client.get<SpecType[]>('/admin/spec-types')

export const apiCreateSpecType = (data: { name: string; unit?: string | null }) =>
  client.post<SpecType>('/admin/spec-types', data)

export const apiUpdateSpecType = (id: number, data: { name?: string; unit?: string | null }) =>
  client.put<SpecType>(`/admin/spec-types/${id}`, data)

export const apiDeleteSpecType = (id: number) =>
  client.delete(`/admin/spec-types/${id}`)

// ── Product Specs ─────────────────────────────────────────────────────
export const apiGetProductSpecs = (productId: number) =>
  client.get<{ specs: ProductSpec[] }>(`/admin/products/${productId}/specs`)

export const apiSaveProductSpecs = (productId: number, specs: Array<{
  spec_type_id: number
  values: string[]
}>) =>
  client.put(`/admin/products/${productId}/specs`, { specs })

export const apiGenerateVariants = (productId: number, force = false) =>
  client.post<ProductVariant[]>(
    `/admin/products/${productId}/variants/generate${force ? '?force=true' : ''}`
  )

// ── Admin Team Management ─────────────────────────────────────────────
export const apiGetAdmins = () =>
  client.get<AdminMember[]>('/admin/admins')

export const apiCreateAdmin = (data: {
  name:     string
  phone:    string
  role:     string
  password: string
}) =>
  client.post<AdminMember>('/admin/admins', data)

export const apiToggleAdminStatus = (id: number) =>
  client.patch<AdminMember>(`/admin/admins/${id}/toggle-status`)

export const apiResetAdminPassword = (id: number, password: string) =>
  client.patch<{ message: string }>(`/admin/admins/${id}/reset-password`, { password })
