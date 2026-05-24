# API Cart Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the client-side Zustand/localStorage cart with the existing backend cart API so the cart persists across devices and is visible to admins.

**Architecture:** Delete `src/store/cart.ts` entirely. Add `useCart / useAddToCart / useUpdateCartItem / useRemoveFromCart` React Query hooks that talk to the existing `/api/cart` endpoints. Every component that previously read from the Zustand store reads from `useCart()` instead. Adding to cart when not logged in shows a toast and redirects to login.

**Tech Stack:** Laravel 11 (backend), Next.js 14 App Router, React Query (TanStack Query), TypeScript, Tailwind CSS.

---

## File Structure

| File | Change |
|---|---|
| `aroma-api/app/Http/Resources/CartItemResource.php` | Add `id` and `variantId` to response |
| `aroma/src/types/index.ts` | Update `CartItem` type: add `id`, `variantId` |
| `aroma/src/mocks/services.ts` | Update `getCart`, `addToCart`, `updateCartItem`, `removeFromCart` signatures |
| `aroma/src/lib/api/queries.ts` | Add `useCart`, `useAddToCart`, `useUpdateCartItem`, `useRemoveFromCart` |
| `aroma/src/features/cart/CartPageClient.tsx` | Use API hooks instead of Zustand store |
| `aroma/src/features/product/ProductPageClient.tsx` | Use `useAddToCart` with auth gate |
| `aroma/src/features/checkout/CheckoutPageClient.tsx` | Read cart from `useCart()`, clear via `useRemoveFromCart` |
| `aroma/src/components/layout/Header.tsx` | Derive cart count from `useCart()` |
| `aroma/src/components/layout/MobileNav.tsx` | Derive cart count from `useCart()` |
| `aroma/src/store/cart.ts` | **Delete** |

---

## Task 1: Backend — Expose `id` and `variantId` in CartItemResource

**Files:**
- Modify: `aroma-api/app/Http/Resources/CartItemResource.php`

- [x] **Step 1: Read the file**

```bash
cat /Users/suhaib/web_projects/aroma-full-project/aroma-api/app/Http/Resources/CartItemResource.php
```

- [x] **Step 2: Add `id` and `variantId` to `toArray()`**

In `CartItemResource.php`, add two fields at the top of the returned array (before `'product'`):

```php
public function toArray(Request $request): array
{
    $product = $this->variant->product;
    $variant = $this->variant;

    return [
        'id'        => $this->id,
        'variantId' => $this->product_variant_id,
        'product'   => [
            'id'            => $product->id,
            'slug'          => $product->slug,
            'name'          => $product->name,
            'brand'         => $product->brand?->name,
            'brandId'       => $product->brand_id,
            'price'         => $variant->price,
            'originalPrice' => $variant->original_price,
            'sizes'         => $product->variants->pluck('size')->toArray(),
            'selectedSize'  => $variant->size,
            'type'          => $product->type?->value,
            'category'      => $product->category?->label,
            'notes'         => $product->notes->groupBy('type')->map(function ($group) {
                return $group->pluck('note')->toArray();
            })->toArray(),
            'tags'          => $product->tags->pluck('tag')->toArray(),
            'description'   => $product->description,
            'stock'         => str_replace('_', '-', $variant->stock?->value),
            'rating'        => $product->rating,
            'reviews'       => $product->reviews_count,
            'new'           => $product->is_new,
            'bestseller'    => $product->is_bestseller,
            'offer'         => $product->is_offer,
            'placeholder'   => [
                'bg'  => $product->placeholder_bg,
                'dot' => $product->placeholder_dot,
            ],
        ],
        'quantity' => $this->quantity,
    ];
}
```

