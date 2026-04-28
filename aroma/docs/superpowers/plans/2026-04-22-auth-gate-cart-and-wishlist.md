# Auth-Gate Cart and Wishlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redirect unauthenticated users to the login page when they try to visit `/cart`, visit `/wishlist`, add an item to the bag, or toggle a wishlist button — then return them to their original destination after login.

**Architecture:** All guards are client-side (consistent with the existing `ProfilePageClient` pattern). Login and Register pages read a `?redirect=` query param and push to it after success. Cart and Wishlist page clients redirect to `/login?redirect=/cart` (or `/wishlist`) when the auth store reports the user is not logged in, guarded by a hydration flag to avoid false redirects during SSR. `WishlistButton` and `ProductPageClient` check auth before acting on the store.

**Tech Stack:** Next.js 15 App Router, React client components, Zustand (`useAuthStore`), `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`)

---

## Files

| File | Change |
|------|--------|
| `src/features/auth/LoginPageClient.tsx` | Read `?redirect` param; push to it after successful login |
| `src/features/auth/RegisterPageClient.tsx` | Same redirect handling after register |
| `src/app/(storefront)/login/page.tsx` | Wrap in `<Suspense>` (required for `useSearchParams`) |
| `src/app/(storefront)/register/page.tsx` | Wrap in `<Suspense>` |
| `src/features/cart/CartPageClient.tsx` | Auth guard: redirect to `/login?redirect=/cart` if not logged in |
| `src/features/wishlist/WishlistPageClient.tsx` | Auth guard: redirect to `/login?redirect=/wishlist` if not logged in |
| `src/components/shared/WishlistButton.tsx` | Auth check before toggle; redirect to `/login?redirect=<current-path>` |
| `src/features/product/ProductPageClient.tsx` | Auth check before `addToCart`; redirect to `/login?redirect=<current-path>` |

---

## Task 1: Support `?redirect=` in Login and Register pages

Login and Register currently always push to `/profile` after success. We need them to push to the `redirect` query param if present, falling back to `/profile`.

**Files:**
- Modify: `src/features/auth/LoginPageClient.tsx`
- Modify: `src/features/auth/RegisterPageClient.tsx`
- Modify: `src/app/(storefront)/login/page.tsx`
- Modify: `src/app/(storefront)/register/page.tsx`

- [ ] **Step 1: Add `useSearchParams` import and redirect logic to `LoginPageClient`**

Replace the top of `src/features/auth/LoginPageClient.tsx` — add `useSearchParams` to the `next/navigation` import and add the redirect hook call:

```typescript
'use client'

import { useState }    from 'react'
import Link             from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm }      from 'react-hook-form'
import { zodResolver }  from '@hookform/resolvers/zod'
import { Eye, EyeOff }  from 'lucide-react'
import { motion }       from 'framer-motion'
import { AuthCard }     from './AuthCard'
import { useAuthStore } from '@/store/auth'
import { useUIStore }   from '@/store/ui'
import { LoginSchema, type LoginValues } from '@/lib/schemas'
import * as services    from '@/mocks/services'

const inputBase =
  'w-full px-4 py-3 border border-aroma-border rounded-md font-sans text-[14px] ' +
  'bg-white text-aroma-text outline-none focus:border-aroma-text transition-colors'

export function LoginPageClient() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const storeLogin    = useAuthStore(s => s.login)
  const showToast     = useUIStore(s => s.showToast)
  const [showPwd, setShowPwd]   = useState(false)
  const [apiError, setApiError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginValues>({
    resolver:     zodResolver(LoginSchema),
    mode:         'onChange',
    defaultValues: { remember: false },
  })

  const onSubmit = async (data: LoginValues) => {
    setApiError('')
    try {
      const { user, token } = await services.login(data.email, data.password)
      localStorage.setItem('token', token)
      storeLogin(user)
      showToast(`Welcome back, ${user.name.split(' ')[0]}`)
      const redirect = searchParams.get('redirect') || '/profile'
      router.push(redirect)
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }
```

Leave the JSX portion of `LoginPageClient` unchanged below `onSubmit`.

- [ ] **Step 2: Add `useSearchParams` import and redirect logic to `RegisterPageClient`**

