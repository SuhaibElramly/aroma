# Admin Dashboard Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a standalone Vue 3 + Tailwind CSS admin SPA at `aroma-admin/` that lets Aroma Shop staff manage orders, products, brands, categories, and users through the existing Laravel API.

**Architecture:** Vite + Vue 3 (Composition API `<script setup>`) app, completely separate from the customer storefront. Communicates with `aroma-api` via Axios. Sanctum token stored in `localStorage`. Pinia for state, Vue Router 4 for navigation. Design language mirrors the Aroma brand palette (`#F9F8F4` backgrounds, `#1C1917` text, `#B8966E` accent, status color system) so it feels like a sibling product, not a generic admin tool.

**Tech Stack:** Vue 3, Vite, TypeScript, Tailwind CSS v3, Pinia, Vue Router 4, Axios, Lucide-vue-next, Day.js

**API base URL:** `http://localhost:8000/api` (via `VITE_API_URL` env var)

**Admin credentials (dev):** `admin@aroma.ly` / `password`

---

## Design Tokens (use throughout — do not invent new colours)

```
Background page:   #F9F8F4   (aroma-bg)
Surface/card:      #FFFFFF   (aroma-surface)
Border:            #E7E4DF   (aroma-border)
Border light:      #F0EFEB   (aroma-border-lt)
Text primary:      #1C1917   (aroma-text)
Text muted:        #7A7570   (aroma-muted)
Text faint:        #A09890   (aroma-faint)
Accent:            #B8966E   (aroma-accent)
Accent light:      #F4EFE8   (aroma-accent-lt)

Status green text: #5A8A6A   bg: #EBF4EE
Status amber text: #9A6A20   bg: #FBF3E4
Status red text:   #8A5050   bg: #F5EDED
Status blue text:  #5068A0   bg: #EAF0F8
Status grey text:  #7A7570   bg: #F0EFEB
```

---

## File Structure

```
aroma-admin/
  index.html
  vite.config.ts
  tailwind.config.ts
  postcss.config.ts
  tsconfig.json
  package.json
  .env                          VITE_API_URL=http://localhost:8000/api

  src/
    main.ts                     App entry — mounts Vue, installs Pinia + Router
    App.vue                     Root component — <RouterView />
    style.css                   Tailwind directives + Google Fonts import + global resets

    types/
      index.ts                  All shared TypeScript types (AdminOrder, AdminProduct, …)

    api/
      client.ts                 Axios instance — baseURL from env, Authorization interceptor
      admin.ts                  All typed API call functions (one per endpoint)

    stores/
      auth.ts                   Pinia — token, user, login(), logout(), isAuthenticated

    router/
      index.ts                  Routes + beforeEach auth guard

    composables/
      useAsync.ts               Generic { data, loading, error, execute() } composable
      usePagination.ts          page ref + fetchFn wrapper, exposes { page, meta, fetch, changePage }

    components/
      layout/
        AppLayout.vue           Sidebar + Topbar shell, <RouterView /> in main
        Sidebar.vue             Nav links with active state, Aroma logo mark
        Topbar.vue              Page title + admin name + logout

      ui/
        AButton.vue             primary / secondary / danger / ghost variants
        AInput.vue              label + v-model + error slot
        ASelect.vue             label + options array + v-model + error
        ATextarea.vue           label + v-model + error
        AModal.vue              Teleport overlay + header + footer slot
        ABadge.vue              Status badge — order statuses + stock statuses
        AStatCard.vue           Icon + big number + label
        ATable.vue              thead/tbody wrapper with loading skeleton rows
        APagination.vue         Prev/Next + "Page N of M (X total)"
        AEmptyState.vue         Centred icon + heading + subtext
        AConfirmDialog.vue      "Are you sure?" modal — title + message + confirm/cancel

    views/
      LoginView.vue             Centred login card — email + password + error
      DashboardView.vue         4 stat cards + recent orders table
      OrdersView.vue            Filtered + paginated orders table
      OrderDetailView.vue       Full order — items, timeline, status update, admin note
      ProductsView.vue          Paginated products table + create/edit modal
      ProductVariantsView.vue   Manage variants (size/price/stock) for a product
      BrandsView.vue            Brands table + create/edit modal
      CategoriesView.vue        Categories table + create/edit modal
      UsersView.vue             Read-only paginated users table with search
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `aroma-admin/package.json`
- Create: `aroma-admin/vite.config.ts`
- Create: `aroma-admin/tailwind.config.ts`
- Create: `aroma-admin/postcss.config.ts`
- Create: `aroma-admin/tsconfig.json`
- Create: `aroma-admin/index.html`
- Create: `aroma-admin/src/main.ts`
- Create: `aroma-admin/src/App.vue`
- Create: `aroma-admin/src/style.css`
- Create: `aroma-admin/.env`

- [x] **Step 1: Scaffold Vite + Vue TS project**

```bash
cd /Users/suhaib/web_projects/aroma-full-project
npm create vite@latest aroma-admin -- --template vue-ts
cd aroma-admin
npm install
npm install vue-router@4 pinia axios lucide-vue-next dayjs
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

- [x] **Step 2: Configure tailwind.config.ts**

Replace the entire file:

```ts
// aroma-admin/tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        aroma: {
          bg:         '#F9F8F4',
          surface:    '#FFFFFF',
          border:     '#E7E4DF',
          'border-lt':'#F0EFEB',
          text:       '#1C1917',
          muted:      '#7A7570',
          faint:      '#A09890',
          accent:     '#B8966E',
          'accent-lt':'#F4EFE8',
        },
        status: {
          'green-text': '#5A8A6A',
          'green-bg':   '#EBF4EE',
          'amber-text': '#9A6A20',
          'amber-bg':   '#FBF3E4',
          'red-text':   '#8A5050',
          'red-bg':     '#F5EDED',
          'blue-text':  '#5068A0',
          'blue-bg':    '#EAF0F8',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.22s ease forwards',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [x] **Step 3: Create src/style.css**

```css
/* aroma-admin/src/style.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

@layer base {
  *, *::before, *::after { box-sizing: border-box; }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    background-color: #F9F8F4;
    color: #1C1917;
    font-family: 'DM Sans', system-ui, sans-serif;
    min-height: 100vh;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #D0CCC8; border-radius: 2px; }

  :focus-visible {
    outline: 2px solid #B8966E;
    outline-offset: 2px;
    border-radius: 2px;
  }
}
```

- [x] **Step 4: Create src/App.vue**

```vue
<!-- aroma-admin/src/App.vue -->
<template>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>
```

- [x] **Step 5: Create src/main.ts**

```ts
// aroma-admin/src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import './style.css'

createApp(App).use(createPinia()).use(router).mount('#app')
```

- [x] **Step 6: Create .env**

```bash
echo "VITE_API_URL=http://localhost:8000/api" > /Users/suhaib/web_projects/aroma-full-project/aroma-admin/.env
```

- [x] **Step 7: Verify dev server starts**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-admin && npm run dev
```
Expected: `VITE ready in ~300ms  ➜  Local: http://localhost:5173/`

- [x] **Step 8: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-admin
git add .
git commit -m "feat(admin): scaffold Vite + Vue 3 + Tailwind project"
```

---

## Task 2: Types

**Files:**
- Create: `aroma-admin/src/types/index.ts`

- [x] **Step 1: Create types/index.ts**

```ts
// aroma-admin/src/types/index.ts

export type OrderStatus =
  | 'placed' | 'confirmed' | 'preparing'
  | 'ready'  | 'delivered' | 'cancelled'

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export type ProductType = 'EDP' | 'EDT' | 'Parfum' | 'EDC'

// ── Pagination ────────────────────────────────────────────────────────
export interface PageMeta {
  total: number
  currentPage: number
  lastPage: number
}

// ── Auth ──────────────────────────────────────────────────────────────
export interface AdminUser {
  id: number
  name: string
  email: string
  is_admin: boolean
}

// ── Dashboard ─────────────────────────────────────────────────────────
export interface DashboardStats {
  totalOrders: number
  totalRevenue: string
  totalProducts: number
  totalUsers: number
  recentOrders: RecentOrderRow[]
}

export interface RecentOrderRow {
  id: string
  user: string
  total: string
  status: OrderStatus
  date: string
}

// ── Orders ────────────────────────────────────────────────────────────
export interface AdminOrder {
  id: string
  user: string
  userEmail: string
  total: string
  status: OrderStatus
  isPickup: boolean
  note: string
  adminNote: string | null
  date: string
  itemCount: number
  items?: AdminOrderItem[]
  timeline?: AdminTimelineEntry[]
}

export interface AdminOrderItem {
  name: string
  brand: string
  size: string
  qty: number
  unitPrice: string
}

export interface AdminTimelineEntry {
  status: string
  done: boolean
  date: string | null
}

// ── Products ──────────────────────────────────────────────────────────
export interface AdminProduct {
  id: number
  slug: string
  name: string
  nameEn: string | null
  brand: string
  brandId: string
  category: string
  categoryId: string
  type: ProductType
  isNew: boolean
  isBestseller: boolean
  isOffer: boolean
  variantCount: number
  price: string | null
}

export interface ProductVariant {
  id: number
  productId: number
  size: string
  price: string
  originalPrice: string | null
  stock: StockStatus
}

// ── Brands ────────────────────────────────────────────────────────────
export interface AdminBrand {
  id: string
  name: string
  nameEn: string | null
  origin: string | null
  tagline: string | null
  bg: string
  productCount: number
}

// ── Categories ────────────────────────────────────────────────────────
export interface AdminCategory {
  id: string
  label: string
  bg: string
  productCount: number
}

// ── Users ─────────────────────────────────────────────────────────────
export interface AdminUserRow {
  id: number
  name: string
  email: string
  phone: string
  orderCount: number
  joinedAt: string
}
```

- [x] **Step 2: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-admin
git add src/types/
git commit -m "feat(admin): add shared TypeScript types"
```

---

## Task 3: API Client & Functions

**Files:**
- Create: `aroma-admin/src/api/client.ts`
- Create: `aroma-admin/src/api/admin.ts`

- [x] **Step 1: Create api/client.ts**

```ts
// aroma-admin/src/api/client.ts
import axios from 'axios'

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  headers: { Accept: 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Expose 401 as a thrown error so auth store can react
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)
```

- [x] **Step 2: Create api/admin.ts**

```ts
// aroma-admin/src/api/admin.ts
import { client } from './client'
import type {
  AdminUser, DashboardStats, AdminOrder, AdminProduct,
  AdminBrand, AdminCategory, AdminUserRow, PageMeta, ProductVariant,
} from '../types'

// ── Auth ──────────────────────────────────────────────────────────────
export const apiLogin = (email: string, password: string) =>
  client.post<{ user: AdminUser; token: string }>('/auth/login', { email, password })

// ── Dashboard ─────────────────────────────────────────────────────────
export const apiGetStats = () =>
  client.get<DashboardStats>('/admin/stats')

// ── Orders ────────────────────────────────────────────────────────────
export const apiGetOrders = (params: { status?: string; page?: number }) =>
  client.get<{ data: AdminOrder[]; meta: PageMeta }>('/admin/orders', { params })

export const apiGetOrder = (id: string) =>
  client.get<AdminOrder>(`/admin/orders/${id}`)

export const apiUpdateOrderStatus = (id: string, status: string) =>
  client.patch<AdminOrder>(`/admin/orders/${id}/status`, { status })

export const apiAddAdminNote = (id: string, admin_note: string) =>
  client.patch<{ admin_note: string }>(`/admin/orders/${id}/note`, { admin_note })

// ── Products ──────────────────────────────────────────────────────────
export const apiGetProducts = (params: { search?: string; brand_id?: string; page?: number }) =>
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

// ── Users ─────────────────────────────────────────────────────────────
export const apiGetUsers = (params: { search?: string; page?: number }) =>
  client.get<{ data: AdminUserRow[]; meta: PageMeta }>('/admin/users', { params })
```

- [x] **Step 3: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-admin
git add src/api/
git commit -m "feat(admin): add Axios client and typed API functions"
```

---

## Task 4: Auth Store + Composables + Router

**Files:**
- Create: `aroma-admin/src/stores/auth.ts`
- Create: `aroma-admin/src/composables/useAsync.ts`
- Create: `aroma-admin/src/composables/usePagination.ts`
- Create: `aroma-admin/src/router/index.ts`

- [x] **Step 1: Create stores/auth.ts**

```ts
// aroma-admin/src/stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiLogin } from '../api/admin'
import type { AdminUser } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('admin_token'))
  const user  = ref<AdminUser | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  async function login(email: string, password: string) {
    const res = await apiLogin(email, password)
    if (!res.data.user.is_admin) throw new Error('This account does not have admin access.')
    token.value = res.data.token
    user.value  = res.data.user
    localStorage.setItem('admin_token', res.data.token)
  }

  function logout() {
    token.value = null
    user.value  = null
    localStorage.removeItem('admin_token')
  }

  return { token, user, isAuthenticated, login, logout }
})
```

- [x] **Step 2: Create composables/useAsync.ts**

```ts
// aroma-admin/src/composables/useAsync.ts
import { ref } from 'vue'

export function useAsync<T>(fn: (...args: unknown[]) => Promise<T>) {
  const data    = ref<T | null>(null)
  const loading = ref(false)
  const error   = ref<string | null>(null)

  async function execute(...args: unknown[]) {
    loading.value = true
    error.value   = null
    try {
      data.value = await fn(...args)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Something went wrong.'
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, execute }
}
```

- [x] **Step 3: Create composables/usePagination.ts**

```ts
// aroma-admin/src/composables/usePagination.ts
import { ref } from 'vue'
import type { PageMeta } from '../types'

export function usePagination<T>(
  fetchFn: (page: number) => Promise<{ data: T[]; meta: PageMeta }>,
) {
  const items   = ref<T[]>([])
  const meta    = ref<PageMeta | null>(null)
  const page    = ref(1)
  const loading = ref(false)
  const error   = ref<string | null>(null)

  async function fetch(p = page.value) {
    loading.value = true
    error.value   = null
    try {
      const res  = await fetchFn(p)
      items.value = res.data
      meta.value  = res.meta
      page.value  = p
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load.'
    } finally {
      loading.value = false
    }
  }

  function changePage(p: number) { fetch(p) }

  return { items, meta, page, loading, error, fetch, changePage }
}
```

- [x] **Step 4: Create router/index.ts**

```ts
// aroma-admin/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/',
      component: () => import('../components/layout/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '',          redirect: '/dashboard' },
        { path: 'dashboard', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
        { path: 'orders',    name: 'orders',    component: () => import('../views/OrdersView.vue') },
        { path: 'orders/:id',name: 'order-detail', component: () => import('../views/OrderDetailView.vue'), props: true },
        { path: 'products',  name: 'products',  component: () => import('../views/ProductsView.vue') },
        { path: 'products/:id/variants', name: 'product-variants', component: () => import('../views/ProductVariantsView.vue'), props: true },
        { path: 'brands',    name: 'brands',    component: () => import('../views/BrandsView.vue') },
        { path: 'categories',name: 'categories',component: () => import('../views/CategoriesView.vue') },
        { path: 'users',     name: 'users',     component: () => import('../views/UsersView.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth  && !auth.isAuthenticated) return { name: 'login' }
  if (to.meta.requiresGuest &&  auth.isAuthenticated) return { name: 'dashboard' }
})
```

- [x] **Step 5: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-admin
git add src/stores/ src/composables/ src/router/
git commit -m "feat(admin): add auth store, composables, and router"
```

---

## Task 5: Backend — Product Variants API

The existing backend has no variant management endpoints. Add them now before building the frontend that depends on them.

**Files (in `aroma-api/`):**
- Create: `app/Http/Controllers/Api/Admin/AdminProductVariantController.php`
- Modify: `routes/api.php`

- [x] **Step 1: Create AdminProductVariantController.php**

```php
<?php
// aroma-api/app/Http/Controllers/Api/Admin/AdminProductVariantController.php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;

class AdminProductVariantController extends Controller
{
    public function index(int $productId)
    {
        $product = Product::findOrFail($productId);
        return response()->json(
            $product->variants()->orderBy('size')->get()->map(fn($v) => $this->fmt($v))
        );
    }

    public function store(Request $request, int $productId)
    {
        Product::findOrFail($productId);
        $data = $request->validate([
            'size'           => 'required|integer|min:1',
            'price'          => 'required|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'stock'          => 'required|in:in_stock,low_stock,out_of_stock',
        ]);
        $variant = ProductVariant::create(array_merge($data, ['product_id' => $productId]));
        return response()->json($this->fmt($variant), 201);
    }

    public function update(Request $request, int $productId, int $variantId)
    {
        $variant = ProductVariant::where('product_id', $productId)->findOrFail($variantId);
        $data = $request->validate([
            'size'           => 'sometimes|integer|min:1',
            'price'          => 'sometimes|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'stock'          => 'sometimes|in:in_stock,low_stock,out_of_stock',
        ]);
        $variant->update($data);
        return response()->json($this->fmt($variant));
    }

    public function destroy(int $productId, int $variantId)
    {
        $variant = ProductVariant::where('product_id', $productId)->findOrFail($variantId);
        $variant->delete();
        return response()->json(null, 204);
    }

    private function fmt(ProductVariant $v): array
    {
        return [
            'id'            => $v->id,
            'productId'     => $v->product_id,
            'size'          => $v->size,
            'price'         => $v->price,
            'originalPrice' => $v->original_price,
            'stock'         => $v->stock?->value,
        ];
    }
}
```

- [x] **Step 2: Add variant routes to api.php**

Read `aroma-api/routes/api.php`. Inside the existing `middleware(['auth:sanctum', 'is_admin'])->prefix('admin')` group, after the product routes, add:

```php
use App\Http\Controllers\Api\Admin\AdminProductVariantController;

Route::get('/products/{productId}/variants',              [AdminProductVariantController::class, 'index']);
Route::post('/products/{productId}/variants',             [AdminProductVariantController::class, 'store']);
Route::put('/products/{productId}/variants/{variantId}',  [AdminProductVariantController::class, 'update']);
Route::delete('/products/{productId}/variants/{variantId}',[AdminProductVariantController::class, 'destroy']);
```

- [x] **Step 3: Verify routes**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-api && php artisan route:list --path=admin/products
```
Expected: 8 routes (4 product + 4 variant).

- [x] **Step 4: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-api
git add app/Http/Controllers/Api/Admin/AdminProductVariantController.php routes/api.php
git commit -m "feat(admin): add product variant CRUD endpoints"
```

---

## Task 6: UI Component Library

**Files:**
- Create: `aroma-admin/src/components/ui/AButton.vue`
- Create: `aroma-admin/src/components/ui/AInput.vue`
- Create: `aroma-admin/src/components/ui/ASelect.vue`
- Create: `aroma-admin/src/components/ui/ATextarea.vue`
- Create: `aroma-admin/src/components/ui/AModal.vue`
- Create: `aroma-admin/src/components/ui/ABadge.vue`
- Create: `aroma-admin/src/components/ui/AStatCard.vue`
- Create: `aroma-admin/src/components/ui/ATable.vue`
- Create: `aroma-admin/src/components/ui/APagination.vue`
- Create: `aroma-admin/src/components/ui/AEmptyState.vue`
- Create: `aroma-admin/src/components/ui/AConfirmDialog.vue`

- [x] **Step 1: Create AButton.vue**

```vue
<!-- aroma-admin/src/components/ui/AButton.vue -->
<template>
  <button
    v-bind="$attrs"
    :class="[base, variants[variant], sizes[size]]"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?:    'sm' | 'md'
  loading?: boolean
  disabled?: boolean
}>(), { variant: 'primary', size: 'md', loading: false, disabled: false })

const base = 'inline-flex items-center gap-2 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aroma-accent focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'

const variants = {
  primary:   'bg-aroma-text text-white hover:bg-aroma-text/90',
  secondary: 'bg-aroma-surface text-aroma-text border border-aroma-border hover:bg-aroma-bg',
  danger:    'bg-status-red-bg text-status-red-text border border-status-red-text/20 hover:bg-status-red-text hover:text-white',
  ghost:     'text-aroma-muted hover:bg-aroma-border-lt hover:text-aroma-text',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}
</script>
```

- [x] **Step 2: Create AInput.vue**

```vue
<!-- aroma-admin/src/components/ui/AInput.vue -->
<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" :for="uid" class="text-xs font-medium text-aroma-muted uppercase tracking-wide">
      {{ label }}
    </label>
    <input
      :id="uid"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      v-bind="$attrs"
      :class="[
        'w-full rounded-lg border px-3 py-2 text-sm text-aroma-text placeholder:text-aroma-faint',
        'bg-aroma-surface transition-colors',
        'focus:outline-none focus:border-aroma-text',
        error ? 'border-status-red-text bg-status-red-bg/30' : 'border-aroma-border',
      ]"
    />
    <p v-if="error" class="text-xs text-status-red-text">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
defineProps<{ label?: string; modelValue?: string; error?: string }>()
defineEmits<{ 'update:modelValue': [v: string] }>()
const uid = useId()
</script>
```

- [x] **Step 3: Create ASelect.vue**

```vue
<!-- aroma-admin/src/components/ui/ASelect.vue -->
<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" :for="uid" class="text-xs font-medium text-aroma-muted uppercase tracking-wide">
      {{ label }}
    </label>
    <select
      :id="uid"
      :value="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      v-bind="$attrs"
      :class="[
        'w-full rounded-lg border px-3 py-2 text-sm text-aroma-text bg-aroma-surface',
        'focus:outline-none focus:border-aroma-text transition-colors',
        error ? 'border-status-red-text' : 'border-aroma-border',
      ]"
    >
      <option v-if="placeholder" value="" disabled :selected="!modelValue">{{ placeholder }}</option>
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <p v-if="error" class="text-xs text-status-red-text">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
defineProps<{
  label?: string
  modelValue?: string
  error?: string
  placeholder?: string
  options: { value: string; label: string }[]
}>()
defineEmits<{ 'update:modelValue': [v: string] }>()
const uid = useId()
</script>
```

- [x] **Step 4: Create ATextarea.vue**

```vue
<!-- aroma-admin/src/components/ui/ATextarea.vue -->
<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" :for="uid" class="text-xs font-medium text-aroma-muted uppercase tracking-wide">
      {{ label }}
    </label>
    <textarea
      :id="uid"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      v-bind="$attrs"
      rows="3"
      :class="[
        'w-full rounded-lg border px-3 py-2 text-sm text-aroma-text placeholder:text-aroma-faint',
        'bg-aroma-surface resize-none transition-colors',
        'focus:outline-none focus:border-aroma-text',
        error ? 'border-status-red-text bg-status-red-bg/30' : 'border-aroma-border',
      ]"
    />
    <p v-if="error" class="text-xs text-status-red-text">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
defineProps<{ label?: string; modelValue?: string; error?: string }>()
defineEmits<{ 'update:modelValue': [v: string] }>()
const uid = useId()
</script>
```

- [x] **Step 5: Create AModal.vue**

```vue
<!-- aroma-admin/src/components/ui/AModal.vue -->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-aroma-text/30 backdrop-blur-[2px]" @click="$emit('close')" />
        <div class="relative z-10 w-full bg-aroma-surface rounded-xl shadow-xl flex flex-col max-h-[90vh]"
             :class="wide ? 'max-w-2xl' : 'max-w-md'">
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-aroma-border">
            <h2 class="text-sm font-semibold text-aroma-text">{{ title }}</h2>
            <button @click="$emit('close')"
                    class="text-aroma-faint hover:text-aroma-text transition-colors rounded-md p-0.5">
              <X :size="16" />
            </button>
          </div>
          <!-- Body -->
          <div class="overflow-y-auto px-5 py-4 flex-1">
            <slot />
          </div>
          <!-- Footer -->
          <div v-if="$slots.footer" class="flex justify-end gap-2 px-5 py-3 border-t border-aroma-border bg-aroma-bg rounded-b-xl">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
defineProps<{ open: boolean; title: string; wide?: boolean }>()
defineEmits<{ close: [] }>()
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
```

- [x] **Step 6: Create ABadge.vue**

```vue
<!-- aroma-admin/src/components/ui/ABadge.vue -->
<template>
  <span :class="['inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide', cls]">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ status: string }>()

const map: Record<string, { label: string; cls: string }> = {
  placed:        { label: 'Placed',           cls: 'text-aroma-muted bg-aroma-border-lt' },
  confirmed:     { label: 'Confirmed',         cls: 'text-status-blue-text bg-status-blue-bg' },
  preparing:     { label: 'Preparing',         cls: 'text-status-amber-text bg-status-amber-bg' },
  ready:         { label: 'Ready for Pickup',  cls: 'text-status-green-text bg-status-green-bg' },
  delivered:     { label: 'Delivered',         cls: 'text-status-green-text bg-status-green-bg' },
  cancelled:     { label: 'Cancelled',         cls: 'text-status-red-text bg-status-red-bg' },
  in_stock:      { label: 'In Stock',          cls: 'text-status-green-text bg-status-green-bg' },
  low_stock:     { label: 'Low Stock',         cls: 'text-status-amber-text bg-status-amber-bg' },
  out_of_stock:  { label: 'Out of Stock',      cls: 'text-status-red-text bg-status-red-bg' },
}

const entry = computed(() => map[props.status] ?? { label: props.status, cls: 'text-aroma-muted bg-aroma-border-lt' })
const label = computed(() => entry.value.label)
const cls   = computed(() => entry.value.cls)
</script>
```

- [x] **Step 7: Create AStatCard.vue**

```vue
<!-- aroma-admin/src/components/ui/AStatCard.vue -->
<template>
  <div class="bg-aroma-surface rounded-xl border border-aroma-border p-5">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs font-medium text-aroma-muted uppercase tracking-wide mb-1">{{ label }}</p>
        <p class="text-2xl font-semibold text-aroma-text">{{ value }}</p>
        <p v-if="sub" class="text-xs text-aroma-faint mt-0.5">{{ sub }}</p>
      </div>
      <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-aroma-accent-lt text-aroma-accent">
        <component :is="icon" :size="18" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
defineProps<{ label: string; value: string | number; icon: Component; sub?: string }>()
</script>
```

- [x] **Step 8: Create ATable.vue**

```vue
<!-- aroma-admin/src/components/ui/ATable.vue -->
<template>
  <div class="bg-aroma-surface rounded-xl border border-aroma-border overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-aroma-bg border-b border-aroma-border">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-3 text-left text-xs font-medium text-aroma-muted uppercase tracking-wide whitespace-nowrap"
            >{{ col.label }}</th>
            <th v-if="$slots.actions" class="px-4 py-3 text-right text-xs font-medium text-aroma-muted uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading skeleton -->
          <template v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-aroma-border-lt">
              <td v-for="col in columns" :key="col.key" class="px-4 py-3">
                <div class="h-3.5 rounded bg-aroma-border animate-pulse" :style="`width: ${50 + Math.random() * 40}%`" />
              </td>
              <td v-if="$slots.actions" class="px-4 py-3" />
            </tr>
          </template>
          <!-- Empty -->
          <tr v-else-if="!rows?.length">
            <td :colspan="columns.length + ($slots.actions ? 1 : 0)" class="px-4 py-12 text-center text-sm text-aroma-faint">
              <slot name="empty">No records found.</slot>
            </td>
          </tr>
          <!-- Rows -->
          <template v-else>
            <tr
              v-for="(row, i) in rows"
              :key="i"
              class="border-b border-aroma-border-lt last:border-0 hover:bg-aroma-bg/60 transition-colors"
              :class="onRowClick ? 'cursor-pointer' : ''"
              @click="onRowClick?.(row)"
            >
              <td v-for="col in columns" :key="col.key" class="px-4 py-3 text-aroma-text">
                <slot :name="`cell-${col.key}`" :row="row" :value="(row as Record<string, unknown>)[col.key]">
                  {{ (row as Record<string, unknown>)[col.key] }}
                </slot>
              </td>
              <td v-if="$slots.actions" class="px-4 py-3 text-right">
                <slot name="actions" :row="row" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  columns: { key: string; label: string }[]
  rows?: unknown[]
  loading?: boolean
  onRowClick?: (row: unknown) => void
}>()
</script>
```

- [x] **Step 9: Create APagination.vue**

```vue
<!-- aroma-admin/src/components/ui/APagination.vue -->
<template>
  <div v-if="meta && meta.lastPage > 1"
       class="flex items-center justify-between pt-4 text-xs text-aroma-muted">
    <span>Page {{ meta.currentPage }} of {{ meta.lastPage }} &nbsp;·&nbsp; {{ meta.total }} total</span>
    <div class="flex gap-1.5">
      <button
        @click="$emit('change', meta!.currentPage - 1)"
        :disabled="meta.currentPage <= 1"
        class="rounded-lg border border-aroma-border px-3 py-1.5 text-xs hover:bg-aroma-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >← Prev</button>
      <button
        @click="$emit('change', meta!.currentPage + 1)"
        :disabled="meta.currentPage >= meta.lastPage"
        class="rounded-lg border border-aroma-border px-3 py-1.5 text-xs hover:bg-aroma-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >Next →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PageMeta } from '../../types'
defineProps<{ meta: PageMeta | null }>()
defineEmits<{ change: [page: number] }>()
</script>
```

- [x] **Step 10: Create AEmptyState.vue**

```vue
<!-- aroma-admin/src/components/ui/AEmptyState.vue -->
<template>
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-aroma-border-lt text-aroma-faint mb-3">
      <component :is="icon" :size="22" />
    </div>
    <p class="text-sm font-medium text-aroma-text">{{ heading }}</p>
    <p v-if="sub" class="text-xs text-aroma-faint mt-1">{{ sub }}</p>
    <div v-if="$slots.action" class="mt-4"><slot name="action" /></div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
defineProps<{ icon: Component; heading: string; sub?: string }>()
</script>
```

- [x] **Step 11: Create AConfirmDialog.vue**

```vue
<!-- aroma-admin/src/components/ui/AConfirmDialog.vue -->
<template>
  <AModal :open="open" :title="title" @close="$emit('cancel')">
    <p class="text-sm text-aroma-muted">{{ message }}</p>
    <template #footer>
      <AButton variant="secondary" size="sm" @click="$emit('cancel')">Cancel</AButton>
      <AButton variant="danger"    size="sm" :loading="loading" @click="$emit('confirm')">
        {{ confirmLabel }}
      </AButton>
    </template>
  </AModal>
</template>

<script setup lang="ts">
import AModal from './AModal.vue'
import AButton from './AButton.vue'

withDefaults(defineProps<{
  open: boolean
  title?: string
  message?: string
  confirmLabel?: string
  loading?: boolean
}>(), {
  title: 'Are you sure?',
  message: 'This action cannot be undone.',
  confirmLabel: 'Delete',
  loading: false,
})
defineEmits<{ confirm: []; cancel: [] }>()
</script>
```

- [x] **Step 12: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-admin
git add src/components/ui/
git commit -m "feat(admin): add UI component library (AButton, AInput, AModal, ABadge, etc.)"
```

---

## Task 7: App Layout — Sidebar + Topbar

**Files:**
- Create: `aroma-admin/src/components/layout/Sidebar.vue`
- Create: `aroma-admin/src/components/layout/Topbar.vue`
- Create: `aroma-admin/src/components/layout/AppLayout.vue`

- [x] **Step 1: Create Sidebar.vue**

```vue
<!-- aroma-admin/src/components/layout/Sidebar.vue -->
<template>
  <aside class="flex h-screen w-56 flex-col bg-aroma-surface border-r border-aroma-border shrink-0">
    <!-- Logo -->
    <div class="flex items-center gap-2.5 px-4 py-5 border-b border-aroma-border">
      <div class="h-7 w-7 rounded-lg bg-aroma-text flex items-center justify-center">
        <span class="text-[10px] font-bold text-white tracking-wider">AR</span>
      </div>
      <div>
        <p class="text-xs font-semibold text-aroma-text leading-none">Aroma Admin</p>
        <p class="text-[10px] text-aroma-faint mt-0.5">Management Console</p>
      </div>
    </div>

    <!-- Nav -->
    <nav class="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        custom
        v-slot="{ navigate, isActive }"
      >
        <button
          @click="navigate"
          :class="[
            'w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all text-left',
            isActive
              ? 'bg-aroma-text text-white'
              : 'text-aroma-muted hover:bg-aroma-bg hover:text-aroma-text',
          ]"
        >
          <component :is="item.icon" :size="15" />
          {{ item.label }}
        </button>
      </RouterLink>
    </nav>

    <!-- Footer -->
    <div class="px-4 py-3 border-t border-aroma-border">
      <p class="text-[10px] text-aroma-faint">aromashop.ly &nbsp;·&nbsp; Benghazi</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { LayoutDashboard, ShoppingBag, Package, Tag, Grid3X3, Users } from 'lucide-vue-next'

const navItems = [
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/orders',     label: 'Orders',     icon: ShoppingBag },
  { to: '/products',   label: 'Products',   icon: Package },
  { to: '/brands',     label: 'Brands',     icon: Tag },
  { to: '/categories', label: 'Categories', icon: Grid3X3 },
  { to: '/users',      label: 'Users',      icon: Users },
]
</script>
```

- [x] **Step 2: Create Topbar.vue**

```vue
<!-- aroma-admin/src/components/layout/Topbar.vue -->
<template>
  <header class="flex h-12 items-center justify-between border-b border-aroma-border bg-aroma-surface px-5 shrink-0">
    <h1 class="text-xs font-semibold text-aroma-text uppercase tracking-widest">{{ pageTitle }}</h1>
    <div class="flex items-center gap-3">
      <div class="text-right">
        <p class="text-xs font-medium text-aroma-text leading-none">{{ auth.user?.name ?? 'Admin' }}</p>
        <p class="text-[10px] text-aroma-faint mt-0.5">{{ auth.user?.email }}</p>
      </div>
      <button
        @click="handleLogout"
        class="flex items-center gap-1.5 rounded-lg border border-aroma-border px-2.5 py-1.5 text-xs text-aroma-muted hover:bg-aroma-bg hover:text-aroma-text transition-colors"
      >
        <LogOut :size="12" />
        Logout
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LogOut } from 'lucide-vue-next'
import { useAuthStore } from '../../stores/auth'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

const titles: Record<string, string> = {
  dashboard:        'Dashboard',
  orders:           'Orders',
  'order-detail':   'Order Detail',
  products:         'Products',
  'product-variants': 'Product Variants',
  brands:           'Brands',
  categories:       'Categories',
  users:            'Users',
}

const pageTitle = computed(() => titles[route.name as string] ?? 'Admin')

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>
```

- [x] **Step 3: Create AppLayout.vue**

```vue
<!-- aroma-admin/src/components/layout/AppLayout.vue -->
<template>
  <div class="flex h-screen overflow-hidden bg-aroma-bg">
    <Sidebar />
    <div class="flex flex-1 flex-col overflow-hidden">
      <Topbar />
      <main class="flex-1 overflow-y-auto p-5">
        <div class="animate-fade-up">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import Sidebar from './Sidebar.vue'
import Topbar from './Topbar.vue'
</script>
```

- [x] **Step 4: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-admin
git add src/components/layout/
git commit -m "feat(admin): add app layout with sidebar and topbar"
```

---

## Task 8: Login View

**Files:**
- Create: `aroma-admin/src/views/LoginView.vue`

- [x] **Step 1: Create LoginView.vue**

```vue
<!-- aroma-admin/src/views/LoginView.vue -->
<template>
  <div class="flex min-h-screen items-center justify-center bg-aroma-bg px-4">
    <div class="w-full max-w-sm">
      <!-- Brand mark -->
      <div class="mb-8 text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-aroma-text shadow-sm">
          <span class="text-sm font-bold text-white tracking-widest">AR</span>
        </div>
        <h1 class="text-lg font-semibold text-aroma-text">Aroma Admin</h1>
        <p class="mt-1 text-xs text-aroma-faint">Sign in to manage the store</p>
      </div>

      <!-- Card -->
      <div class="rounded-2xl bg-aroma-surface border border-aroma-border p-6 shadow-sm">
        <form @submit.prevent="handleLogin" class="space-y-4" novalidate>
          <AInput
            v-model="email"
            label="Email"
            type="email"
            placeholder="admin@aroma.ly"
            autocomplete="email"
            :error="errors.email"
          />
          <AInput
            v-model="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            :error="errors.password"
          />
          <div v-if="errors.general"
               class="rounded-lg bg-status-red-bg border border-status-red-text/20 px-3 py-2 text-xs text-status-red-text">
            {{ errors.general }}
          </div>
          <AButton type="submit" class="w-full justify-center mt-2" :loading="loading">
            Sign in
          </AButton>
        </form>
      </div>

      <p class="mt-5 text-center text-[10px] text-aroma-faint">
        Aroma Shop · Benghazi, Libya
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AInput from '../components/ui/AInput.vue'
import AButton from '../components/ui/AButton.vue'

const router  = useRouter()
const auth    = useAuthStore()
const email   = ref('')
const password= ref('')
const loading = ref(false)
const errors  = ref<Record<string, string>>({})

async function handleLogin() {
  errors.value = {}
  if (!email.value)    { errors.value.email    = 'Email is required';    return }
  if (!password.value) { errors.value.password = 'Password is required'; return }

  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push({ name: 'dashboard' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Login failed.'
    errors.value.general = msg.includes('admin') ? msg : 'Invalid email or password.'
  } finally {
    loading.value = false
  }
}
</script>
```

- [x] **Step 2: Manual test**

```bash
# Terminal 1
cd /Users/suhaib/web_projects/aroma-full-project/aroma-api && php artisan serve

# Terminal 2
cd /Users/suhaib/web_projects/aroma-full-project/aroma-admin && npm run dev
```

Open `http://localhost:5173/login`. Log in with `admin@aroma.ly` / `password`. Should redirect to `/dashboard` (blank page for now is fine).

- [x] **Step 3: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-admin
git add src/views/LoginView.vue
git commit -m "feat(admin): add login view"
```

---

## Task 9: Dashboard View

**Files:**
- Create: `aroma-admin/src/views/DashboardView.vue`

- [x] **Step 1: Create DashboardView.vue**

```vue
<!-- aroma-admin/src/views/DashboardView.vue -->
<template>
  <div class="space-y-5">
    <!-- Stat cards -->
    <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <AStatCard
        label="Total Orders"
        :value="stats?.totalOrders ?? '—'"
        :icon="ShoppingBag"
      />
      <AStatCard
        label="Revenue"
        :value="stats ? `${Number(stats.totalRevenue).toFixed(0)} LYD` : '—'"
        :icon="TrendingUp"
        sub="Excluding cancelled"
      />
      <AStatCard
        label="Products"
        :value="stats?.totalProducts ?? '—'"
        :icon="Package"
      />
      <AStatCard
        label="Customers"
        :value="stats?.totalUsers ?? '—'"
        :icon="Users"
      />
    </div>

    <!-- Recent orders -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xs font-semibold text-aroma-muted uppercase tracking-wide">Recent Orders</h2>
        <RouterLink to="/orders" class="text-xs text-aroma-accent hover:underline">View all →</RouterLink>
      </div>
      <ATable
        :columns="cols"
        :rows="stats?.recentOrders"
        :loading="loading"
        :on-row-click="(row) => router.push({ name: 'order-detail', params: { id: (row as RecentOrderRow).id } })"
      >
        <template #cell-status="{ value }">
          <ABadge :status="value as string" />
        </template>
        <template #cell-total="{ value }">
          {{ Number(value).toFixed(2) }} LYD
        </template>
        <template #empty>
          <AEmptyState :icon="ShoppingBag" heading="No orders yet" />
        </template>
      </ATable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ShoppingBag, TrendingUp, Package, Users } from 'lucide-vue-next'
import { apiGetStats } from '../api/admin'
import type { DashboardStats, RecentOrderRow } from '../types'
import AStatCard   from '../components/ui/AStatCard.vue'
import ATable      from '../components/ui/ATable.vue'
import ABadge      from '../components/ui/ABadge.vue'
import AEmptyState from '../components/ui/AEmptyState.vue'

const router  = useRouter()
const stats   = ref<DashboardStats | null>(null)
const loading = ref(true)

const cols = [
  { key: 'id',     label: 'Order ID' },
  { key: 'user',   label: 'Customer' },
  { key: 'total',  label: 'Total' },
  { key: 'status', label: 'Status' },
  { key: 'date',   label: 'Date' },
]

onMounted(async () => {
  try {
    const res = await apiGetStats()
    stats.value = res.data
  } finally {
    loading.value = false
  }
})
</script>
```

- [x] **Step 2: Verify in browser**

Navigate to `/dashboard`. Expect 4 stat cards + recent orders table.

- [x] **Step 3: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-admin
git add src/views/DashboardView.vue
git commit -m "feat(admin): add dashboard view"
```

---

## Task 10: Orders View

**Files:**
- Create: `aroma-admin/src/views/OrdersView.vue`

- [x] **Step 1: Create OrdersView.vue**

```vue
<!-- aroma-admin/src/views/OrdersView.vue -->
<template>
  <div class="space-y-4">
    <!-- Filter bar -->
    <div class="flex items-center gap-3">
      <div class="flex gap-1.5 flex-wrap">
        <button
          v-for="opt in statusOptions"
          :key="opt.value"
          @click="setStatus(opt.value)"
          :class="[
            'rounded-full px-3 py-1 text-xs font-medium border transition-all',
            activeStatus === opt.value
              ? 'bg-aroma-text text-white border-aroma-text'
              : 'bg-aroma-surface text-aroma-muted border-aroma-border hover:border-aroma-text hover:text-aroma-text',
          ]"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Table -->
    <ATable
      :columns="cols"
      :rows="items"
      :loading="loading"
      :on-row-click="(row) => router.push({ name: 'order-detail', params: { id: (row as AdminOrder).id } })"
    >
      <template #cell-id="{ value }">
        <span class="font-mono text-[11px] text-aroma-muted">{{ value }}</span>
      </template>
      <template #cell-status="{ value }">
        <ABadge :status="value as string" />
      </template>
      <template #cell-total="{ value }">
        {{ Number(value).toFixed(2) }} LYD
      </template>
      <template #cell-isPickup="{ value }">
        <span :class="['text-[11px] rounded-full px-2 py-0.5', value ? 'bg-status-blue-bg text-status-blue-text' : 'bg-aroma-border-lt text-aroma-muted']">
          {{ value ? 'Pickup' : 'Delivery' }}
        </span>
      </template>
      <template #empty>
        <AEmptyState :icon="ShoppingBag" heading="No orders found" sub="Try a different status filter" />
      </template>
    </ATable>

    <APagination :meta="meta" @change="changePage" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ShoppingBag } from 'lucide-vue-next'
import { apiGetOrders } from '../api/admin'
import type { AdminOrder } from '../types'
import { usePagination } from '../composables/usePagination'
import ATable      from '../components/ui/ATable.vue'
import ABadge      from '../components/ui/ABadge.vue'
import APagination from '../components/ui/APagination.vue'
import AEmptyState from '../components/ui/AEmptyState.vue'

const router       = useRouter()
const activeStatus = ref('')

const statusOptions = [
  { value: '',          label: 'All' },
  { value: 'placed',    label: 'Placed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready',     label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const cols = [
  { key: 'id',        label: 'Order ID' },
  { key: 'user',      label: 'Customer' },
  { key: 'itemCount', label: 'Items' },
  { key: 'total',     label: 'Total' },
  { key: 'status',    label: 'Status' },
  { key: 'isPickup',  label: 'Type' },
  { key: 'date',      label: 'Date' },
]

const { items, meta, loading, fetch, changePage } = usePagination((page) =>
  apiGetOrders({ status: activeStatus.value || undefined, page }).then((r) => r.data),
)

function setStatus(s: string) {
  activeStatus.value = s
  fetch(1)
}

onMounted(() => fetch(1))
</script>
```

- [x] **Step 2: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-admin
git add src/views/OrdersView.vue
git commit -m "feat(admin): add orders list view with status filter"
```

---

## Task 11: Order Detail View

**Files:**
- Create: `aroma-admin/src/views/OrderDetailView.vue`

- [x] **Step 1: Create OrderDetailView.vue**

```vue
<!-- aroma-admin/src/views/OrderDetailView.vue -->
<template>
  <div v-if="loading" class="space-y-4">
    <div v-for="i in 3" :key="i" class="h-24 rounded-xl bg-aroma-surface border border-aroma-border animate-pulse" />
  </div>

  <div v-else-if="order" class="max-w-2xl space-y-4">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <p class="font-mono text-xs text-aroma-faint mb-0.5">{{ order.id }}</p>
        <h2 class="text-base font-semibold text-aroma-text">{{ order.user }}</h2>
        <p class="text-xs text-aroma-muted">{{ order.userEmail }}</p>
      </div>
      <ABadge :status="order.status" />
    </div>

    <!-- Meta card -->
    <div class="bg-aroma-surface rounded-xl border border-aroma-border p-4 grid grid-cols-2 gap-3 text-xs">
      <div><p class="text-aroma-faint mb-0.5">Date</p><p class="font-medium">{{ order.date }}</p></div>
      <div><p class="text-aroma-faint mb-0.5">Total</p><p class="font-medium">{{ Number(order.total).toFixed(2) }} LYD</p></div>
      <div><p class="text-aroma-faint mb-0.5">Delivery type</p><p class="font-medium">{{ order.isPickup ? 'Pickup' : 'Delivery' }}</p></div>
      <div><p class="text-aroma-faint mb-0.5">Items</p><p class="font-medium">{{ order.items?.length ?? order.itemCount }}</p></div>
      <div v-if="order.note" class="col-span-2">
        <p class="text-aroma-faint mb-0.5">Customer note</p>
        <p class="font-medium">{{ order.note }}</p>
      </div>
    </div>

    <!-- Items -->
    <div class="bg-aroma-surface rounded-xl border border-aroma-border overflow-hidden">
      <p class="text-xs font-semibold text-aroma-muted uppercase tracking-wide px-4 py-3 border-b border-aroma-border">Items</p>
      <table class="w-full text-xs">
        <thead class="bg-aroma-bg text-left text-aroma-faint">
          <tr>
            <th class="px-4 py-2">Product</th>
            <th class="px-4 py-2">Brand</th>
            <th class="px-4 py-2">Size</th>
            <th class="px-4 py-2">Qty</th>
            <th class="px-4 py-2 text-right">Price</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-aroma-border-lt">
          <tr v-for="item in order.items" :key="`${item.name}-${item.size}`">
            <td class="px-4 py-2.5 font-medium text-aroma-text">{{ item.name }}</td>
            <td class="px-4 py-2.5 text-aroma-muted">{{ item.brand }}</td>
            <td class="px-4 py-2.5">{{ item.size }} ml</td>
            <td class="px-4 py-2.5">× {{ item.qty }}</td>
            <td class="px-4 py-2.5 text-right font-medium">{{ Number(item.unitPrice).toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Timeline -->
    <div class="bg-aroma-surface rounded-xl border border-aroma-border p-4">
      <p class="text-xs font-semibold text-aroma-muted uppercase tracking-wide mb-3">Timeline</p>
      <div class="flex flex-col gap-2">
        <div v-for="step in order.timeline" :key="step.status" class="flex items-center gap-3 text-xs">
          <div :class="['h-2 w-2 rounded-full shrink-0', step.done ? 'bg-status-green-text' : 'bg-aroma-border']" />
          <span :class="step.done ? 'text-aroma-text font-medium' : 'text-aroma-faint'">{{ step.status }}</span>
          <span v-if="step.date" class="ml-auto text-aroma-faint">{{ step.date }}</span>
        </div>
      </div>
    </div>

    <!-- Admin actions -->
    <div class="bg-aroma-surface rounded-xl border border-aroma-border p-4 space-y-4">
      <p class="text-xs font-semibold text-aroma-muted uppercase tracking-wide">Admin Actions</p>

      <!-- Status update -->
      <div class="flex gap-2 items-end">
        <ASelect
          v-model="newStatus"
          label="Update Status"
          placeholder="Choose a status…"
          :options="statusOptions"
          class="flex-1"
        />
        <AButton size="sm" @click="handleStatusUpdate" :loading="updatingStatus" :disabled="!newStatus">
          Update
        </AButton>
      </div>

      <!-- Admin note -->
      <div class="flex gap-2 items-end">
        <ATextarea v-model="adminNote" label="Admin Note" placeholder="Internal note visible to staff only…" class="flex-1" />
        <AButton size="sm" variant="secondary" @click="handleSaveNote" :loading="savingNote" :disabled="!adminNote">
          Save
        </AButton>
      </div>

      <div v-if="order.adminNote" class="rounded-lg bg-aroma-bg border border-aroma-border px-3 py-2 text-xs text-aroma-text">
        <span class="text-aroma-faint font-medium">Saved note: </span>{{ order.adminNote }}
      </div>
    </div>
  </div>

  <div v-else class="text-sm text-aroma-faint text-center py-16">Order not found.</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiGetOrder, apiUpdateOrderStatus, apiAddAdminNote } from '../api/admin'
import type { AdminOrder } from '../types'
import ABadge    from '../components/ui/ABadge.vue'
import ASelect   from '../components/ui/ASelect.vue'
import ATextarea from '../components/ui/ATextarea.vue'
import AButton   from '../components/ui/AButton.vue'

const props = defineProps<{ id: string }>()

const order         = ref<AdminOrder | null>(null)
const loading       = ref(true)
const newStatus     = ref('')
const adminNote     = ref('')
const updatingStatus= ref(false)
const savingNote    = ref(false)

const statusOptions = [
  { value: 'placed',    label: 'Placed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready',     label: 'Ready for Pickup' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

onMounted(async () => {
  try {
    const res   = await apiGetOrder(props.id)
    order.value = res.data
    adminNote.value = order.value.adminNote ?? ''
  } finally {
    loading.value = false
  }
})

async function handleStatusUpdate() {
  if (!newStatus.value || !order.value) return
  updatingStatus.value = true
  try {
    const res   = await apiUpdateOrderStatus(order.value.id, newStatus.value)
    order.value = res.data
    newStatus.value = ''
  } finally {
    updatingStatus.value = false
  }
}

async function handleSaveNote() {
  if (!adminNote.value || !order.value) return
  savingNote.value = true
  try {
    await apiAddAdminNote(order.value.id, adminNote.value)
    if (order.value) order.value.adminNote = adminNote.value
  } finally {
    savingNote.value = false
  }
}
</script>
```

- [x] **Step 2: Test manually**

Click an order in `/orders`. Verify: meta card, items table, timeline, status update, admin note.

- [x] **Step 3: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-admin
git add src/views/OrderDetailView.vue
git commit -m "feat(admin): add order detail view with status update and admin note"
```

---

## Task 12: Products View + Product Variants View

**Files:**
- Create: `aroma-admin/src/views/ProductsView.vue`
- Create: `aroma-admin/src/views/ProductVariantsView.vue`

- [x] **Step 1: Create ProductsView.vue**

```vue
<!-- aroma-admin/src/views/ProductsView.vue -->
<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex gap-2 flex-1">
        <AInput v-model="search" placeholder="Search products…" class="w-56" @input="debouncedFetch" />
      </div>
      <AButton @click="openCreate" size="sm">
        <Plus :size="14" /> Add Product
      </AButton>
    </div>

    <ATable :columns="cols" :rows="items" :loading="loading">
      <template #cell-name="{ row }">
        <div>
          <p class="font-medium text-aroma-text text-xs">{{ (row as AdminProduct).name }}</p>
          <p v-if="(row as AdminProduct).nameEn" class="text-[10px] text-aroma-faint">{{ (row as AdminProduct).nameEn }}</p>
        </div>
      </template>
      <template #cell-type="{ value }">
        <span class="text-[11px] rounded-full px-2 py-0.5 bg-aroma-accent-lt text-aroma-accent font-medium">{{ value }}</span>
      </template>
      <template #cell-price="{ value }">
        <span v-if="value">{{ Number(value).toFixed(2) }} LYD</span>
        <span v-else class="text-aroma-faint">No variants</span>
      </template>
      <template #cell-isNew="{ value }"><span v-if="value" class="text-[10px] text-status-blue-text bg-status-blue-bg rounded-full px-2 py-0.5">New</span></template>
      <template #actions="{ row }">
        <div class="flex gap-1.5 justify-end">
          <RouterLink :to="`/products/${(row as AdminProduct).id}/variants`">
            <AButton size="sm" variant="ghost">Variants ({{ (row as AdminProduct).variantCount }})</AButton>
          </RouterLink>
          <AButton size="sm" variant="ghost" @click.stop="openEdit(row as AdminProduct)">Edit</AButton>
          <AButton size="sm" variant="danger" @click.stop="confirmDelete(row as AdminProduct)">Delete</AButton>
        </div>
      </template>
      <template #empty>
        <AEmptyState :icon="Package" heading="No products" sub="Add your first product to get started">
          <template #action><AButton size="sm" @click="openCreate"><Plus :size="14" /> Add Product</AButton></template>
        </AEmptyState>
      </template>
    </ATable>

    <APagination :meta="meta" @change="changePage" />

    <!-- Create / Edit modal -->
    <AModal :open="modalOpen" :title="editing ? 'Edit Product' : 'Add Product'" @close="modalOpen = false">
      <form class="space-y-3" @submit.prevent>
        <div class="grid grid-cols-2 gap-3">
          <AInput v-model="form.name"    label="Name (Arabic)" :error="formErrors.name" required />
          <AInput v-model="form.name_en" label="Name (English)" />
        </div>
        <AInput v-model="form.slug" label="Slug (URL-safe)" :disabled="!!editing" :error="formErrors.slug" />
        <div class="grid grid-cols-2 gap-3">
          <ASelect v-model="form.brand_id"    label="Brand"    :options="brandOptions"    placeholder="Choose brand…"    :error="formErrors.brand_id" />
          <ASelect v-model="form.category_id" label="Category" :options="categoryOptions" placeholder="Choose category…" :error="formErrors.category_id" />
        </div>
        <ASelect v-model="form.type" label="Type" :options="typeOptions" placeholder="Choose type…" :error="formErrors.type" />
        <ATextarea v-model="form.description" label="Description" />
        <div class="grid grid-cols-2 gap-3">
          <AInput v-model="form.placeholder_bg"  label="Placeholder BG color"  placeholder="#F2E8E5" />
          <AInput v-model="form.placeholder_dot" label="Placeholder dot color" placeholder="#C9A0A0" />
        </div>
        <div class="flex gap-4 text-xs text-aroma-text pt-1">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="form.is_new" class="rounded" /> New arrival
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="form.is_bestseller" class="rounded" /> Bestseller
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="form.is_offer" class="rounded" /> On offer
          </label>
        </div>
        <p v-if="formErrors.general" class="text-xs text-status-red-text">{{ formErrors.general }}</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="modalOpen = false">Cancel</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">{{ editing ? 'Save Changes' : 'Add Product' }}</AButton>
      </template>
    </AModal>

    <!-- Delete confirmation -->
    <AConfirmDialog
      :open="!!deletingProduct"
      title="Delete product?"
      :message="`Delete &quot;${deletingProduct?.name}&quot;? This cannot be undone.`"
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="deletingProduct = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Package } from 'lucide-vue-next'
import { usePagination } from '../composables/usePagination'
import {
  apiGetProducts, apiCreateProduct, apiUpdateProduct, apiDeleteProduct,
  apiGetBrands, apiGetCategories,
} from '../api/admin'
import type { AdminProduct, AdminBrand, AdminCategory } from '../types'
import ATable          from '../components/ui/ATable.vue'
import AButton         from '../components/ui/AButton.vue'
import AInput          from '../components/ui/AInput.vue'
import ASelect         from '../components/ui/ASelect.vue'
import ATextarea       from '../components/ui/ATextarea.vue'
import AModal          from '../components/ui/AModal.vue'
import APagination     from '../components/ui/APagination.vue'
import AEmptyState     from '../components/ui/AEmptyState.vue'
import AConfirmDialog  from '../components/ui/AConfirmDialog.vue'

const search  = ref('')
const brands  = ref<AdminBrand[]>([])
const cats    = ref<AdminCategory[]>([])
const modalOpen       = ref(false)
const editing         = ref<AdminProduct | null>(null)
const saving          = ref(false)
const deletingProduct = ref<AdminProduct | null>(null)
const deleting        = ref(false)
const formErrors      = ref<Record<string,string>>({})

const emptyForm = () => ({
  slug: '', name: '', name_en: '', brand_id: '', category_id: '',
  type: '', description: '', placeholder_bg: '', placeholder_dot: '',
  is_new: false, is_bestseller: false, is_offer: false,
})
const form = ref(emptyForm())

const typeOptions     = ['EDP','EDT','Parfum','EDC'].map(v => ({ value: v, label: v }))
const brandOptions    = computed(() => brands.value.map(b => ({ value: b.id, label: b.name })))
const categoryOptions = computed(() => cats.value.map(c => ({ value: c.id, label: c.label })))

const cols = [
  { key: 'name',        label: 'Name' },
  { key: 'brand',       label: 'Brand' },
  { key: 'category',    label: 'Category' },
  { key: 'type',        label: 'Type' },
  { key: 'price',       label: 'Price' },
  { key: 'isNew',       label: 'Flags' },
  { key: 'variantCount',label: 'Variants' },
]

const { items, meta, loading, fetch, changePage } = usePagination((page) =>
  apiGetProducts({ search: search.value || undefined, page }).then(r => r.data),
)

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetch(1), 350)
}

function openCreate() {
  editing.value = null
  form.value = emptyForm()
  formErrors.value = {}
  modalOpen.value = true
}

function openEdit(p: AdminProduct) {
  editing.value = p
  form.value = {
    slug: p.slug, name: p.name, name_en: p.nameEn ?? '',
    brand_id: p.brandId, category_id: p.categoryId,
    type: p.type, description: '', placeholder_bg: '', placeholder_dot: '',
    is_new: p.isNew, is_bestseller: p.isBestseller, is_offer: p.isOffer,
  }
  formErrors.value = {}
  modalOpen.value = true
}

async function handleSave() {
  formErrors.value = {}
  if (!form.value.name)        { formErrors.value.name = 'Name is required'; return }
  if (!form.value.slug && !editing.value)  { formErrors.value.slug = 'Slug is required'; return }
  if (!form.value.brand_id)    { formErrors.value.brand_id = 'Select a brand'; return }
  if (!form.value.category_id) { formErrors.value.category_id = 'Select a category'; return }
  if (!form.value.type)        { formErrors.value.type = 'Select a type'; return }

  saving.value = true
  try {
    if (editing.value) {
      await apiUpdateProduct(editing.value.id, form.value)
    } else {
      await apiCreateProduct(form.value)
    }
    modalOpen.value = false
    fetch(1)
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : 'Save failed.'
  } finally {
    saving.value = false
  }
}

function confirmDelete(p: AdminProduct) { deletingProduct.value = p }

async function handleDelete() {
  if (!deletingProduct.value) return
  deleting.value = true
  try {
    await apiDeleteProduct(deletingProduct.value.id)
    deletingProduct.value = null
    fetch(1)
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  fetch(1)
  const [b, c] = await Promise.all([apiGetBrands(), apiGetCategories()])
  brands.value = b.data
  cats.value   = c.data
})
</script>
```

- [x] **Step 2: Create ProductVariantsView.vue**

```vue
<!-- aroma-admin/src/views/ProductVariantsView.vue -->
<template>
  <div class="max-w-xl space-y-4">
    <div class="flex items-center gap-3">
      <RouterLink to="/products" class="text-xs text-aroma-faint hover:text-aroma-text">← Products</RouterLink>
      <span class="text-aroma-border">/</span>
      <span class="text-xs text-aroma-text font-medium">Variants</span>
    </div>

    <div class="flex justify-end">
      <AButton size="sm" @click="openCreate"><Plus :size="14" /> Add Variant</AButton>
    </div>

    <ATable :columns="cols" :rows="variants" :loading="loading">
      <template #cell-stock="{ value }">
        <ABadge :status="value as string" />
      </template>
      <template #cell-price="{ value }">{{ Number(value).toFixed(2) }} LYD</template>
      <template #cell-originalPrice="{ value }">
        <span v-if="value">{{ Number(value).toFixed(2) }} LYD</span>
        <span v-else class="text-aroma-faint">—</span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-1.5 justify-end">
          <AButton size="sm" variant="ghost" @click.stop="openEdit(row as ProductVariant)">Edit</AButton>
          <AButton size="sm" variant="danger" @click.stop="confirmDelete(row as ProductVariant)">Delete</AButton>
        </div>
      </template>
      <template #empty>
        <AEmptyState :icon="Package" heading="No variants" sub="Add size/price variants for this product" />
      </template>
    </ATable>

    <!-- Create / Edit modal -->
    <AModal :open="modalOpen" :title="editing ? 'Edit Variant' : 'Add Variant'" @close="modalOpen = false">
      <form class="space-y-3" @submit.prevent>
        <AInput v-model="form.size"           label="Size (ml)" type="number" min="1" :error="formErrors.size" />
        <AInput v-model="form.price"          label="Price (LYD)" type="number" step="0.01" :error="formErrors.price" />
        <AInput v-model="form.original_price" label="Original price (LYD, optional)" type="number" step="0.01" />
        <ASelect v-model="form.stock" label="Stock status" :options="stockOptions" :error="formErrors.stock" />
        <p v-if="formErrors.general" class="text-xs text-status-red-text">{{ formErrors.general }}</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="modalOpen = false">Cancel</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">{{ editing ? 'Save' : 'Add' }}</AButton>
      </template>
    </AModal>

    <AConfirmDialog
      :open="!!deletingVariant"
      title="Delete variant?"
      message="This size/price option will be removed from the product."
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="deletingVariant = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Package } from 'lucide-vue-next'
import {
  apiGetVariants, apiCreateVariant, apiUpdateVariant, apiDeleteVariant,
} from '../api/admin'
import type { ProductVariant } from '../types'
import ATable         from '../components/ui/ATable.vue'
import ABadge         from '../components/ui/ABadge.vue'
import AButton        from '../components/ui/AButton.vue'
import AInput         from '../components/ui/AInput.vue'
import ASelect        from '../components/ui/ASelect.vue'
import AModal         from '../components/ui/AModal.vue'
import AEmptyState    from '../components/ui/AEmptyState.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'

const props = defineProps<{ id: string }>()
const productId = Number(props.id)

const variants       = ref<ProductVariant[]>([])
const loading        = ref(true)
const modalOpen      = ref(false)
const editing        = ref<ProductVariant | null>(null)
const saving         = ref(false)
const deletingVariant= ref<ProductVariant | null>(null)
const deleting       = ref(false)
const formErrors     = ref<Record<string,string>>({})

const emptyForm = () => ({ size: '', price: '', original_price: '', stock: '' })
const form = ref(emptyForm())

const stockOptions = [
  { value: 'in_stock',     label: 'In Stock' },
  { value: 'low_stock',    label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
]

const cols = [
  { key: 'size',          label: 'Size (ml)' },
  { key: 'price',         label: 'Price' },
  { key: 'originalPrice', label: 'Original' },
  { key: 'stock',         label: 'Stock' },
]

async function loadVariants() {
  loading.value = true
  try {
    const res = await apiGetVariants(productId)
    variants.value = res.data
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null; form.value = emptyForm(); formErrors.value = {}; modalOpen.value = true
}
function openEdit(v: ProductVariant) {
  editing.value = v
  form.value = {
    size: String(v.size), price: String(v.price),
    original_price: v.originalPrice ?? '', stock: v.stock,
  }
  formErrors.value = {}; modalOpen.value = true
}

async function handleSave() {
  formErrors.value = {}
  if (!form.value.size)  { formErrors.value.size  = 'Size is required';  return }
  if (!form.value.price) { formErrors.value.price = 'Price is required'; return }
  if (!form.value.stock) { formErrors.value.stock = 'Stock is required'; return }

  const payload = {
    size:           Number(form.value.size),
    price:          Number(form.value.price),
    original_price: form.value.original_price ? Number(form.value.original_price) : null,
    stock:          form.value.stock,
  }

  saving.value = true
  try {
    if (editing.value) {
      await apiUpdateVariant(productId, editing.value.id, payload)
    } else {
      await apiCreateVariant(productId, payload)
    }
    modalOpen.value = false
    loadVariants()
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : 'Save failed.'
  } finally {
    saving.value = false
  }
}

function confirmDelete(v: ProductVariant) { deletingVariant.value = v }

async function handleDelete() {
  if (!deletingVariant.value) return
  deleting.value = true
  try {
    await apiDeleteVariant(productId, deletingVariant.value.id)
    deletingVariant.value = null
    loadVariants()
  } finally {
    deleting.value = false
  }
}

onMounted(loadVariants)
</script>
```

- [x] **Step 3: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-admin
git add src/views/ProductsView.vue src/views/ProductVariantsView.vue
git commit -m "feat(admin): add products view and product variants view"
```

---

## Task 13: Brands + Categories + Users Views

**Files:**
- Create: `aroma-admin/src/views/BrandsView.vue`
- Create: `aroma-admin/src/views/CategoriesView.vue`
- Create: `aroma-admin/src/views/UsersView.vue`

- [x] **Step 1: Create BrandsView.vue**

```vue
<!-- aroma-admin/src/views/BrandsView.vue -->
<template>
  <div class="space-y-4">
    <div class="flex justify-end">
      <AButton size="sm" @click="openCreate"><Plus :size="14" /> Add Brand</AButton>
    </div>

    <ATable :columns="cols" :rows="brands" :loading="loading">
      <template #cell-name="{ row }">
        <div>
          <p class="font-medium text-xs">{{ (row as AdminBrand).name }}</p>
          <p v-if="(row as AdminBrand).nameEn" class="text-[10px] text-aroma-faint">{{ (row as AdminBrand).nameEn }}</p>
        </div>
      </template>
      <template #cell-id="{ value }">
        <span class="font-mono text-[10px] text-aroma-faint">{{ value }}</span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-1.5 justify-end">
          <AButton size="sm" variant="ghost" @click.stop="openEdit(row as AdminBrand)">Edit</AButton>
          <AButton size="sm" variant="danger" @click.stop="confirmDelete(row as AdminBrand)">Delete</AButton>
        </div>
      </template>
      <template #empty>
        <AEmptyState :icon="Tag" heading="No brands yet" />
      </template>
    </ATable>

    <AModal :open="modalOpen" :title="editing ? 'Edit Brand' : 'Add Brand'" @close="modalOpen = false">
      <form class="space-y-3" @submit.prevent>
        <AInput v-if="!editing" v-model="form.id"      label="ID (slug, e.g. chanel)" :error="formErrors.id" />
        <div class="grid grid-cols-2 gap-3">
          <AInput v-model="form.name"    label="Name (Arabic)" :error="formErrors.name" />
          <AInput v-model="form.name_en" label="Name (English)" />
        </div>
        <AInput v-model="form.origin"  label="Country of origin" />
        <AInput v-model="form.tagline" label="Tagline" />
        <AInput v-model="form.bg"      label="Background colour" placeholder="#F4EFE8" :error="formErrors.bg" />
        <p v-if="formErrors.general" class="text-xs text-status-red-text">{{ formErrors.general }}</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="modalOpen = false">Cancel</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">{{ editing ? 'Save' : 'Add' }}</AButton>
      </template>
    </AModal>

    <AConfirmDialog
      :open="!!deletingBrand"
      title="Delete brand?"
      :message="deletingBrand?.productCount
        ? `This brand has ${deletingBrand.productCount} products. Reassign them first.`
        : `Delete &quot;${deletingBrand?.name}&quot;? This cannot be undone.`"
      confirm-label="Delete"
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="deletingBrand = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Tag } from 'lucide-vue-next'
import { apiGetBrands, apiCreateBrand, apiUpdateBrand, apiDeleteBrand } from '../api/admin'
import type { AdminBrand } from '../types'
import ATable         from '../components/ui/ATable.vue'
import AButton        from '../components/ui/AButton.vue'
import AInput         from '../components/ui/AInput.vue'
import AModal         from '../components/ui/AModal.vue'
import AEmptyState    from '../components/ui/AEmptyState.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'

const brands       = ref<AdminBrand[]>([])
const loading      = ref(true)
const modalOpen    = ref(false)
const editing      = ref<AdminBrand | null>(null)
const saving       = ref(false)
const deletingBrand= ref<AdminBrand | null>(null)
const deleting     = ref(false)
const formErrors   = ref<Record<string,string>>({})

const emptyForm = () => ({ id: '', name: '', name_en: '', origin: '', tagline: '', bg: '' })
const form = ref(emptyForm())

const cols = [
  { key: 'id',           label: 'ID' },
  { key: 'name',         label: 'Name' },
  { key: 'origin',       label: 'Origin' },
  { key: 'tagline',      label: 'Tagline' },
  { key: 'productCount', label: 'Products' },
]

async function loadBrands() {
  loading.value = true
  try { brands.value = (await apiGetBrands()).data }
  finally { loading.value = false }
}

function openCreate() { editing.value = null; form.value = emptyForm(); formErrors.value = {}; modalOpen.value = true }
function openEdit(b: AdminBrand) {
  editing.value = b
  form.value = { id: b.id, name: b.name, name_en: b.nameEn ?? '', origin: b.origin ?? '', tagline: b.tagline ?? '', bg: b.bg }
  formErrors.value = {}; modalOpen.value = true
}

async function handleSave() {
  formErrors.value = {}
  if (!editing.value && !form.value.id) { formErrors.value.id = 'ID is required'; return }
  if (!form.value.name) { formErrors.value.name = 'Name is required'; return }
  if (!form.value.bg)   { formErrors.value.bg   = 'Colour is required'; return }
  saving.value = true
  try {
    editing.value
      ? await apiUpdateBrand(editing.value.id, form.value)
      : await apiCreateBrand(form.value)
    modalOpen.value = false; loadBrands()
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : 'Save failed.'
  } finally { saving.value = false }
}

function confirmDelete(b: AdminBrand) { deletingBrand.value = b }

async function handleDelete() {
  if (!deletingBrand.value) return
  deleting.value = true
  try {
    await apiDeleteBrand(deletingBrand.value.id)
    deletingBrand.value = null; loadBrands()
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : 'Delete failed.'
  } finally { deleting.value = false }
}

onMounted(loadBrands)
</script>
```

- [x] **Step 2: Create CategoriesView.vue**

```vue
<!-- aroma-admin/src/views/CategoriesView.vue -->
<template>
  <div class="space-y-4">
    <div class="flex justify-end">
      <AButton size="sm" @click="openCreate"><Plus :size="14" /> Add Category</AButton>
    </div>

    <ATable :columns="cols" :rows="categories" :loading="loading">
      <template #cell-id="{ value }">
        <span class="font-mono text-[10px] text-aroma-faint">{{ value }}</span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-1.5 justify-end">
          <AButton size="sm" variant="ghost" @click.stop="openEdit(row as AdminCategory)">Edit</AButton>
          <AButton size="sm" variant="danger" @click.stop="confirmDelete(row as AdminCategory)">Delete</AButton>
        </div>
      </template>
      <template #empty>
        <AEmptyState :icon="Grid3X3" heading="No categories yet" />
      </template>
    </ATable>

    <AModal :open="modalOpen" :title="editing ? 'Edit Category' : 'Add Category'" @close="modalOpen = false">
      <form class="space-y-3" @submit.prevent>
        <AInput v-if="!editing" v-model="form.id"    label="ID (slug, e.g. women)" :error="formErrors.id" />
        <AInput v-model="form.label" label="Label" :error="formErrors.label" />
        <AInput v-model="form.bg"    label="Background colour" placeholder="#F4EFE8" :error="formErrors.bg" />
        <p v-if="formErrors.general" class="text-xs text-status-red-text">{{ formErrors.general }}</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="modalOpen = false">Cancel</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">{{ editing ? 'Save' : 'Add' }}</AButton>
      </template>
    </AModal>

    <AConfirmDialog
      :open="!!deletingCat"
      title="Delete category?"
      :message="`Delete &quot;${deletingCat?.label}&quot;? Products in this category will lose their category.`"
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="deletingCat = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Grid3X3 } from 'lucide-vue-next'
import { apiGetCategories, apiCreateCategory, apiUpdateCategory, apiDeleteCategory } from '../api/admin'
import type { AdminCategory } from '../types'
import ATable         from '../components/ui/ATable.vue'
import AButton        from '../components/ui/AButton.vue'
import AInput         from '../components/ui/AInput.vue'
import AModal         from '../components/ui/AModal.vue'
import AEmptyState    from '../components/ui/AEmptyState.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'

const categories = ref<AdminCategory[]>([])
const loading    = ref(true)
const modalOpen  = ref(false)
const editing    = ref<AdminCategory | null>(null)
const saving     = ref(false)
const deletingCat= ref<AdminCategory | null>(null)
const deleting   = ref(false)
const formErrors = ref<Record<string,string>>({})

const emptyForm = () => ({ id: '', label: '', bg: '' })
const form = ref(emptyForm())

const cols = [
  { key: 'id',           label: 'ID' },
  { key: 'label',        label: 'Label' },
  { key: 'productCount', label: 'Products' },
]

async function loadCats() {
  loading.value = true
  try { categories.value = (await apiGetCategories()).data }
  finally { loading.value = false }
}

function openCreate() { editing.value = null; form.value = emptyForm(); formErrors.value = {}; modalOpen.value = true }
function openEdit(c: AdminCategory) {
  editing.value = c
  form.value = { id: c.id, label: c.label, bg: c.bg }
  formErrors.value = {}; modalOpen.value = true
}

async function handleSave() {
  formErrors.value = {}
  if (!editing.value && !form.value.id)    { formErrors.value.id    = 'ID is required';    return }
  if (!form.value.label) { formErrors.value.label = 'Label is required'; return }
  if (!form.value.bg)    { formErrors.value.bg    = 'Colour is required'; return }
  saving.value = true
  try {
    editing.value
      ? await apiUpdateCategory(editing.value.id, form.value)
      : await apiCreateCategory(form.value)
    modalOpen.value = false; loadCats()
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : 'Save failed.'
  } finally { saving.value = false }
}

function confirmDelete(c: AdminCategory) { deletingCat.value = c }

async function handleDelete() {
  if (!deletingCat.value) return
  deleting.value = true
  try { await apiDeleteCategory(deletingCat.value.id); deletingCat.value = null; loadCats() }
  finally { deleting.value = false }
}

onMounted(loadCats)
</script>
```

- [x] **Step 3: Create UsersView.vue**

```vue
<!-- aroma-admin/src/views/UsersView.vue -->
<template>
  <div class="space-y-4">
    <AInput v-model="search" placeholder="Search by name or email…" class="w-64" @input="debouncedFetch" />

    <ATable :columns="cols" :rows="items" :loading="loading">
      <template #cell-orderCount="{ value }">
        <span class="font-medium">{{ value }}</span>
        <span class="text-aroma-faint text-[10px] ml-1">orders</span>
      </template>
      <template #empty>
        <AEmptyState :icon="Users" heading="No customers found" sub="Try a different search term" />
      </template>
    </ATable>

    <APagination :meta="meta" @change="changePage" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Users } from 'lucide-vue-next'
import { apiGetUsers } from '../api/admin'
import { usePagination } from '../composables/usePagination'
import ATable      from '../components/ui/ATable.vue'
import AInput      from '../components/ui/AInput.vue'
import APagination from '../components/ui/APagination.vue'
import AEmptyState from '../components/ui/AEmptyState.vue'

const search = ref('')

const cols = [
  { key: 'name',       label: 'Name' },
  { key: 'email',      label: 'Email' },
  { key: 'phone',      label: 'Phone' },
  { key: 'orderCount', label: 'Orders' },
  { key: 'joinedAt',   label: 'Joined' },
]

const { items, meta, loading, fetch, changePage } = usePagination((page) =>
  apiGetUsers({ search: search.value || undefined, page }).then(r => r.data),
)

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetch(1), 350)
}

onMounted(() => fetch(1))
</script>
```

- [x] **Step 4: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-admin
git add src/views/BrandsView.vue src/views/CategoriesView.vue src/views/UsersView.vue
git commit -m "feat(admin): add brands, categories, and users views"
```

---

## Task 14: CORS Config + End-to-End Smoke Test

**Files:**
- Modify: `aroma-api/config/cors.php`
- Modify: `aroma-api/.env`

- [x] **Step 1: Allow admin dev server in CORS**

Read `aroma-api/config/cors.php`. Set `allowed_origins` to include the admin dev port:

```php
'allowed_origins' => ['http://localhost:5173', 'http://localhost:3000'],
'supports_credentials' => true,
```

- [x] **Step 2: Clear API caches**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-api
php artisan config:clear && php artisan route:clear && php artisan cache:clear
```

- [x] **Step 3: Full smoke test checklist**

Start both servers:
```bash
# Terminal 1
cd /Users/suhaib/web_projects/aroma-full-project/aroma-api && php artisan serve

# Terminal 2
cd /Users/suhaib/web_projects/aroma-full-project/aroma-admin && npm run dev
```

Run through each flow manually and confirm ✅:
- [x] `/login` — renders login card with Aroma brand mark
- [x] Login with `admin@aroma.ly` / `password` → redirects to `/dashboard`
- [x] Non-admin credentials → shows "does not have admin access" error
- [x] `/dashboard` — 4 stat cards + recent orders table
- [x] Clicking a recent order row → navigates to `/orders/:id`
- [x] `/orders` — table with rows, status filter pills work
- [x] Order detail — items table, timeline, status dropdown, admin note textarea
- [x] Updating status → badge on page refreshes
- [x] `/products` — table loads, search filters live
- [x] Add product modal opens, validates required fields, submits
- [x] Edit product → form pre-fills
- [x] Delete product → confirm dialog → row disappears
- [x] "Variants (N)" button → navigates to `/products/:id/variants`
- [x] Add/edit/delete variant works
- [x] `/brands` — CRUD works, delete with products shows 422 error
- [x] `/categories` — CRUD works
- [x] `/users` — table loads, search works
- [x] Logout → clears token, redirects to `/login`
- [x] Accessing `/dashboard` without token → redirects to `/login`

- [x] **Step 4: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-api
git add config/cors.php
git commit -m "chore(api): allow admin dev origin in CORS"

cd /Users/suhaib/web_projects/aroma-full-project/aroma-admin
git add .env
git commit -m "chore(admin): add VITE_API_URL env"
```

---

## Self-Review

**Spec coverage:**
- ✅ Login with admin guard (non-admin rejected)
- ✅ Dashboard: 4 stat cards + recent orders clickable
- ✅ Orders list: pagination + 7-status pill filter
- ✅ Order detail: items, timeline, status update, admin note
- ✅ Products CRUD: create/edit/delete + search + pagination
- ✅ Product variants CRUD: dedicated view per product
- ✅ Brands CRUD: delete guard when products exist
- ✅ Categories CRUD
- ✅ Users: read-only, search, pagination
- ✅ Auth guard: unauthenticated → login, authenticated → dashboard
- ✅ 401 interceptor auto-redirects to login
- ✅ Brand design tokens (aroma-* palette, DM Sans, status colours)
- ✅ Confirm dialog before all deletes
- ✅ Loading skeletons in ATable
- ✅ Empty states in all tables

**Placeholder scan:** No TBD/TODO/similar-to patterns found.

**Type consistency:**
- `AdminOrder.status` typed as `OrderStatus` — matches `ABadge` map keys
- `ProductVariant.stock` typed as `StockStatus` (`in_stock` / `low_stock` / `out_of_stock`) — matches `ABadge` map keys and backend enum values
- `usePagination` returns `items` (typed via generic) + `meta: PageMeta | null` — `APagination` accepts `PageMeta | null`
- `apiGetVariants` returns `ProductVariant[]` — `ProductVariantsView` uses `ProductVariant` type throughout