- [x] **Step 3: Verify with tinker**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-api && php artisan tinker --execute="
\$item = \App\Models\CartItem::with(['variant.product.brand','variant.product.category','variant.product.variants','variant.product.notes','variant.product.tags'])->first();
if (\$item) {
    \$r = new \App\Http\Resources\CartItemResource(\$item);
    \$arr = \$r->toArray(request());
    echo 'id: ' . \$arr['id'] . PHP_EOL;
    echo 'variantId: ' . \$arr['variantId'] . PHP_EOL;
} else {
    echo 'no cart items in DB yet';
}
"
```

Expected: prints `id: <number>` and `variantId: <number>` (or "no cart items in DB yet" if table is empty — that is fine).

- [x] **Step 4: Commit**

```bash
git add aroma-api/app/Http/Resources/CartItemResource.php
git commit -m "feat: expose id and variantId in CartItemResource"
```

---

## Task 2: Frontend — Update CartItem Type and Service Functions

**Files:**
- Modify: `aroma/src/types/index.ts`
- Modify: `aroma/src/mocks/services.ts`

- [x] **Step 1: Read both files**

```bash
grep -n "CartItem\|CartProduct" /Users/suhaib/web_projects/aroma-full-project/aroma/src/types/index.ts | head -20
grep -n "getCart\|addToCart\|updateCartItem\|removeFromCart" /Users/suhaib/web_projects/aroma-full-project/aroma/src/mocks/services.ts
```

- [x] **Step 2: Update `CartItem` interface in `aroma/src/types/index.ts`**

Find the existing `CartItem` interface and replace it:

```ts
export interface CartItem {
  id: number           // cart_items.id — used for PATCH/DELETE
  variantId: number    // product_variant_id — used for order payload
  product: CartProduct
  quantity: number
}
```

- [x] **Step 3: Update cart service functions in `aroma/src/mocks/services.ts`**

Find and replace the four cart service functions (`getCart`, `addToCart`, `updateCartItem` / existing update, `removeFromCart` / existing remove). Replace them all with:

```ts
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
```

> **Note:** `CartItem` must be imported at the top of `services.ts` if it isn't already. Check existing imports from `@/types` and add `CartItem` to the import list.

- [x] **Step 4: Check TypeScript**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma && npx tsc --noEmit 2>&1 | grep -i "services\|CartItem" | head -20
```

Expected: no new errors on those files (pre-existing `data.ts` errors are unrelated).

- [x] **Step 5: Commit**

```bash
git add aroma/src/types/index.ts aroma/src/mocks/services.ts
git commit -m "feat: update CartItem type and service fns for API cart"
```

---

## Task 3: Frontend — Add Cart Hooks to queries.ts

**Files:**
- Modify: `aroma/src/lib/api/queries.ts`

- [x] **Step 1: Read the top of queries.ts to understand imports**

```bash
head -30 /Users/suhaib/web_projects/aroma-full-project/aroma/src/lib/api/queries.ts
```

- [x] **Step 2: Add cart hooks**

Add these four hooks to `aroma/src/lib/api/queries.ts`. Place them in the cart section (search for existing `useCart` or add after address hooks):

```ts
// ── Cart ──────────────────────────────────────────────────────────────

export function useCart() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['cart'],
    queryFn:  getCart,
    enabled:  !!user,
    staleTime: 1000 * 30,   // 30 seconds
  })
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { variantId: number; quantity: number }) => addToCart(data),
    onSettled:  () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) =>
      updateCartItem(id, quantity),
    onMutate: async ({ id, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] })
      const prev = queryClient.getQueryData<CartItem[]>(['cart']) ?? []
      queryClient.setQueryData<CartItem[]>(
        ['cart'],
        prev.map(i => (i.id === id ? { ...i, quantity } : i)),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['cart'], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => removeFromCart(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] })
      const prev = queryClient.getQueryData<CartItem[]>(['cart']) ?? []
      queryClient.setQueryData<CartItem[]>(['cart'], prev.filter(i => i.id !== id))
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['cart'], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })
}
```

> **Import checklist** — make sure these are imported at the top of `queries.ts`:
> - `CartItem` from `@/types`
> - `getCart, addToCart, updateCartItem, removeFromCart` from `@/mocks/services` (or wherever services live)
> - `useAuthStore` from `@/store/auth`
> - `useQuery, useMutation, useQueryClient` from `@tanstack/react-query`

