# Wishlist API & UI Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the storefront wishlist to the real API, remove all rating displays, translate wishlist UI copy to Arabic, and add per-user cart/wishlist views in the admin panel.

**Architecture:** The storefront `useWishlistStore` (Zustand + localStorage) is replaced by React Query hooks that call the existing `/api/wishlist` endpoints; the Zustand store is kept only for the optimistic `ids` set used by `WishlistButton`. The admin gets two new API endpoints (`GET /admin/users/{id}/cart` and `GET /admin/users/{id}/wishlist`) backed by a new `AdminUserDetailController`, and a new Vue view `UserDetailView.vue` linked from the users table.

**Tech Stack:** Next.js 14, React Query, Zustand, Laravel 11, Vue 3 (admin)

---

## File Map

### Storefront (`aroma/src/`)
| File | Change |
|------|--------|
| `store/wishlist.ts` | Add `setIds(ids)` action; keep `toggle` for optimistic UI |
| `lib/api/queries.ts` | Add `useWishlist`, `useAddToWishlist`, `useRemoveFromWishlist` hooks |
| `mocks/services.ts` | `getWishlist()` already exists but uses auth header — verify; add typed return |
| `components/shared/WishlistButton.tsx` | Translate copy to Arabic; call API mutations on toggle |
| `features/wishlist/WishlistPageClient.tsx` | Replace mock `PRODUCTS.filter` with `useWishlist()` query |
| `features/product/ProductPageClient.tsx` | Remove rating block (stars + review count) |
| `components/shared/ProductCard.tsx` | No rating shown here — verify nothing to remove |

### API (`aroma-api/`)
| File | Change |
|------|--------|
| `app/Http/Controllers/Api/Admin/AdminUserDetailController.php` | New: `cart(userId)` and `wishlist(userId)` actions |
| `routes/api.php` | Register `GET /admin/users/{id}/cart` and `GET /admin/users/{id}/wishlist` |

### Admin (`aroma-admin/src/`)
| File | Change |
|------|--------|
| `types/index.ts` | Add `AdminCartItem`, `AdminWishlistProduct` interfaces |
| `api/admin.ts` | Add `apiGetUserCart(id)` and `apiGetUserWishlist(id)` |
| `views/UserDetailView.vue` | New: shows cart + wishlist for a given user |
| `views/UsersView.vue` | Add clickable row → navigate to `UserDetailView` |
| `router/index.ts` | Register `/users/:id` route pointing to `UserDetailView` |

---

## Task 1: Remove rating from product detail page

**Files:**
- Modify: `aroma/src/features/product/ProductPageClient.tsx`

- [ ] **Step 1: Delete the rating block**

In `aroma/src/features/product/ProductPageClient.tsx`, find and remove the entire "Rating" section (lines that render the 5 `<Star>` icons and the `{product.rating} ({product.reviews} تقييم)` text). The block looks like:

```tsx
{/* Rating */}
<div className="flex items-center gap-2 mb-5">
  <div className="flex gap-0.5 text-aroma-accent">
    {[...Array(5)].map((_, i) => (
      <Star key={i} size={12} fill="currentColor" stroke="none" />
    ))}
  </div>
  <span className="font-sans text-[13px] text-aroma-muted">
    {product.rating} ({product.reviews} تقييم)
  </span>
</div>
```

Remove this entire block. Also remove `Star` from the lucide import line:

```tsx
// Before:
import { ChevronLeft, Minus, Plus, Check, Star } from 'lucide-react'
// After:
import { ChevronLeft, Minus, Plus, Check } from 'lucide-react'
```

- [ ] **Step 2: Verify the page still builds**

```bash
cd aroma && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `Star` or rating.

- [ ] **Step 3: Commit**

```bash
cd aroma && git add src/features/product/ProductPageClient.tsx
git commit -m "feat: remove rating display from product detail page"
```

---

## Task 2: Translate WishlistButton copy to Arabic

**Files:**
- Modify: `aroma/src/components/shared/WishlistButton.tsx`

- [ ] **Step 1: Replace English copy with Arabic**

Replace the entire file content:

```tsx
'use client'

import { Heart }         from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useWishlistStore } from '@/store/wishlist'
import { useAuthStore }    from '@/store/auth'
import { useUIStore }      from '@/store/ui'
import { cn }              from '@/lib/utils'

