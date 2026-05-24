# Fix Admins Page 401 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Fix the Admins page returning 401, by wiring it up to the shared authenticated API client and ensuring all CRUD operations work correctly.

**Architecture:** `AdminsView.vue` currently bypasses the shared `client.ts` axios instance and reads the token from the wrong `localStorage` key (`auth_token` instead of `admin_token`). The fix is to add typed admin-management functions to `admin.ts` and rewrite `AdminsView.vue` to use them — matching the pattern every other view in the dashboard uses.

**Tech Stack:** Vue 3 (Composition API, `<script setup>`), Pinia, Axios (`client.ts`), Laravel Sanctum (API)

---

### Task 1: Add `AdminMember` type to `types/index.ts`

The local `AdminUser` interface inside `AdminsView.vue` (fields: `id`, `name`, `phone`, `role`, `adminStatus`, `createdAt`) is not in the shared types file. Add it there as `AdminMember` to avoid confusion with the existing `AdminUser` (which represents the logged-in admin, not the team list).

**Files:**
- Modify: `aroma-admin/src/types/index.ts`

- [x] **Step 1: Add the `AdminMember` interface**

Open `aroma-admin/src/types/index.ts`. After the existing `AdminUser` interface (around line 25), add:

```typescript
export interface AdminMember {
  id:          number
  name:        string
  phone:       string
  email:       string
  role:        string
  adminStatus: 'active' | 'suspended'
  createdAt:   string
}
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/types/index.ts
git commit -m "feat(types): add AdminMember type for admin team management"
```

---

### Task 2: Add admin-management API functions to `admin.ts`

All API calls in the admin dashboard go through `aroma-admin/src/api/admin.ts` using the authenticated `client` (axios instance). Add the four functions needed by the Admins page.

**Files:**
- Modify: `aroma-admin/src/api/admin.ts`

- [x] **Step 1: Add the four admin management API functions**

At the bottom of `aroma-admin/src/api/admin.ts`, append:

```typescript
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
```

- [x] **Step 2: Add the `AdminMember` import at the top of `admin.ts`**

The existing import block at line 1–8 of `admin.ts` already imports from `../types`. Add `AdminMember` to the import list:

```typescript
import type {
  AdminUser, DashboardStats, AdminOrder, AdminProduct,
  AdminBrand, AdminCategory, AdminUserRow, PageMeta, ProductVariant, ProductImage,
  AdminCartItem, AdminWishlistProduct, ProductType, AdminCoupon, CouponOrder,
  SpecType, ProductSpec, AdminUserOrder, AdminMember,
} from '../types'
```

- [x] **Step 3: Commit**

```bash
git add aroma-admin/src/api/admin.ts
git commit -m "feat(api): add admin team management API functions"
```

---

### Task 3: Rewrite `AdminsView.vue` to use the shared API client

The entire `<script setup>` section currently uses raw `fetch` with the wrong token key. Replace the fetch calls with the four new API functions. The template does not change.

**Files:**
- Modify: `aroma-admin/src/views/AdminsView.vue`

- [x] **Step 1: Replace the `<script setup>` block**

Replace lines 1–201 (the full `<script setup>` block) with:

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AdminMember } from '../types'
import {
  apiGetAdmins,
  apiCreateAdmin,
  apiToggleAdminStatus,
  apiResetAdminPassword,
} from '../api/admin'

// ── API state ─────────────────────────────────────────────────────────
const admins   = ref<AdminMember[]>([])
const loading  = ref(true)
const showForm = ref(false)
const error    = ref<string | null>(null)
const form     = ref({ name: '', phone: '+218 ', role: 'admin', password: '', showPw: false })

const { t } = useI18n()

async function load() {
  error.value = null
  try {
    loading.value = true
    const res = await apiGetAdmins()
    admins.value = res.data
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Failed to load admins'
  } finally {
    loading.value = false
  }
}

async function createAdmin() {
  error.value = null
  try {
    const res = await apiCreateAdmin({
      name:     form.value.name,
      phone:    form.value.phone,
      role:     form.value.role,
      password: form.value.password,
    })
    admins.value.push(res.data)
    showForm.value = false
    form.value = { name: '', phone: '+218 ', role: 'admin', password: '', showPw: false }
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Failed to create admin'
  }
}

