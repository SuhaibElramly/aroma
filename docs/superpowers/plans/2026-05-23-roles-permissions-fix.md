# Roles & Permissions Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Fix roles and permissions so that the admin roles defined in the AdminsView enforce real access control — suspended admins are blocked, sidebar items filter by role, routes are guarded, and the roles tab data is consistent.

**Architecture:** Backend adds `admin_status` enforcement to the `IsAdmin` middleware and login flow. Frontend centralizes role-based permission helpers in the auth Pinia store, uses them to filter Sidebar nav items, and adds route meta + guards for page-level access control. The `catalog_manager` ID inconsistency in `rolesData` is also fixed.

**Tech Stack:** Vue 3 + Pinia + Vue Router (frontend), Laravel + Sanctum (backend PHP)

---

## File Map

| File | Change |
|---|---|
| `aroma-api/app/Http/Middleware/IsAdmin.php` | Add `admin_status === 'active'` check |
| `aroma-api/app/Services/AuthService.php` | Block suspended admins from logging in |
| `aroma-admin/src/stores/auth.ts` | Add `can()` permission helper and computed role flags |
| `aroma-admin/src/views/AdminsView.vue` | Fix `catalog_manager` ID in `rolesData` |
| `aroma-admin/src/components/layout/Sidebar.vue` | Filter nav groups by `can()` helper |
| `aroma-admin/src/router/index.ts` | Add `requiredPermission` route meta + guard |

---

### Task 1: Block suspended admins at the API layer

**Files:**
- Modify: `aroma-api/app/Http/Middleware/IsAdmin.php`
- Modify: `aroma-api/app/Services/AuthService.php`

- [x] **Step 1: Update IsAdmin middleware to also check `admin_status`**

Replace the middleware body so it rejects suspended users:

```php
// aroma-api/app/Http/Middleware/IsAdmin.php
public function handle(Request $request, Closure $next): Response
{
    $user = $request->user();
    if (!$user?->is_admin || $user->admin_status !== 'active') {
        return response()->json(['message' => 'Forbidden'], 403);
    }
    return $next($request);
}
```

- [x] **Step 2: Block suspended admins from logging in**

In `aroma-api/app/Services/AuthService.php`, find the `login()` method and add the `admin_status` check after the credential check:

```php
public function login(string $email, string $password): bool
{
    $user = User::where('email', $email)
        ->orWhere('phone', $email)
        ->first();

    if (!$user || !Hash::check($password, $user->password)) {
        return false;
    }

    // Suspended admin accounts cannot log in
    if ($user->is_admin && $user->admin_status !== 'active') {
        return false;
    }

    Auth::login($user);
    return true;
}
```

- [x] **Step 3: Test the middleware change manually**

With a suspended admin token (or by temporarily suspending one via the DB), call:
```
GET /api/admin/stats  (with Authorization: Bearer <suspended_token>)
```
Expected: `403 {"message": "Forbidden"}`

- [x] **Step 4: Commit**

```bash
git add aroma-api/app/Http/Middleware/IsAdmin.php aroma-api/app/Services/AuthService.php
git commit -m "fix(auth): block suspended admins from API and login"
```

---

### Task 2: Add permission helpers to the auth store

**Files:**
- Modify: `aroma-admin/src/stores/auth.ts`

The roles and their permission matrices are already defined in `AdminsView.vue`. We move the permission lookup into the store so every component can use it.

- [x] **Step 1: Define the permission matrix in the store**

Replace the content of `aroma-admin/src/stores/auth.ts` with:

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiLogin, apiGetMe } from '../api/admin'
import type { AdminUser } from '../types'