- [x] **Step 3: Check TypeScript**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma && npx tsc --noEmit 2>&1 | grep -i "queries" | head -20
```

Expected: no errors on `queries.ts`.

- [x] **Step 4: Commit**

```bash
git add aroma/src/lib/api/queries.ts
git commit -m "feat: add useCart, useAddToCart, useUpdateCartItem, useRemoveFromCart hooks"
```

---

## Task 4: Frontend — Update CartPageClient

**Files:**
- Modify: `aroma/src/features/cart/CartPageClient.tsx`

The current page uses `useCartStore` (index-based). Replace it with the API hooks. Key differences:
- `update(idx, qty)` → `updateItem.mutate({ id: item.id, qty })`
- `remove(idx)` → `removeItem.mutate(item.id)`
- `subtotal` computed inline
- Loading skeleton while `isPending`

- [x] **Step 1: Replace the CartPageClient implementation**

Replace the entire file content with:

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link            from 'next/link'
import { useRouter }   from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus, X, ShoppingBag } from 'lucide-react'
import { SectionHeader }      from '@/components/shared/SectionHeader'
import { ProductPlaceholder } from '@/components/shared/ProductPlaceholder'
import { EmptyState }         from '@/components/shared/EmptyState'
import { useAuthStore }       from '@/store/auth'
import { useUIStore }         from '@/store/ui'
import { useCart, useUpdateCartItem, useRemoveFromCart } from '@/lib/api/queries'
import { formatPrice }        from '@/lib/formatters'

export function CartPageClient() {
  const router     = useRouter()
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const showToast  = useUIStore(s => s.showToast)
  const [ready, setReady] = useState(false)

  const { data: items = [], isPending } = useCart()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveFromCart()

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)

  useEffect(() => { setReady(true) }, [])
  useEffect(() => {
    if (ready && !isLoggedIn) router.replace('/login?redirect=/cart')
  }, [ready, isLoggedIn, router])

  if (!ready || !isLoggedIn) return null

  const handleRemove = (id: number) => {
    removeItem.mutate(id)
    showToast('تمت إزالة المنتج')
  }

  if (isPending) {
    return (
      <div className="pt-24 pb-20 px-6 md:px-12 max-w-[900px] mx-auto space-y-4">
        <SectionHeader label="مراجعة" title="سلة التسوق" />
        {[1, 2].map(i => (
          <div key={i} className="h-28 bg-aroma-border animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="pt-24 pb-20 px-6 md:px-12 max-w-[900px] mx-auto">
      <SectionHeader label="مراجعة" title="سلة التسوق" />

      {items.length === 0 ? (
        <EmptyState
          Icon={ShoppingBag}
          title="سلتك فارغة"
          subtitle="مرحباً في أرومـا 🌟 — ابدأ باختيار عطرك المفضل."
          action="استكشف المجموعة"
          onAction={() => router.push('/search')}
        />
      ) : (
        <>
          <div className="divide-y divide-aroma-border-lt">
            <AnimatePresence>
              {items.map(item => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-5 py-6 items-center"
                >
                  <Link
                    href={`/product/${item.product.slug}`}
                    className="w-[90px] h-[110px] rounded shrink-0 overflow-hidden"
                  >
                    <ProductPlaceholder product={item.product} height={110} />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-[11px] text-aroma-accent tracking-[0.08em] uppercase mb-1">
                      {item.product.brand}
                    </p>
                    <p className="font-display text-[17px] font-medium text-aroma-text mb-1 truncate">
                      {item.product.name}
                    </p>
                    <p className="font-sans text-[12px] text-aroma-muted mb-4">
                      {item.product.selectedSize} · {item.product.type}
                    </p>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-aroma-border rounded">
                        <button
                          onClick={() => {
                            if (item.quantity > 1) {
                              updateItem.mutate({ id: item.id, quantity: item.quantity - 1 })
                            } else {
                              handleRemove(item.id)
                            }
                          }}
                          className="w-9 h-9 flex items-center justify-center text-[#4A4540]
                                     hover:bg-aroma-bg transition-colors"
                          aria-label="تقليل الكمية"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-sans text-[13px]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateItem.mutate({ id: item.id, quantity: item.quantity + 1 })
                          }
                          className="w-9 h-9 flex items-center justify-center text-[#4A4540]
                                     hover:bg-aroma-bg transition-colors"
                          aria-label="زيادة الكمية"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemove(item.id)}
                        className="font-sans text-[12px] text-aroma-faint hover:text-aroma-text
                                   transition-colors flex items-center gap-1"
                      >
                        <X size={13} /> إزالة
                      </button>
                    </div>
                  </div>

                  <p className="font-sans text-[17px] font-medium text-aroma-text shrink-0">
                    {formatPrice(item.product.price * item.quantity)}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-8 flex justify-end">
            <div className="w-full max-w-[320px] space-y-0">
              <div className="flex justify-between py-2.5 font-sans text-[13px] text-aroma-muted">
                <span>المجموع الفرعي</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between py-2.5 font-sans text-[13px] text-aroma-muted">
                <span>الشحن</span>
                <span className="text-status-green-text">مجاني</span>
              </div>
              <div className="flex justify-between pt-3.5 pb-6 mt-1 border-t border-aroma-border
                              font-sans text-[16px] font-medium text-aroma-text">
                <span>الإجمالي</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <button
                onClick={() => router.push('/checkout')}
                className="w-full bg-aroma-text text-white py-4 rounded font-sans text-[13px]
                           font-medium hover:bg-aroma-accent transition-colors"
              >
                المتابعة للدفع
              </button>
              <button
                onClick={() => router.push('/search')}
                className="w-full py-3 font-sans text-[13px] text-aroma-muted
                           hover:text-aroma-text transition-colors"
              >
                مواصلة التسوق
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

- [x] **Step 2: TypeScript check**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma && npx tsc --noEmit 2>&1 | grep -i "CartPage" | head -20
```

Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add aroma/src/features/cart/CartPageClient.tsx
git commit -m "feat: CartPageClient uses API cart hooks"
```

---

## Task 5: Frontend — Update ProductPageClient Add-to-Cart

**Files:**
- Modify: `aroma/src/features/product/ProductPageClient.tsx`

Replace `addToCart = useCartStore(s => s.addItem)` with `useAddToCart()`. The auth gate already exists (`if (!isLoggedIn) router.push('/login...')`).

- [x] **Step 1: Read the relevant section of ProductPageClient.tsx**

```bash
grep -n "useCartStore\|addToCart\|addItem\|handleAdd\|isLoggedIn" /Users/suhaib/web_projects/aroma-full-project/aroma/src/features/product/ProductPageClient.tsx | head -20
```

- [x] **Step 2: Replace the import**

Find: `import { useCartStore } from '@/store/cart'`
Replace with: `import { useAddToCart } from '@/lib/api/queries'`

- [x] **Step 3: Replace the hook call**

Find: `const addToCart = useCartStore(s => s.addItem)`
Replace with: `const addToCartMutation = useAddToCart()`

- [x] **Step 4: Update `handleAdd`**

Find the `handleAdd` function and replace its body:

```ts
const handleAdd = () => {
  if (!isLoggedIn) {
    router.push(`/login?redirect=${encodeURIComponent(pathname ?? '/')}`)
    return
  }
  if (displayStock === 'out-of-stock') return
  if (!activeVariant?.id) return

  addToCartMutation.mutate(
    { variantId: activeVariant.id, quantity: qty },
    {
      onSuccess: () => {
        showToast('تمت إضافة المنتج إلى السلة')
        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
      },
      onError: () => {
        showToast('تعذّر إضافة المنتج، حاول مرة أخرى')
      },
    },
  )
}
```

> **Note:** `activeVariant.id` is the product variant's database id (it comes from `product.variants` which the backend returns with their ids). If the variant type doesn't yet have `id: number`, add it to the `ProductVariant` interface in `types/index.ts`.

- [x] **Step 5: TypeScript check**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma && npx tsc --noEmit 2>&1 | grep -i "ProductPage\|handleAdd\|activeVariant" | head -20
```