async function toggleStatus(a: AdminMember) {
  try {
    const res = await apiToggleAdminStatus(a.id)
    const idx = admins.value.findIndex(x => x.id === a.id)
    if (idx !== -1) admins.value[idx] = { ...admins.value[idx], ...res.data }
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Failed to update status'
  }
}

async function resetPassword(a: AdminMember) {
  const pw = prompt('New temporary password (min 8 chars):')
  if (!pw || pw.length < 8) return
  try {
    await apiResetAdminPassword(a.id, pw)
    alert('Password reset successfully.')
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Failed to reset password'
  }
}

function generatePassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  form.value.password = Array.from(bytes, b => chars[b % chars.length]).join('')
  form.value.showPw = true
}

function copyPassword() {
  if (navigator.clipboard && form.value.password) {
    navigator.clipboard.writeText(form.value.password)
  }
}

// ── Tabs ──────────────────────────────────────────────────────────────
const activeTab = ref<'members' | 'roles'>('members')

// ── Roles & permissions data ─────────────────────────────────────────
interface RoleDefinition {
  id: string
  name: string
  desc: string
  color: string
  members: number
  perms: 'all' | Record<string, number[]>
}

const rolesData = computed<RoleDefinition[]>(() => [
  { id: 'owner',   name: t('admins.roles.owner'),          desc: t('admins.roleDescs.owner'),    color: 'oklch(26% 0.04 250)',  members: 1, perms: 'all' },
  { id: 'admin',   name: t('admins.roles.admin'),          desc: t('admins.roleDescs.admin'),    color: 'oklch(46% 0.075 210)', members: 0, perms: { products:[1,1,1], orders:[1,1,1], coupons:[1,1,1], customers:[1,1,0], brands:[1,1,1], specs:[1,1,1], admins:[1,0,0] } },
  { id: 'catalog', name: t('admins.roles.catalogManager'), desc: t('admins.roleDescs.catalog'),  color: 'oklch(56% 0.10 340)', members: 0, perms: { products:[1,1,1], orders:[1,0,0], coupons:[1,1,0], customers:[1,0,0], brands:[1,1,1], specs:[1,1,1], admins:[0,0,0] } },
  { id: 'sales',   name: t('admins.roles.sales'),          desc: t('admins.roleDescs.sales'),    color: 'oklch(58% 0.10 32)',   members: 0, perms: { products:[1,0,0], orders:[1,1,0], coupons:[1,0,0], customers:[1,1,0], brands:[1,0,0], specs:[1,0,0], admins:[0,0,0] } },
  { id: 'support', name: t('admins.roles.support'),        desc: t('admins.roleDescs.support'),  color: 'oklch(52% 0.045 145)', members: 0, perms: { products:[1,0,0], orders:[1,1,0], coupons:[1,0,0], customers:[1,1,0], brands:[1,0,0], specs:[1,0,0], admins:[0,0,0] } },
  { id: 'readonly',name: t('admins.roles.readOnly'),       desc: t('admins.roleDescs.readOnly'), color: 'oklch(56% 0.035 240)', members: 0, perms: { products:[1,0,0], orders:[1,0,0], coupons:[1,0,0], customers:[1,0,0], brands:[1,0,0], specs:[1,0,0], admins:[0,0,0] } },
])

const rolesWithCounts = computed(() => rolesData.value.map(r => ({
  ...r,
  members: admins.value.filter(a => a.role === r.id || a.role === r.name.toLowerCase().replace(/ /g, '_')).length,
})))

const selectedRoleId = ref('admin')
const selectedRole = computed(() => rolesWithCounts.value.find(r => r.id === selectedRoleId.value) ?? rolesWithCounts.value[1])

interface PermGroup {
  id: string
  label: string
  rows: { id: string; name: string }[]
}

const permGroups = computed<PermGroup[]>(() => [
  { id: 'catalog', label: t('admins.permGroups.catalog'), rows: [
    { id: 'products', name: t('admins.permGroups.products') },
    { id: 'brands',   name: t('admins.permGroups.brands') },
    { id: 'specs',    name: t('admins.permGroups.specs') },
  ]},
  { id: 'sales', label: t('admins.permGroups.sales'), rows: [
    { id: 'orders',  name: t('admins.permGroups.orders') },
    { id: 'coupons', name: t('admins.permGroups.coupons') },
  ]},
  { id: 'people', label: t('admins.permGroups.people'), rows: [
    { id: 'customers', name: t('admins.permGroups.customers') },
  ]},
  { id: 'system', label: t('admins.permGroups.system'), rows: [
    { id: 'admins', name: t('admins.permGroups.adminTeam') },
  ]},
])

