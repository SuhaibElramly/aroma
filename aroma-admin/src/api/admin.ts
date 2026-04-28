import { client } from './client'
import type {
  AdminUser, DashboardStats, AdminOrder, AdminProduct,
  AdminBrand, AdminCategory, AdminUserRow, PageMeta, ProductVariant, ProductImage,
  AdminCartItem, AdminWishlistProduct,
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
  type?:        string
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

// ── Variants ──────────────────────────────────────────────────────────
export const apiGetVariants = (productId: number) =>
  client.get<ProductVariant[]>(`/admin/products/${productId}/variants`)

export const apiCreateVariant = (productId: number, data: Record<string, unknown>) =>
  client.post<ProductVariant>(`/admin/products/${productId}/variants`, data)

export const apiUpdateVariant = (productId: number, variantId: number, data: Record<string, unknown>) =>
  client.put<ProductVariant>(`/admin/products/${productId}/variants/${variantId}`, data)

export const apiDeleteVariant = (productId: number, variantId: number) =>
  client.delete(`/admin/products/${productId}/variants/${variantId}`)

export const apiSetDefaultVariant = (productId: number, variantId: number) =>
  client.patch<ProductVariant>(`/admin/products/${productId}/variants/${variantId}/default`)

// ── Brands ────────────────────────────────────────────────────────────
export const apiGetBrands = () =>
  client.get<AdminBrand[]>('/admin/brands')

export const apiCreateBrand = (data: Record<string, unknown>) =>
  client.post<{ id: string }>('/admin/brands', data)

export const apiUpdateBrand = (id: string, data: Record<string, unknown>) =>
  client.put<{ id: string }>(`/admin/brands/${id}`, data)

export const apiDeleteBrand = (id: string) =>
  client.delete(`/admin/brands/${id}`)

// ── Categories ────────────────────────────────────────────────────────
export const apiGetCategories = () =>
  client.get<AdminCategory[]>('/admin/categories')

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
  return client.post<ProductImage[]>(`/admin/products/${productId}/images`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const apiSetThumbnail = (productId: number, imageId: number) =>
  client.patch<ProductImage>(`/admin/products/${productId}/images/${imageId}/thumbnail`)

export const apiDeleteImage = (productId: number, imageId: number) =>
  client.delete(`/admin/products/${productId}/images/${imageId}`)

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

export const apiGetUserCart = (userId: number) =>
  client.get<AdminCartItem[]>(`/admin/users/${userId}/cart`)

export const apiGetUserWishlist = (userId: number) =>
  client.get<AdminWishlistProduct[]>(`/admin/users/${userId}/wishlist`)