Replace the import + function opening of `src/features/auth/RegisterPageClient.tsx`:

```typescript
'use client'

import { useState }    from 'react'
import Link             from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm }      from 'react-hook-form'
import { zodResolver }  from '@hookform/resolvers/zod'
import { Eye, EyeOff, Check } from 'lucide-react'
import { motion }       from 'framer-motion'
import { AuthCard }     from './AuthCard'
import { useAuthStore } from '@/store/auth'
import { useUIStore }   from '@/store/ui'
import { RegisterSchema, type RegisterValues } from '@/lib/schemas'
import * as services    from '@/mocks/services'

const inputBase =
  'w-full px-4 py-3 border border-aroma-border rounded-md font-sans text-[14px] ' +
  'bg-white text-aroma-text outline-none focus:border-aroma-text transition-colors'

const PASSWORD_RULES = [
  { label: '8+ characters',       test: (v: string) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One number',           test: (v: string) => /\d/.test(v) },
]

export function RegisterPageClient() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const storeLogin    = useAuthStore(s => s.login)
  const showToast     = useUIStore(s => s.showToast)
  const [showPwd,  setShowPwd]  = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [apiError, setApiError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RegisterValues>({
    resolver:     zodResolver(RegisterSchema),
    mode:         'onChange',
  })

  const passwordValue = watch('password', '')

  const onSubmit = async (data: RegisterValues) => {
    setApiError('')
    try {
      const { user, token } = await services.register({
        name:                  data.name,
        email:                 data.email,
        password:              data.password,
        password_confirmation: data.confirmPassword,
      })
      localStorage.setItem('token', token)
      storeLogin(user)
      showToast('Account created — welcome to Aroma ✦')
      const redirect = searchParams.get('redirect') || '/profile'
      router.push(redirect)
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }
```

Leave the JSX portion of `RegisterPageClient` unchanged.

- [ ] **Step 3: Wrap login page in `<Suspense>` (required for `useSearchParams`)**

Replace `src/app/(storefront)/login/page.tsx` with:

```typescript
import { Suspense }         from 'react'
import { LoginPageClient }  from '@/features/auth/LoginPageClient'

export const metadata = { title: 'Sign In — Aroma' }

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageClient />
    </Suspense>
  )
}
```

- [ ] **Step 4: Check what the register page currently looks like**

```bash
cat /Users/suhaib/web_projects/aroma-full-project/aroma/src/app/\(storefront\)/register/page.tsx
```

- [ ] **Step 5: Wrap register page in `<Suspense>`**

Replace `src/app/(storefront)/register/page.tsx` with (adjust if the existing file differs):

```typescript
import { Suspense }            from 'react'
import { RegisterPageClient }  from '@/features/auth/RegisterPageClient'

export const metadata = { title: 'Create Account — Aroma' }

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterPageClient />
    </Suspense>
  )
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 7: Smoke-test redirect param manually**

```bash
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/login?redirect=/cart"
```

Expected: `200`

- [ ] **Step 8: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add src/features/auth/LoginPageClient.tsx \
        src/features/auth/RegisterPageClient.tsx \
        "src/app/(storefront)/login/page.tsx" \
        "src/app/(storefront)/register/page.tsx"
git commit -m "feat: support ?redirect= param in login and register pages"
```

---

## Task 2: Auth guard on the Cart page

When an unauthenticated user visits `/cart` (directly or via the header icon), they should be redirected to `/login?redirect=/cart`. After login they land back on `/cart`. A `ready` flag prevents false redirects during the SSR hydration window.

**Files:**
- Modify: `src/features/cart/CartPageClient.tsx`

- [ ] **Step 1: Add auth guard to `CartPageClient`**

Replace the top of `src/features/cart/CartPageClient.tsx` — add imports and the guard hooks:

```typescript
'use client'

import { useEffect, useState } from 'react'
import Link            from 'next/link'
import { useRouter }   from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus, X, ShoppingBag } from 'lucide-react'
import { SectionHeader }  from '@/components/shared/SectionHeader'
import { ProductPlaceholder } from '@/components/shared/ProductPlaceholder'
import { EmptyState }     from '@/components/shared/EmptyState'
import { useCartStore }   from '@/store/cart'
import { useAuthStore }   from '@/store/auth'
import { useUIStore }     from '@/store/ui'
import { formatPrice }    from '@/lib/formatters'

export function CartPageClient() {
  const router      = useRouter()
  const isLoggedIn  = useAuthStore(s => s.isLoggedIn)
  const [ready, setReady] = useState(false)

  const items     = useCartStore(s => s.items)
  const update    = useCartStore(s => s.updateItem)
  const remove    = useCartStore(s => s.removeItem)
  const subtotal  = useCartStore(s => s.subtotal())
  const showToast = useUIStore(s => s.showToast)

  useEffect(() => { setReady(true) }, [])

  useEffect(() => {
    if (ready && !isLoggedIn) {
      router.replace('/login?redirect=/cart')
    }
  }, [ready, isLoggedIn, router])

  if (!ready || !isLoggedIn) return null
```

Leave the `handleRemove` function and the entire JSX `return (...)` block unchanged after this.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add src/features/cart/CartPageClient.tsx
git commit -m "feat: redirect unauthenticated users from /cart to login"
```

---

## Task 3: Auth guard on the Wishlist page

Same pattern as Task 2 — unauthenticated users visiting `/wishlist` are redirected to `/login?redirect=/wishlist`.

**Files:**
- Modify: `src/features/wishlist/WishlistPageClient.tsx`

- [ ] **Step 1: Add auth guard to `WishlistPageClient`**

Replace `src/features/wishlist/WishlistPageClient.tsx` in full:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter }      from 'next/navigation'
import { Heart }           from 'lucide-react'
import { SectionHeader }   from '@/components/shared/SectionHeader'
import { ProductCard }     from '@/components/shared/ProductCard'
import { EmptyState }      from '@/components/shared/EmptyState'
import { useWishlistStore } from '@/store/wishlist'
import { useAuthStore }    from '@/store/auth'
import { PRODUCTS }        from '@/mocks/data'

export function WishlistPageClient() {
  const router      = useRouter()
  const isLoggedIn  = useAuthStore(s => s.isLoggedIn)
  const [ready, setReady] = useState(false)

  const ids      = useWishlistStore(s => s.ids)
  const products = PRODUCTS.filter(p => ids.includes(p.id))

  useEffect(() => { setReady(true) }, [])

  useEffect(() => {
    if (ready && !isLoggedIn) {
      router.replace('/login?redirect=/wishlist')
    }
  }, [ready, isLoggedIn, router])

  if (!ready || !isLoggedIn) return null

  return (
    <div className="pt-24 pb-20 px-6 md:px-12">
      <SectionHeader label="Your" title="Wishlist" />
      {products.length === 0 ? (
        <EmptyState
          Icon={Heart}
          title="Your wishlist is empty"
          subtitle="Save fragrances you love and find them here whenever you're ready."
          action="Explore Collection"
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add src/features/wishlist/WishlistPageClient.tsx
git commit -m "feat: redirect unauthenticated users from /wishlist to login"
```

---

## Task 4: Auth check in WishlistButton

When a guest clicks a heart icon (on a product card or the product detail page), instead of toggling the local store, redirect them to `/login?redirect=<current-path>` so they return after signing in.

**Files:**
- Modify: `src/components/shared/WishlistButton.tsx`

- [ ] **Step 1: Replace `WishlistButton.tsx` in full**

```typescript
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
  const saved      = ids.includes(productId)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
      return
    }
    const result = toggle(productId)
    showToast(result === 'added' ? 'Saved to wishlist ♡' : 'Removed from wishlist')
  }

  if (variant === 'block') {
    return (
      <button
        onClick={handleClick}
        aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
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
        {saved ? 'Saved to Wishlist' : 'Save to Wishlist'}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add src/components/shared/WishlistButton.tsx
git commit -m "feat: require login before toggling wishlist — redirect to login with return path"
```

---

## Task 5: Auth check in ProductPageClient add-to-cart

When a guest clicks "Add to Bag" on a product detail page, redirect to `/login?redirect=<product-path>` instead of adding to the local cart store.

**Files:**
- Modify: `src/features/product/ProductPageClient.tsx`

- [ ] **Step 1: Add `useAuthStore` and `usePathname` imports**