function getPerm(resource: string, idx: number): boolean {
  const role = selectedRole.value
  if (role.perms === 'all') return true
  return (role.perms as Record<string, number[]>)?.[resource]?.[idx] === 1
}

// ── KPI helpers ───────────────────────────────────────────────────────
const stats = computed(() => ({
  total:     admins.value.length,
  active:    admins.value.filter(a => a.adminStatus === 'active').length,
  roles:     rolesData.value.length,
  suspended: admins.value.filter(a => a.adminStatus === 'suspended').length,
}))

// ── Visual helpers ────────────────────────────────────────────────────
const ROLE_LABELS = computed<Record<string, string>>(() => ({
  owner: t('admins.roles.owner'),
  admin: t('admins.roles.admin'),
  catalog_manager: t('admins.roles.catalogManager'),
  sales: t('admins.roles.sales'),
  support: t('admins.roles.support'),
  read_only: t('admins.roles.readOnly'),
}))

const ROLE_HUE: Record<string, number> = {
  owner: 250, admin: 210, catalog_manager: 340, sales: 32, support: 140, read_only: 230, readonly: 230,
}

function roleColor(role: string): string {
  const hue = ROLE_HUE[role] ?? 200
  return `oklch(52% 0.07 ${hue})`
}

function initials(name: string): string {
  if (!name) return '?'
  const words = name.trim().split(/\s+/)
  return (words[0][0] + (words[1]?.[0] ?? '')).toUpperCase()
}

function adminHue(name: string): number {
  const palette = [32, 340, 200, 96, 48, 140, 280, 18, 54, 24, 8, 160]
  return palette[(name?.charCodeAt(0) ?? 65) % palette.length]
}

onMounted(load)
</script>
```

- [x] **Step 2: Verify the template section is unchanged**

The `<template>` block (lines 203–519 in the original) does not need any changes — all bindings (`admins`, `loading`, `error`, `showForm`, `form`, `activeTab`, `stats`, etc.) keep the same names.

- [x] **Step 3: Verify TypeScript compiles**

```bash
cd aroma-admin && npx vue-tsc --noEmit 2>&1 | head -40
```

Expected: no errors relating to `AdminMember`, `apiGetAdmins`, `apiCreateAdmin`, `apiToggleAdminStatus`, or `apiResetAdminPassword`.

- [x] **Step 4: Commit**

```bash
git add aroma-admin/src/views/AdminsView.vue
git commit -m "fix(admins): use shared API client instead of raw fetch (fixes 401)"
```

---

### Task 4: Smoke test the page end-to-end

**Pre-condition:** The API server is running (`php artisan serve`) and you are logged in to the admin dashboard.

- [x] **Step 1: Open the Admins page in the browser**

Navigate to `/admins` in the admin dashboard. Open DevTools → Network tab.

Expected: A `GET /api/admin/admins` request with `Authorization: Bearer <admin_token>` header returns HTTP 200 with a JSON array. The KPI cards show numbers and the table renders the admin list.

- [x] **Step 2: Test Create Admin**

Click "New Admin", fill in name, phone, role, generate a password, click "Create Admin".

Expected: POST `/api/admin/admins` returns 201, the new admin appears in the table without a page reload.

- [x] **Step 3: Test Toggle Status**

Click "Suspend" on a non-owner admin row.

Expected: PATCH `/api/admin/admins/{id}/toggle-status` returns 200, the status badge in the row flips to "Suspended" without a reload.

- [x] **Step 4: Test Reset Password**

Click "Reset Password" on an active admin, enter a password of at least 8 chars.

Expected: PATCH `/api/admin/admins/{id}/reset-password` returns 200, alert shows "Password reset successfully."

- [x] **Step 5: Test Roles tab**

Click the "Roles" tab. Select different roles from the left panel.

Expected: The permission matrix on the right updates to match each role's `perms` config. No API errors in the console (this tab is entirely client-side).