If `activeVariant.id` errors because `ProductVariant` is missing `id`, open `aroma/src/types/index.ts`, find the `ProductVariant` interface, and add `id: number` to it.

- [x] **Step 6: Commit**

```bash
git add aroma/src/features/product/ProductPageClient.tsx aroma/src/types/index.ts
git commit -m "feat: ProductPageClient uses useAddToCart API hook"
```

---

## Task 6: Frontend — Update Header and MobileNav Cart Count

**Files:**
- Modify: `aroma/src/components/layout/Header.tsx`
- Modify: `aroma/src/components/layout/MobileNav.tsx`

- [x] **Step 1: Read both files' cart-related lines**

```bash
grep -n "useCartStore\|cartCount\|count()" /Users/suhaib/web_projects/aroma-full-project/aroma/src/components/layout/Header.tsx
grep -n "useCartStore\|cartCount\|count()" /Users/suhaib/web_projects/aroma-full-project/aroma/src/components/layout/MobileNav.tsx
```

- [x] **Step 2: Update Header.tsx**

Replace `import { useCartStore } from '@/store/cart'` with `import { useCart } from '@/lib/api/queries'`.

Replace `const cartCount = useCartStore(s => s.count())` with:
```ts
const { data: cartItems = [] } = useCart()
const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)
```

- [x] **Step 3: Update MobileNav.tsx**

Replace `import { useCartStore } from '@/store/cart'` with `import { useCart } from '@/lib/api/queries'`.

Replace `const cartCount = useCartStore(s => s.count())` with:
```ts
const { data: cartItems = [] } = useCart()
const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)
```