interface Props {
  productId: number
  size?: number
  className?: string
  variant?: 'overlay' | 'block'
}

export function WishlistButton({ productId, size = 16, className, variant = 'overlay' }: Props) {
  const router     = useRouter()
  const pathname   = usePathname()
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const ids        = useWishlistStore(s => s.ids)
  const toggle     = useWishlistStore(s => s.toggle)
  const showToast  = useUIStore(s => s.showToast)
  const saved      = isLoggedIn && ids.includes(productId)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(pathname ?? '/')}`)
      return
    }
    const result = toggle(productId)
    showToast(result === 'added' ? 'أُضيف إلى المفضلة ♡' : 'حُذف من المفضلة')
  }

  if (variant === 'block') {
    return (
      <button
        onClick={handleClick}
        aria-label={saved ? 'حذف من المفضلة' : 'حفظ في المفضلة'}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-3 border border-aroma-border rounded',
          'font-sans text-[13px] transition-colors',
          saved
            ? 'text-aroma-accent border-aroma-accent'
            : 'text-aroma-muted hover:text-aroma-text hover:border-aroma-text',
          className,
        )}
      >
        <Heart size={15} fill={saved ? 'currentColor' : 'none'} />
        {saved ? 'محفوظ في المفضلة' : 'أضف إلى المفضلة'}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      aria-label={saved ? 'حذف من المفضلة' : 'أضف إلى المفضلة'}
      className={cn(
        'absolute top-2.5 right-2.5 z-10 w-[34px] h-[34px] rounded-full',
        'bg-white/90 flex items-center justify-center shadow-sm',
        'transition-transform hover:scale-110',
        saved ? 'text-aroma-accent' : 'text-aroma-faint',
        className,
      )}
    >
      <Heart size={size} fill={saved ? 'currentColor' : 'none'} />
    </button>
  )
}
```

- [ ] **Step 2: Verify types**

```bash
cd aroma && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/WishlistButton.tsx
git commit -m "feat: translate WishlistButton copy to Arabic"
```

---

## Task 3: Add wishlist Query hooks + update Zustand store

**Files:**
- Modify: `aroma/src/store/wishlist.ts`
- Modify: `aroma/src/lib/api/queries.ts`
- Modify: `aroma/src/mocks/services.ts`

The API already has `GET /api/wishlist` (returns `ProductResource[]`), `POST /api/wishlist` `{ product_id }`, and `DELETE /api/wishlist/{productId}`.

- [ ] **Step 1: Add `setIds` action to the wishlist store**

