# API Cart Persistence Design

**Date:** 2026-04-28
**Status:** Approved

---

## Goal

Replace the client-side Zustand/localStorage cart with the existing backend cart API so the cart persists across devices and is visible to admins. Unauthenticated users cannot use the cart — they are prompted to log in.

---

## Current State

| Layer | Current behaviour |
|---|---|
| Frontend store | `src/store/cart.ts` — Zustand + localStorage persistence |
| Backend cart API | Fully implemented: `GET/POST /api/cart`, `PATCH/DELETE /api/cart/{id}` |
| Admin cart view | `GET /api/admin/users/{id}/cart` — already works |
| Checkout | Reads from Zustand store, sends items directly to `POST /api/orders` |
| Guest cart | Allowed (localStorage) |

---

## Architecture

The Zustand cart store is deleted. The API is the single source of truth.

```
User action (Add / Update / Remove)
        │
        ▼
  Auth check (useAuthStore)
  ├── not logged in → toast "سجّل دخولك لإضافة المنتج" + redirect /auth/login
  └── logged in
        │
        ▼
  React Query mutation (optimistic update)
        │
        ├── UI updates instantly (optimistic)
        │
        ▼
  API call (POST / PATCH / DELETE /api/cart)
        │
        ├── success → invalidate ['cart'] query
        └── error   → roll back optimistic update, show toast
```

---

## Backend Changes

### 1. CartItemResource — expose `id` and `variantId`

`aroma-api/app/Http/Resources/CartItemResource.php`

Add two fields to `toArray()`:

```php
'id'        => $this->id,                   // cart row id — needed for PATCH/DELETE
'variantId' => $this->product_variant_id,   // needed to build order payload at checkout
```

No migration needed — both columns already exist on `cart_items`.

---

## Frontend Changes

### 2. Delete `src/store/cart.ts`

The file is removed entirely. All imports of it are replaced with the new hooks.

### 3. Update `src/types/index.ts` — `CartItem` type

```ts
export interface CartItem {
  id: number           // cart_items.id — used for PATCH/DELETE
  variantId: number    // product_variant_id — used for order payload
  product: CartProduct
  quantity: number
}
```

### 4. Add cart hooks to `src/lib/api/queries.ts`

```ts
// Fetch — only runs when user is authenticated
export function useCart() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['cart'],
    queryFn: () => getCart(),          // GET /api/cart
    enabled: !!user,
    staleTime: 1000 * 30,              // 30 seconds
  })
}

// Add item — optimistic
export function useAddToCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { variantId: number; quantity: number }) =>
      addToCart(data),                 // POST /api/cart
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] })
      const prev = queryClient.getQueryData(['cart'])
      // optimistic add handled by invalidation on settle
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['cart'], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })
}

// Update quantity — optimistic
export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) =>
      updateCartItem(id, quantity),    // PATCH /api/cart/{id}
    onMutate: async ({ id, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] })
      const prev = queryClient.getQueryData<CartItem[]>(['cart']) ?? []
      queryClient.setQueryData(['cart'],
        prev.map(i => i.id === id ? { ...i, quantity } : i)
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['cart'], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })
}

// Remove item — optimistic
export function useRemoveFromCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => removeFromCart(id),   // DELETE /api/cart/{id}
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] })
      const prev = queryClient.getQueryData<CartItem[]>(['cart']) ?? []
      queryClient.setQueryData(['cart'], prev.filter(i => i.id !== id))
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['cart'], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })
}
```

### 5. Update `src/mocks/services.ts` — cart service functions

```ts
// GET /api/cart → CartItem[]
export async function getCart(): Promise<CartItem[]> {
  const res = await fetch(`${API_URL}/api/cart`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to fetch cart')
  const json = await res.json()
  return json.data ?? []
}

// POST /api/cart
export async function addToCart(data: { variantId: number; quantity: number }): Promise<CartItem> {
  const res = await fetch(`${API_URL}/api/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ product_variant_id: data.variantId, quantity: data.quantity }),
  })
  if (!res.ok) throw new Error('Failed to add to cart')
  const json = await res.json()
  return json.data
}

// PATCH /api/cart/{id}
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

// DELETE /api/cart/{id}
export async function removeFromCart(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/cart/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to remove cart item')
}
```

### 6. Auth gate — "Add to Cart" buttons

Every place that calls `addItem()` from the old store is updated to:

```ts
const { user } = useAuthStore()
const addToCart = useAddToCart()
const showToast = useUIStore(s => s.showToast)
const router = useRouter()

function handleAddToCart(variantId: number, quantity: number) {
  if (!user) {
    showToast('سجّل دخولك لإضافة المنتج إلى السلة')
    router.push('/auth/login')
    return
  }
  addToCart.mutate({ variantId, quantity })
}
```

Files to update: product detail page, product cards, any quick-add buttons.

### 7. Cart count in navbar

Replace `useCartStore(s => s.count())` with:

```ts
const { data: cartItems = [] } = useCart()
const count = cartItems.reduce((sum, i) => sum + i.quantity, 0)
```

### 8. Cart page / drawer

Replace store reads with:

```ts
const { data: items = [], isPending } = useCart()
const updateItem = useUpdateCartItem()
const removeItem = useRemoveFromCart()
```

Show a loading skeleton while `isPending`. On quantity change: call `updateItem.mutate({ id: item.id, quantity: newQty })`. On remove: `removeItem.mutate(item.id)`.

### 9. Checkout integration

`CheckoutPageClient.tsx`:

```ts
const { data: cartItems = [], isPending: cartLoading } = useCart()
const removeFromCart = useRemoveFromCart()

const total = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0)

// Empty cart guard
if (!cartLoading && cartItems.length === 0 && !submitted) {
  return <EmptyCartState />
}

// Order payload
const orderItems = cartItems.map(i => ({
  product_variant_id: i.variantId,
  quantity: i.quantity,
}))

// After successful order — clear cart
async function clearCart() {
  await Promise.all(cartItems.map(i => removeFromCart.mutateAsync(i.id)))
}
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| API add fails | Optimistic rollback + toast "تعذّر إضافة المنتج، حاول مرة أخرى" |
| API update fails | Optimistic rollback, quantity reverts |
| API remove fails | Optimistic rollback, item reappears |
| Cart fetch fails | Show empty cart with retry button |
| Not authenticated | Toast + redirect to login |

---

## Files Affected

| File | Change |
|---|---|
| `aroma-api/app/Http/Resources/CartItemResource.php` | Add `id` and `variantId` fields |
| `aroma/src/store/cart.ts` | **Delete** |
| `aroma/src/types/index.ts` | Update `CartItem` type |
| `aroma/src/lib/api/queries.ts` | Add `useCart`, `useAddToCart`, `useUpdateCartItem`, `useRemoveFromCart` |
| `aroma/src/mocks/services.ts` | Update cart service functions |
| `aroma/src/features/checkout/CheckoutPageClient.tsx` | Read from `useCart()`, clear via `useRemoveFromCart` |
| All "Add to Cart" entry points | Auth check + new mutation call |
| Cart page / drawer component | Read from `useCart()` hook |
| Navbar cart count | Read from `useCart()` |

---

## Out of Scope

- Guest cart (blocked by design — login required)
- Bulk-clear endpoint (loop delete is sufficient for typical cart sizes)
- Wishlist (separate feature)