// resource → [view, edit, delete]
const ROLE_PERMS: Record<string, 'all' | Record<string, number[]>> = {
  owner:           'all',
  admin:           { products:[1,1,1], orders:[1,1,1], coupons:[1,1,1], customers:[1,1,0], brands:[1,1,1], specs:[1,1,1], admins:[1,0,0] },
  catalog_manager: { products:[1,1,1], orders:[1,0,0], coupons:[1,1,0], customers:[1,0,0], brands:[1,1,1], specs:[1,1,1], admins:[0,0,0] },
  sales:           { products:[1,0,0], orders:[1,1,0], coupons:[1,0,0], customers:[1,1,0], brands:[1,0,0], specs:[1,0,0], admins:[0,0,0] },
  support:         { products:[1,0,0], orders:[1,1,0], coupons:[1,0,0], customers:[1,1,0], brands:[1,0,0], specs:[1,0,0], admins:[0,0,0] },
  read_only:       { products:[1,0,0], orders:[1,0,0], coupons:[1,0,0], customers:[1,0,0], brands:[1,0,0], specs:[1,0,0], admins:[0,0,0] },
}

// idx: 0 = view, 1 = edit/create, 2 = delete
export type PermAction = 'view' | 'edit' | 'delete'
const ACTION_IDX: Record<PermAction, number> = { view: 0, edit: 1, delete: 2 }

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('admin_token'))
  const user  = ref<AdminUser | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const isOwner         = computed(() => user.value?.role === 'owner')

  function can(resource: string, action: PermAction = 'view'): boolean {
    const role = user.value?.role
    if (!role) return false
    const perms = ROLE_PERMS[role]
    if (!perms) return false
    if (perms === 'all') return true
    return (perms[resource]?.[ACTION_IDX[action]] ?? 0) === 1
  }

  async function login(email: string, password: string) {
    const res = await apiLogin(email, password)
    if (!res.data.user.is_admin) {
      throw new Error('This account does not have admin access.')
    }
    token.value = res.data.token
    user.value  = res.data.user
    localStorage.setItem('admin_token', res.data.token)
  }

  async function init() {
    if (!token.value) return
    try {
      const res = await apiGetMe()
      user.value = res.data
    } catch {
      token.value = null
      localStorage.removeItem('admin_token')
    }
  }

  function logout() {
    token.value = null
    user.value  = null
    localStorage.removeItem('admin_token')
  }

  return { token, user, isAuthenticated, isOwner, can, login, logout, init }
})
```

- [x] **Step 2: Verify TypeScript compiles**

```bash
cd aroma-admin && npx tsc --noEmit
```
Expected: no errors

- [x] **Step 3: Commit**

```bash
git add aroma-admin/src/stores/auth.ts
git commit -m "feat(auth): add can() permission helper and ROLE_PERMS map to auth store"
```

---

### Task 3: Fix `catalog_manager` ID in AdminsView roles tab

**Files:**
- Modify: `aroma-admin/src/views/AdminsView.vue`

The `rolesData` entry for Catalog Manager has `id: 'catalog'` but the database stores `catalog_manager`. The form option, `roleLabel`, and `ROLE_HUE` all correctly use `catalog_manager`. Fix the `rolesData` entry.

- [x] **Step 1: Fix the catalog role ID and remove the duplicate ROLE_PERMS**

In `AdminsView.vue` find the `rolesData` computed property (around line 105) and change `id: 'catalog'` → `id: 'catalog_manager'` AND update its perms key to reference `catalog_manager` (which is now defined in the store). Also replace the local `getPerm` function to use the store's `can()`:

Change the `rolesData` definition — only the `id` of the catalog entry needs fixing:

```typescript
// Before (line ~108):
{ id: 'catalog', name: t('admins.roles.catalogManager'), ...

// After:
{ id: 'catalog_manager', name: t('admins.roles.catalogManager'), ...
```

- [x] **Step 2: Update `rolesWithCounts` to use simple ID match**

After fixing the `id`, the double-fallback in `rolesWithCounts` is no longer needed. Replace:

```typescript
// Before
members: admins.value.filter(a => a.role === r.id || a.role === r.name.toLowerCase().replace(/ /g, '_')).length,

// After
members: admins.value.filter(a => a.role === r.id).length,
```

- [x] **Step 3: Verify the roles tab shows correct member counts**

Start the dev server and navigate to Admins → Roles & permissions tab. The member count chip next to each role should reflect the actual number.

- [x] **Step 4: Commit**

```bash
git add aroma-admin/src/views/AdminsView.vue
git commit -m "fix(admins): fix catalog_manager id mismatch in rolesData"
```

---

### Task 4: Filter Sidebar navigation by role

**Files:**
- Modify: `aroma-admin/src/components/layout/Sidebar.vue`

Each nav item maps to a resource. Items should only be shown if the user can `view` that resource. The `dashboard` item is always visible to authenticated admins.

- [x] **Step 1: Import `useAuthStore` and map nav items to resources**

Replace the `groups` computed in Sidebar.vue's `<script setup>`:

```typescript
import { useAuthStore } from '../../stores/auth'
const auth = useAuthStore()

const groups = computed(() => {
  const c = (resource: string) => auth.can(resource, 'view')
  return [
    {
      label: t('nav.workspace'),
      items: [
        { key: 'dashboard',  label: t('nav.dashboard'),  icon: LayoutDashboard, path: 'dashboard',  badge: null },
        c('orders')    && { key: 'orders',  label: t('nav.orders'),    icon: ShoppingBag, path: 'orders',  badge: null },
        c('customers') && { key: 'users',   label: t('nav.customers'), icon: Users,       path: 'users',   badge: null },
      ].filter(Boolean),
    },
    {
      label: t('nav.catalog'),
      items: [
        c('products') && { key: 'products',   label: t('nav.products'),  icon: Package,           path: 'products',   badge: null },
        c('specs')    && { key: 'spec-types', label: t('nav.specTypes'), icon: SlidersHorizontal, path: 'spec-types', badge: null },
        c('brands')   && { key: 'brands',     label: t('nav.brands'),    icon: Tag,               path: 'brands',     badge: null },
        c('brands')   && { key: 'categories', label: t('nav.categories'),icon: Grid3X3,           path: 'categories', badge: null },
        c('coupons')  && { key: 'coupons',    label: t('nav.coupons'),   icon: Ticket,            path: 'coupons',    badge: null },
      ].filter(Boolean),
    },
    auth.can('admins', 'view') ? {
      label: t('nav.settings'),
      items: [
        { key: 'admins', label: t('nav.admins'), icon: ShieldCheck, path: 'admins', badge: null },
      ],
    } : null,
  ].filter(Boolean)
})
```

Note: The existing `useAuthStore` import is already present in Sidebar.vue (the `auth` const is already there). Just update `groups` — no new imports needed.

- [x] **Step 2: Fix the TypeScript type error from `.filter(Boolean)`**

The items array contains `false | { key: string, ... }` values after the `&&` shortcircuit. Add a type assertion to satisfy TypeScript. Replace the `.filter(Boolean)` calls with:

```typescript
.filter((x): x is { key: string; label: string; icon: any; path: string; badge: string | null } => Boolean(x))
```

And for the outer `groups`:
```typescript
].filter((g): g is { label: string; items: any[] } => Boolean(g))
```

- [x] **Step 3: Verify sidebar filtering**

Run `npx tsc --noEmit` from `aroma-admin/`. Start the dev server. Log in as a `read_only` user — they should only see Dashboard. Log in as `sales` — they should see Orders and Customers only in the workspace group, no catalog items.

- [x] **Step 4: Commit**

```bash
git add aroma-admin/src/components/layout/Sidebar.vue
git commit -m "feat(sidebar): filter nav items by role permission"
```

---

### Task 5: Add role-based route guards

**Files:**
- Modify: `aroma-admin/src/router/index.ts`

Even with sidebar filtering, a user can type a URL directly. Add `meta.requiredResource` to each route and check it in `beforeEach`.

- [x] **Step 1: Add `requiredResource` to route definitions**

Update the children routes under `requiresAuth`:

```typescript
{ path: 'dashboard',  name: 'dashboard',      component: () => import('../views/DashboardView.vue') },
{ path: 'orders',     name: 'orders',         component: () => import('../views/OrdersView.vue'),         meta: { requiredResource: 'orders' } },
{ path: 'orders/:id', name: 'order-detail',   component: () => import('../views/OrderDetailView.vue'), props: true, meta: { requiredResource: 'orders' } },
{ path: 'products',       name: 'products',        component: () => import('../views/ProductsView.vue'),          meta: { requiredResource: 'products' } },
{ path: 'products/new',   name: 'product-create',  component: () => import('../views/ProductStepperView.vue'),    meta: { requiredResource: 'products', requiredAction: 'edit' } },
{ path: 'products/:id/edit', name: 'product-edit', component: () => import('../views/ProductStepperView.vue'),    meta: { requiredResource: 'products', requiredAction: 'edit' } },
{ path: 'products/:id/variants', redirect: (to) => ({ name: 'product-edit', params: { id: to.params.id } }) },
{ path: 'products/:id', name: 'product-detail',    component: () => import('../views/ProductDetailView.vue'), props: true, meta: { requiredResource: 'products' } },
{ path: 'brands',     name: 'brands',          component: () => import('../views/BrandsView.vue'),          meta: { requiredResource: 'brands' } },
{ path: 'brands/:id', name: 'brand-detail',    component: () => import('../views/BrandDetailView.vue'), props: true, meta: { requiredResource: 'brands' } },
{ path: 'categories', name: 'categories',      component: () => import('../views/CategoriesView.vue'),      meta: { requiredResource: 'brands' } },
{ path: 'users',      name: 'users',           component: () => import('../views/UsersView.vue'),           meta: { requiredResource: 'customers' } },
{ path: 'users/:id',  name: 'user-detail',     component: () => import('../views/UserDetailView.vue'), props: true, meta: { requiredResource: 'customers' } },
{ path: 'coupons',    name: 'coupons',         component: () => import('../views/CouponsView.vue'),         meta: { requiredResource: 'coupons' } },
{ path: 'spec-types', name: 'spec-types',      component: () => import('../views/SpecTypesView.vue'),       meta: { requiredResource: 'specs' } },
{ path: 'admins',     name: 'admins',          component: () => import('../views/AdminsView.vue'),          meta: { requiredResource: 'admins' } },
```

- [x] **Step 2: Add TypeScript types for meta and the permission check in `beforeEach`**

At the top of `router/index.ts`, add the meta type declaration. Then update `beforeEach`:

```typescript
import { useAuthStore } from '../stores/auth'
import type { PermAction } from '../stores/auth'

// Augment vue-router meta types
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresGuest?: boolean
    requiredResource?: string
    requiredAction?: PermAction
  }
}