Replace `aroma/src/store/wishlist.ts` with:

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WishlistStore {
  ids: number[]
  setIds:  (ids: number[]) => void
  has:    (id: number) => boolean
  toggle: (id: number) => 'added' | 'removed'
  add:    (id: number) => void
  remove: (id: number) => void
  count:  () => number
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      ids: [],

      setIds: (ids) => set({ ids }),

      has: (id) => get().ids.includes(id),

      toggle: (id) => {
        if (get().ids.includes(id)) {
          set(state => ({ ids: state.ids.filter(i => i !== id) }))
          return 'removed'
        } else {
          set(state => ({ ids: [...state.ids, id] }))
          return 'added'
        }
      },

      add: (id) => {
        if (!get().ids.includes(id)) {
          set(state => ({ ids: [...state.ids, id] }))
        }
      },

      remove: (id) => {
        set(state => ({ ids: state.ids.filter(i => i !== id) }))
      },

      count: () => get().ids.length,
    }),
    {
      name: 'aroma-wishlist',
      partialize: state => ({ ids: state.ids }),
    },
  ),
)
```

- [ ] **Step 2: Update `getWishlist` service in `aroma/src/mocks/services.ts`**

Replace the existing `getWishlistProducts` function (which takes `ids: number[]`) with a properly-typed `getWishlist` that calls the API:

```ts
export async function getWishlist(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/api/wishlist`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to fetch wishlist')
  const json = await res.json()
  return json.data || json
}

export async function addToWishlist(productId: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/wishlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ product_id: productId }),
  })
  if (!res.ok) throw new Error('Failed to add to wishlist')
}

export async function removeFromWishlist(productId: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/wishlist/${productId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to remove from wishlist')
}
```

(Remove the old `addToWishlist` / `removeFromWishlist` functions that had different signatures if they exist — check the file for duplicates and keep only these.)

- [ ] **Step 3: Add wishlist query keys and hooks to `aroma/src/lib/api/queries.ts`**

Add after the existing `useSimilarProducts` hook:

```ts
// Add to queryKeys object:
wishlist: () => ['wishlist'] as const,

// Add hooks:
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
```

- [ ] **Step 4: Verify types**

```bash
cd aroma && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/store/wishlist.ts src/lib/api/queries.ts src/mocks/services.ts
git commit -m "feat: add wishlist API hooks and setIds action to wishlist store"
```

---

## Task 4: Wire WishlistButton to API mutations

**Files:**
- Modify: `aroma/src/components/shared/WishlistButton.tsx`

The button currently calls `toggle(productId)` on the Zustand store only. Now it should also call the API mutation and sync the store `ids` from the query cache.

- [ ] **Step 1: Update WishlistButton to call API mutations**

Replace the file:

```tsx
'use client'

import { Heart }          from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useWishlistStore }  from '@/store/wishlist'
import { useAuthStore }      from '@/store/auth'
import { useUIStore }        from '@/store/ui'
import { useAddToWishlist, useRemoveFromWishlist, useWishlist } from '@/lib/api/queries'
import { cn }                from '@/lib/utils'

interface Props {
  productId: number
  size?: number
  className?: string
  variant?: 'overlay' | 'block'
}

export function WishlistButton({ productId, size = 16, className, variant = 'overlay' }: Props) {
  const router     = useRouter()
  const pathname   = usePathname()
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const ids        = useWishlistStore(s => s.ids)
  const optimisticToggle = useWishlistStore(s => s.toggle)
  const showToast  = useUIStore(s => s.showToast)

  const addMutation    = useAddToWishlist()
  const removeMutation = useRemoveFromWishlist()

  const saved = isLoggedIn && ids.includes(productId)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(pathname ?? '/')}`)
      return
    }
    // Optimistic update first
    const result = optimisticToggle(productId)
    if (result === 'added') {
      showToast('أُضيف إلى المفضلة ♡')
      addMutation.mutate(productId)
    } else {
      showToast('حُذف من المفضلة')
      removeMutation.mutate(productId)
    }
  }

  if (variant === 'block') {
    return (
      <button
        onClick={handleClick}
        aria-label={saved ? 'حذف من المفضلة' : 'حفظ في المفضلة'}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-3 border border-aroma-border rounded',
          'font-sans text-[13px] transition-colors',
          saved
            ? 'text-aroma-accent border-aroma-accent'
            : 'text-aroma-muted hover:text-aroma-text hover:border-aroma-text',
          className,
        )}
      >
        <Heart size={15} fill={saved ? 'currentColor' : 'none'} />
        {saved ? 'محفوظ في المفضلة' : 'أضف إلى المفضلة'}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      aria-label={saved ? 'حذف من المفضلة' : 'أضف إلى المفضلة'}
      className={cn(
        'absolute top-2.5 right-2.5 z-10 w-[34px] h-[34px] rounded-full',
        'bg-white/90 flex items-center justify-center shadow-sm',
        'transition-transform hover:scale-110',
        saved ? 'text-aroma-accent' : 'text-aroma-faint',
        className,
      )}
    >
      <Heart size={size} fill={saved ? 'currentColor' : 'none'} />
    </button>
  )
}
```

- [ ] **Step 2: Verify types**

```bash
cd aroma && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/WishlistButton.tsx
git commit -m "feat: wire WishlistButton to API add/remove mutations with optimistic toggle"
```

---

## Task 5: Replace WishlistPageClient mock data with API query + seed store ids on load

**Files:**
- Modify: `aroma/src/features/wishlist/WishlistPageClient.tsx`

The wishlist page currently filters `PRODUCTS` (mock data) by stored `ids`. Replace with `useWishlist()` query and also sync `ids` into the store so `WishlistButton` knows what's saved.

- [ ] **Step 1: Rewrite WishlistPageClient**

Replace the file:

```tsx
'use client'

import { useEffect }     from 'react'
import { useRouter }     from 'next/navigation'
import { Heart }          from 'lucide-react'
import { SectionHeader }  from '@/components/shared/SectionHeader'
import { ProductCard }    from '@/components/shared/ProductCard'
import { EmptyState }     from '@/components/shared/EmptyState'
import { SkeletonGrid }   from '@/components/feedback/SkeletonCard'
import { useAuthStore }   from '@/store/auth'
import { useWishlistStore } from '@/store/wishlist'
import { useWishlist }    from '@/lib/api/queries'

