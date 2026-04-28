import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { SearchFilters, CheckoutPayload, Address, CartItem } from '@/types'
import type { AddressValues } from '@/lib/schemas'
import * as services from '@/mocks/services'
import { useAuthStore } from '@/store/auth'

// ── Query Keys ────────────────────────────────────────────────────────
export const queryKeys = {
  home:       () => ['home'] as const,
  brands:     () => ['brands'] as const,
  categories: () => ['categories'] as const,
  products:   (filters: SearchFilters) => ['products', filters] as const,
  addresses:  () => ['addresses'] as const,
  product:    (slug: string) => ['product', slug] as const,
  similar:    (id: number) => ['similar', id] as const,
  orders:     () => ['orders'] as const,
  order:      (id: string) => ['order', id] as const,
  wishlist:   () => ['wishlist'] as const,
  cart:       () => ['cart'] as const,
}

// ── Hooks ─────────────────────────────────────────────────────────────

export function useHomeData() {
  return useQuery({
    queryKey: queryKeys.home(),
    queryFn:  services.getHomePageData,
    staleTime: 5 * 60 * 1000,
  })
}

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands(),
    queryFn:  services.getBrands,
    staleTime: 10 * 60 * 1000,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn:  services.getCategories,
    staleTime: 10 * 60 * 1000,
  })
}

export function useProducts(filters: SearchFilters) {
  return useQuery({
    queryKey: queryKeys.products(filters),
    queryFn:  () => services.searchProducts(filters),
    placeholderData: (prev) => prev,
  })
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: queryKeys.product(slug),
    queryFn:  () => services.getProductBySlug(slug),
    enabled:  !!slug,
  })
}

export function useSimilarProducts(productId: number) {
  return useQuery({
    queryKey: queryKeys.similar(productId),
    queryFn:  () => services.getSimilarProducts(productId),
    enabled:  !!productId,
  })
}

export function useWishlist(enabled = true) {
  return useQuery({
    queryKey: queryKeys.wishlist(),
    queryFn:  services.getWishlist,
    enabled,
    staleTime: 2 * 60 * 1000,
  })
}

export function useAddToWishlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (productId: number) => services.addToWishlist(productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.wishlist() }),
  })
}

export function useRemoveFromWishlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (productId: number) => services.removeFromWishlist(productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.wishlist() }),
  })
}

export function useOrders() {
  return useQuery({
    queryKey: queryKeys.orders(),
    queryFn:  services.getOrders,
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.order(id),
    queryFn:  () => services.getOrderById(id),
    enabled:  !!id,
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CheckoutPayload) => services.createOrder(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders() })
    },
  })
}

export function useCancelOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => services.cancelOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders() })
    },
  })
}

// ── Addresses ─────────────────────────────────────────────────────────

export function useAddresses(enabled = true) {
  return useQuery({
    queryKey: queryKeys.addresses(),
    queryFn:  services.getAddresses,
    enabled,
  })
}

export function useAddAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { label: string; city: string; description?: string; isDefault?: boolean }) =>
      services.addAddress(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.addresses() }),
  })
}

export function useUpdateAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { label?: string; city?: string; description?: string; isDefault?: boolean } }) =>
      services.updateAddress(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.addresses() }),
  })
}

export function useDeleteAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => services.deleteAddress(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.addresses() }),
  })
}

// ── Cart ──────────────────────────────────────────────────────────────

export function useCart() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: queryKeys.cart(),
    queryFn:  services.getCart,
    enabled:  !!user,
    staleTime: 1000 * 30,   // 30 seconds
  })
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { variantId: number; quantity: number }) => services.addToCart(data),
    onSettled:  () => queryClient.invalidateQueries({ queryKey: queryKeys.cart() }),
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) =>
      services.updateCartItem(id, quantity),
    onMutate: async ({ id, quantity }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart() })
      const prev = queryClient.getQueryData<CartItem[]>(queryKeys.cart()) ?? []
      queryClient.setQueryData<CartItem[]>(
        queryKeys.cart(),
        prev.map(i => (i.id === id ? { ...i, quantity } : i)),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKeys.cart(), ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart() }),
  })
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => services.removeFromCart(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart() })
      const prev = queryClient.getQueryData<CartItem[]>(queryKeys.cart()) ?? []
      queryClient.setQueryData<CartItem[]>(queryKeys.cart(), prev.filter(i => i.id !== id))
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKeys.cart(), ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart() }),
  })
}

// ── Auth mutations (no query caching — handled by Zustand store) ───────

export function useUpdateProfile() {
  const { updateUser } = useAuthStore()
  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Partial<import('@/types').User> }) =>
      services.updateProfile(userId, updates),
    onSuccess: (updated) => {
      updateUser(updated)
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({
      userId,
      currentPassword,
      newPassword,
    }: {
      userId: string
      currentPassword: string
      newPassword: string
    }) => services.changePassword(userId, currentPassword, newPassword),
  })
}