// ... router definition ...

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (to.meta.requiresGuest && auth.isAuthenticated) return { name: 'dashboard' }

  if (to.meta.requiresAuth && !auth.isAuthenticated) return { name: 'login' }

  // Wait for user to load before checking permissions
  if (auth.isAuthenticated && !auth.user) {
    await auth.init()
  }

  if (to.meta.requiredResource) {
    const action = (to.meta.requiredAction as PermAction | undefined) ?? 'view'
    if (!auth.can(to.meta.requiredResource, action)) {
      return { name: 'dashboard' }
    }
  }
})
```

- [x] **Step 3: Verify TypeScript compiles**

```bash
cd aroma-admin && npx tsc --noEmit
```
Expected: no errors

- [x] **Step 4: Test route guard manually**

Log in as a `read_only` user. Try navigating to `/products` directly in the browser address bar. Expected: redirected to `/dashboard`.

- [x] **Step 5: Commit**

```bash
git add aroma-admin/src/router/index.ts
git commit -m "feat(router): add role-based route guards using auth.can()"
```

---

## Self-Review Checklist

- [x] **Spec coverage**: All 5 issues identified are addressed: suspended admin API access (Task 1), suspended admin login (Task 1), catalog_manager ID mismatch (Task 3), sidebar nav filtering (Task 4), route guards (Task 5). Auth store helpers required by Tasks 4 and 5 are built first in Task 2.
- [x] **No placeholders**: All steps include exact code.
- [x] **Type consistency**: `PermAction` type exported from store and imported in router. `can()` signature consistent across Tasks 2, 4, and 5. `ROLE_PERMS` in store and `rolesData` in AdminsView.vue now both use `catalog_manager`.
- [x] **Order**: Tasks 2 (store helpers) must precede Tasks 4 and 5 which depend on `auth.can()`.