- [x] **Step 4: TypeScript check**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma && npx tsc --noEmit 2>&1 | grep -i "Header\|MobileNav" | head -20
```

Expected: no errors.

- [x] **Step 5: Commit**

```bash
git add aroma/src/components/layout/Header.tsx aroma/src/components/layout/MobileNav.tsx
git commit -m "feat: Header and MobileNav derive cart count from API"
```

---

## Task 7: Frontend — Update CheckoutPageClient

**Files:**
- Modify: `aroma/src/features/checkout/CheckoutPageClient.tsx`

Replace Zustand cart reads with `useCart()`. Replace `clearCart()` with a loop of `removeFromCart`.

- [x] **Step 1: Read the current imports and hook usage**

```bash
grep -n "useCartStore\|items\|subtotal\|clearCart\|clear" /Users/suhaib/web_projects/aroma-full-project/aroma/src/features/checkout/CheckoutPageClient.tsx | head -20
```

- [x] **Step 2: Replace the import**

Remove: `import { useCartStore } from '@/store/cart'`

Add to existing query imports: `useCart, useRemoveFromCart` from `'@/lib/api/queries'`

- [x] **Step 3: Replace hook calls**

Remove:
```ts
const items     = useCartStore(s => s.items)
const subtotal  = useCartStore(s => s.subtotal())
const clearCart = useCartStore(s => s.clear)
```

Add:
```ts
const { data: cartItems = [], isPending: cartLoading } = useCart()
const removeFromCart = useRemoveFromCart()
const subtotal = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
```

- [x] **Step 4: Update `onSubmit` to clear cart via API**

Find the `onSubmit` function. Replace any reference to `items` with `cartItems` and replace `clearCart()` with:

```ts
// clear cart — remove each item from backend
await Promise.all(cartItems.map(i => removeFromCart.mutateAsync(i.id)))
```

The order payload mapping changes from `items.map(...)` to:
```ts
const orderItems = cartItems.map(i => ({
  product_variant_id: i.variantId,
  quantity:           i.quantity,
}))
```

Pass `orderItems` as `items` in `createOrder.mutateAsync({ items: orderItems, total: subtotal, ... })`.

- [x] **Step 5: Update empty-cart guard**

Find the guard `if (items.length === 0 && !success)` and update to:
```ts
if (!cartLoading && cartItems.length === 0 && !submitted) {
```

- [x] **Step 6: Update order summary JSX**

Find the items map in the JSX summary. Replace `items.map(item => ...)` with `cartItems.map(item => ...)`. The item fields stay the same (`item.product.name`, `item.product.price`, `item.quantity`).

- [x] **Step 7: TypeScript check**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma && npx tsc --noEmit 2>&1 | grep -i "CheckoutPage" | head -20
```

Expected: no errors.

- [x] **Step 8: Commit**

```bash
git add aroma/src/features/checkout/CheckoutPageClient.tsx
git commit -m "feat: CheckoutPageClient reads cart from API, clears via removeFromCart"
```

---

## Task 8: Frontend — Delete the Zustand Cart Store

**Files:**
- Delete: `aroma/src/store/cart.ts`

- [x] **Step 1: Confirm no remaining imports**

```bash
grep -rn "from.*store/cart\|useCartStore" /Users/suhaib/web_projects/aroma-full-project/aroma/src --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next"
```

Expected: **no output** (all usages were replaced in Tasks 4–7).

If any usages remain, fix them before continuing.

- [x] **Step 2: Delete the file**

```bash
rm /Users/suhaib/web_projects/aroma-full-project/aroma/src/store/cart.ts
```

- [x] **Step 3: Full TypeScript check**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma && npx tsc --noEmit 2>&1 | grep -v "mocks/data" | head -40
```

Expected: no errors (pre-existing `mocks/data.ts` errors are unrelated and can be ignored).

- [x] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: delete Zustand localStorage cart store — API is now source of truth"
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|---|---|
| CartItemResource exposes `id` and `variantId` | Task 1 |
| `CartItem` type updated | Task 2 |
| Cart service functions updated | Task 2 |
| `useCart / useAddToCart / useUpdateCartItem / useRemoveFromCart` hooks | Task 3 |
| CartPageClient uses API hooks | Task 4 |
| Auth gate on add-to-cart (redirect to login) | Task 5 (auth check already existed, now calls API) |
| Header + MobileNav count from API | Task 6 |
| Checkout reads from `useCart()` | Task 7 |
| Checkout clears cart via `removeFromCart` loop | Task 7 |
| Zustand store deleted | Task 8 |
| Admin cart view | Already works (backend endpoint existed, now the backend has real cart data) |

### Type consistency

- `CartItem.id` defined in Task 2, used in Task 3 (optimistic update), Task 4 (remove/update by id), Task 7 (clear loop). ✓
- `CartItem.variantId` defined in Task 2, used in Task 7 (order payload). ✓
- `useAddToCart` mutationFn takes `{ variantId, quantity }` (Task 3), called with same shape in Task 5. ✓
- `useUpdateCartItem` takes `{ id, quantity }` (Task 3), called with same shape in Task 4. ✓
- `useRemoveFromCart` takes `id: number` (Task 3), called with `item.id` in Tasks 4 and 7. ✓