In `src/features/product/ProductPageClient.tsx`, the existing import block starts at line 1. Replace the `next/navigation` import line and add the auth store import:

Find this existing import:
```typescript
import { useRouter }      from 'next/navigation'
```

Replace with:
```typescript
import { useRouter, usePathname } from 'next/navigation'
```

Also add `useAuthStore` to the existing store imports. Find:
```typescript
import { useCartStore }   from '@/store/cart'
import { useUIStore }     from '@/store/ui'
```

Replace with:
```typescript
import { useCartStore }   from '@/store/cart'
import { useAuthStore }   from '@/store/auth'
import { useUIStore }     from '@/store/ui'
```

- [ ] **Step 2: Add `isLoggedIn` and `pathname` to the component body**

Inside `ProductPageClient`, find the existing hook calls:
```typescript
  const router      = useRouter()
  const showToast   = useUIStore(s => s.showToast)
  const addToCart   = useCartStore(s => s.addItem)
```

Replace with:
```typescript
  const router      = useRouter()
  const pathname    = usePathname()
  const isLoggedIn  = useAuthStore(s => s.isLoggedIn)
  const showToast   = useUIStore(s => s.showToast)
  const addToCart   = useCartStore(s => s.addItem)
```

- [ ] **Step 3: Add auth check to `handleAdd`**

Find the existing `handleAdd` function:
```typescript
  const handleAdd = () => {
    if (product.stock === 'out-of-stock') return
    addToCart({ ...product, selectedSize: size } as CartProduct, qty)
    showToast('Added to bag')
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }
```

Replace with:
```typescript
  const handleAdd = () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
      return
    }
    if (product.stock === 'out-of-stock') return
    addToCart({ ...product, selectedSize: size } as CartProduct, qty)
    showToast('Added to bag')
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add src/features/product/ProductPageClient.tsx
git commit -m "feat: require login before adding to cart — redirect to login with return path"
```

---

## Task 6: End-to-end verification

Confirm all four guarded surfaces work correctly in the running app.

**Files:** None — verification only.

- [ ] **Step 1: Confirm servers are running**

```bash
curl -s http://localhost:8000/api/health | python3 -m json.tool
# Expected: {"status": "ok"}

curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
# Expected: 200
```

If either server is down, restart:
```bash
# API
cd /Users/suhaib/web_projects/aroma-full-project/aroma-api
php artisan serve --host=127.0.0.1 --port=8000 > /tmp/api.log 2>&1 &

# Frontend
cd /Users/suhaib/web_projects/aroma-full-project/aroma
npm run dev > /tmp/next.log 2>&1 &
sleep 6
```

- [ ] **Step 2: Verify `/cart` redirects unauthenticated users**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/cart
# Expected: 200 (Next.js always renders 200; the client-side redirect happens in browser)
```

Open `http://localhost:3000/cart` in the browser while **not** logged in. You should immediately be redirected to `http://localhost:3000/login?redirect=%2Fcart`.

- [ ] **Step 3: Verify `/wishlist` redirects unauthenticated users**

Open `http://localhost:3000/wishlist` in the browser while **not** logged in. You should be redirected to `http://localhost:3000/login?redirect=%2Fwishlist`.

- [ ] **Step 4: Verify login sends you back to cart**

On the login page (arrived from `/cart`), sign in with `sarah@example.com` / `password123`. After login you should land on `/cart`, not `/profile`.

- [ ] **Step 5: Verify wishlist button guards**

Log out (visit `/profile` → sign out, or clear `aroma-auth` from localStorage). Navigate to any product page. Click the heart icon. You should be redirected to `/login?redirect=/product/<slug>`. Sign in — you should land back on the product page.

- [ ] **Step 6: Verify Add to Bag guards**

While still logged out, navigate to a product page. Click "Add to Bag". You should be redirected to `/login?redirect=/product/<slug>`. Sign in — you should land back on the product page (not `/profile`).

- [ ] **Step 7: Verify an authenticated user has no disruption**

Log in. Add a product to the bag. Visit `/cart`. Verify no redirect. Toggle the wishlist heart. Verify no redirect. All flows should work exactly as before for a logged-in user.

- [ ] **Step 8: Final commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add -A
git commit -m "chore: verify auth guards on cart, wishlist, add-to-cart flows"
```