export function WishlistPageClient() {
  const router     = useRouter()
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const setIds     = useWishlistStore(s => s.setIds)

  const { data: products = [], isPending } = useWishlist(isLoggedIn)

  // Sync fetched ids into the store so WishlistButton shows correct state
  useEffect(() => {
    if (products.length > 0) {
      setIds(products.map(p => p.id))
    }
  }, [products, setIds])

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/login?redirect=/wishlist')
    }
  }, [isLoggedIn, router])

  if (!isLoggedIn) return null

  return (
    <div className="pt-24 pb-20 px-6 md:px-12">
      <SectionHeader label="قائمة" title="المفضلة" />
      {isPending ? (
        <SkeletonGrid count={4} compact cols="grid-cols-2 md:grid-cols-4" />
      ) : products.length === 0 ? (
        <EmptyState
          Icon={Heart}
          title="قائمة المفضلة فارغة"
          subtitle="احفظ العطور التي تعجبك — ستجد كل ماهو جديد وتسليم فوري 🎁"
          action="تصفح العطور"
          onAction={() => router.push('/search')}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
          {products.map(p => <ProductCard key={p.id} product={p} compact />)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify types**

```bash
cd aroma && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/wishlist/WishlistPageClient.tsx
git commit -m "feat: load wishlist from API and sync ids to store"
```

---

## Task 6: Admin API — per-user cart and wishlist endpoints

**Files:**
- Create: `aroma-api/app/Http/Controllers/Api/Admin/AdminUserDetailController.php`
- Modify: `aroma-api/routes/api.php`

- [ ] **Step 1: Create `AdminUserDetailController.php`**

```php
<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CartItemResource;
use App\Http\Resources\ProductResource;
use App\Models\User;

class AdminUserDetailController extends Controller
{
    public function cart(int $userId)
    {
        $user = User::findOrFail($userId);
        $cartItems = $user->cart()
            ->with(['variant.product.brand', 'variant.product.category',
                    'variant.product.variants', 'variant.product.notes',
                    'variant.product.tags', 'variant.product.images'])
            ->get();
        return CartItemResource::collection($cartItems);
    }

    public function wishlist(int $userId)
    {
        $user = User::findOrFail($userId);
        $items = $user->wishlist()
            ->with(['product.brand', 'product.category', 'product.variants',
                    'product.notes', 'product.tags', 'product.images'])
            ->get();
        return ProductResource::collection($items->pluck('product'));
    }
}
```

- [ ] **Step 2: Register the routes in `routes/api.php`**

Add inside the admin middleware group, after the existing `Route::get('/users', ...)` line:

```php
Route::get('/users/{id}/cart',     [AdminUserDetailController::class, 'cart']);
Route::get('/users/{id}/wishlist', [AdminUserDetailController::class, 'wishlist']);
```

Also add `AdminUserDetailController` to the `use` import at the top of the admin group:

```php
use App\Http\Controllers\Api\Admin\{
    AdminDashboardController, AdminOrderController, AdminProductController,
    AdminBrandController, AdminCategoryController, AdminUserController,
    AdminProductVariantController, AdminProductImageController,
    AdminUserDetailController
};
```

- [ ] **Step 3: Test the endpoints manually**

```bash
# Get a user id first
cd aroma-api && php artisan tinker --execute="echo App\Models\User::where('is_admin',false)->first()->id;"
# Then curl (replace TOKEN and USER_ID):
curl -s -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/admin/users/USER_ID/wishlist | python3 -m json.tool | head -30
curl -s -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/admin/users/USER_ID/cart | python3 -m json.tool | head -30
```

Expected: JSON arrays (may be empty if the user has no items).

- [ ] **Step 4: Commit**

```bash
cd aroma-api && git add app/Http/Controllers/Api/Admin/AdminUserDetailController.php routes/api.php
git commit -m "feat: admin endpoints for per-user cart and wishlist"
```

---

## Task 7: Admin types + API client functions

**Files:**
- Modify: `aroma-admin/src/types/index.ts`
- Modify: `aroma-admin/src/api/admin.ts`

- [ ] **Step 1: Add types to `aroma-admin/src/types/index.ts`**

Add at the end of the file:

```ts
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
```

- [ ] **Step 2: Add API functions to `aroma-admin/src/api/admin.ts`**

Add after `apiGetUsers`:

```ts
export const apiGetUserCart     = (userId: number) =>
  client.get<AdminCartItem[]>(`/admin/users/${userId}/cart`)

export const apiGetUserWishlist = (userId: number) =>
  client.get<AdminWishlistProduct[]>(`/admin/users/${userId}/wishlist`)
```

Also add the new types to the import at line 1:
```ts
import type {
  AdminUser, DashboardStats, AdminOrder, AdminProduct,
  AdminBrand, AdminCategory, AdminUserRow, PageMeta, ProductVariant, ProductImage,
  AdminCartItem, AdminWishlistProduct,
} from '../types'
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd aroma-admin && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd aroma-admin && git add src/types/index.ts src/api/admin.ts
git commit -m "feat: add AdminCartItem, AdminWishlistProduct types and API functions"
```

---

## Task 8: Admin — UserDetailView with cart and wishlist tabs

**Files:**
- Create: `aroma-admin/src/views/UserDetailView.vue`
- Modify: `aroma-admin/src/router/index.ts`
- Modify: `aroma-admin/src/views/UsersView.vue`

- [ ] **Step 1: Create `UserDetailView.vue`**

```vue
<!-- aroma-admin/src/views/UserDetailView.vue -->
<template>
  <div class="space-y-6 max-w-4xl">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-xs">
      <RouterLink to="/users" class="text-dash-faint hover:text-dash-text transition-colors">Customers</RouterLink>
      <span class="text-dash-border">/</span>
      <span class="text-dash-text font-medium">{{ userName || `User #${id}` }}</span>
    </div>

    <!-- Error -->
    <div v-if="error" class="rounded-card bg-dash-danger-lt border border-dash-danger/20 px-4 py-3 text-xs text-dash-danger">
      {{ error }}
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-dash-border">
      <button
        v-for="tab in ['cart', 'wishlist']"
        :key="tab"
        @click="activeTab = tab as 'cart' | 'wishlist'"
        :class="[
          'px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px',
          activeTab === tab
            ? 'border-dash-primary text-dash-primary'
            : 'border-transparent text-dash-muted hover:text-dash-text',
        ]"
      >
        {{ tab === 'cart' ? 'Cart' : 'Wishlist' }}
        <span v-if="tab === 'cart' && cartItems.length" class="ml-1.5 bg-dash-border rounded-full px-1.5 py-0.5 text-[10px]">{{ cartItems.length }}</span>
        <span v-if="tab === 'wishlist' && wishlistItems.length" class="ml-1.5 bg-dash-border rounded-full px-1.5 py-0.5 text-[10px]">{{ wishlistItems.length }}</span>
      </button>
    </div>

    <!-- Cart tab -->
    <div v-if="activeTab === 'cart'">
      <div v-if="cartLoading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-16 bg-dash-border rounded-card animate-pulse" />
      </div>
      <div v-else-if="cartItems.length === 0" class="py-12 text-center text-xs text-dash-faint">
        Cart is empty
      </div>
      <div v-else class="bg-dash-surface rounded-card shadow-card divide-y divide-dash-border">
        <div
          v-for="item in cartItems"
          :key="item.product.id"
          class="flex items-center gap-4 px-5 py-4"
        >
          <div class="h-12 w-12 rounded-lg overflow-hidden bg-dash-border flex-shrink-0">
            <img v-if="item.product.thumbnailUrl" :src="item.product.thumbnailUrl" class="h-full w-full object-cover" />
            <div v-else class="h-full w-full flex items-center justify-center text-dash-faint">
              <Package :size="18" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-dash-text truncate">{{ item.product.name }}</p>
            <p class="text-[10px] text-dash-muted">{{ item.product.brand }} · {{ item.product.selectedSize }} ml</p>
          </div>
          <div class="text-right">
            <p class="text-xs font-semibold text-dash-text">{{ Number(item.product.price).toFixed(2) }} LYD</p>
            <p class="text-[10px] text-dash-muted">Qty: {{ item.quantity }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Wishlist tab -->
    <div v-if="activeTab === 'wishlist'">
      <div v-if="wishlistLoading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-16 bg-dash-border rounded-card animate-pulse" />
      </div>
      <div v-else-if="wishlistItems.length === 0" class="py-12 text-center text-xs text-dash-faint">
        Wishlist is empty
      </div>
      <div v-else class="bg-dash-surface rounded-card shadow-card divide-y divide-dash-border">
        <div
          v-for="product in wishlistItems"
          :key="product.id"
          class="flex items-center gap-4 px-5 py-4"
        >
          <div class="h-12 w-12 rounded-lg overflow-hidden bg-dash-border flex-shrink-0">
            <img v-if="product.thumbnailUrl" :src="product.thumbnailUrl" class="h-full w-full object-cover" />
            <div v-else class="h-full w-full flex items-center justify-center text-dash-faint">
              <Package :size="18" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-dash-text truncate">{{ product.name }}</p>
            <p class="text-[10px] text-dash-muted">{{ product.brand }} · {{ product.selectedSize }} ml</p>
          </div>
          <div class="text-right">
            <p class="text-xs font-semibold text-dash-text">{{ Number(product.price).toFixed(2) }} LYD</p>
            <ABadge :status="product.stock" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Package } from 'lucide-vue-next'
import { apiGetUserCart, apiGetUserWishlist, apiGetUsers } from '../api/admin'
import type { AdminCartItem, AdminWishlistProduct } from '../types'
import ABadge from '../components/ui/ABadge.vue'

const props  = defineProps<{ id: string }>()
const userId = Number(props.id)

const activeTab     = ref<'cart' | 'wishlist'>('cart')
const cartItems     = ref<AdminCartItem[]>([])
const wishlistItems = ref<AdminWishlistProduct[]>([])
const cartLoading     = ref(false)
const wishlistLoading = ref(false)
const userName = ref('')
const error    = ref<string | null>(null)

async function loadCart() {
  cartLoading.value = true
  try {
    const res = await apiGetUserCart(userId)
    cartItems.value = res.data
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load cart'
  } finally {
    cartLoading.value = false
  }
}

async function loadWishlist() {
  wishlistLoading.value = true
  try {
    const res = await apiGetUserWishlist(userId)
    wishlistItems.value = res.data as unknown as AdminWishlistProduct[]
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load wishlist'
  } finally {
    wishlistLoading.value = false
  }
}

onMounted(() => {
  loadCart()
  loadWishlist()
})
</script>
```

- [ ] **Step 2: Register the route in `aroma-admin/src/router/index.ts`**

Find the `users` route entry and add a child (or add a sibling route). Open `router/index.ts` and after `{ path: 'users', name: 'users', component: () => import('../views/UsersView.vue') }` add:

```ts
{ path: 'users/:id', name: 'user-detail', props: true, component: () => import('../views/UserDetailView.vue') },
```

- [ ] **Step 3: Make user rows clickable in `UsersView.vue`**

Add an `#actions` slot to the `<ATable>` in `UsersView.vue`:

```vue
<template #actions="{ row }">
  <RouterLink
    :to="`/users/${(row as AdminUserRow).id}`"
    class="text-xs text-dash-primary hover:underline"
  >
    View
  </RouterLink>
</template>
```

Also import `AdminUserRow` in the script if not already imported — add to the imports:

```ts
import type { AdminUserRow } from '../types'
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd aroma-admin && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/views/UserDetailView.vue src/router/index.ts src/views/UsersView.vue
git commit -m "feat: add UserDetailView with cart and wishlist tabs in admin"
```

---

## Self-Review

**Spec coverage check:**
1. ✅ Remove rating — Task 1 removes stars + review count from product detail page. `ProductCard` has no rating, confirmed.
2. ✅ Translate "Add to Wishlist" to Arabic — Tasks 2 and 4 both update `WishlistButton` copy.
3. ✅ Wishlist from API — Tasks 3, 4, 5 replace the localStorage-only approach with React Query + API calls, keeping optimistic Zustand toggle.
4. ✅ Admin sees user cart and wishlist — Tasks 6, 7, 8 add the API endpoints, types, and `UserDetailView`.

**No placeholders found.**

**Type consistency:**
- `AdminCartItem` and `AdminWishlistProduct` defined in Task 7 and used in Task 8 ✅
- `useWishlist`, `useAddToWishlist`, `useRemoveFromWishlist` defined in Task 3 and used in Tasks 4 and 5 ✅
- `setIds` defined in Task 3 store and called in Task 5 ✅
