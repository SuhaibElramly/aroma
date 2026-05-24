# Admin Command Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the currently-static sidebar search bar into a real ⌘K command palette that combines page navigation with live entity search across products, users, orders, brands, and coupons.

**Architecture:** A new `CommandPalette.vue` overlay component, mounted once at the app root, controlled by a tiny `useCommandPalette` singleton-state composable. Opens via global ⌘K/Ctrl+K keydown or by clicking the sidebar search bar. Empty query shows permitted nav items; ≥2 chars triggers debounced parallel calls to existing admin API endpoints with `AbortController` cancellation. Single-highlight keyboard navigation across a flattened result list. Strict spec at `docs/superpowers/specs/2026-05-24-admin-command-palette-design.md`.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, vue-i18n, vue-router, axios, lucide-vue-next, Tailwind with existing `dash-*` design tokens. No Vue test framework exists in this codebase — verification is `npm run build` (which runs `vue-tsc -b`) plus manual browser exercise.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `aroma-admin/src/locales/en.ts` | Modify | Add `commandPalette` namespace. |
| `aroma-admin/src/locales/ar.ts` | Modify | Mirror `commandPalette` namespace in Arabic. |
| `aroma-admin/src/composables/useCommandPalette.ts` | Create | Module-scoped singleton state for open/close. |
| `aroma-admin/src/components/layout/CommandPalette.vue` | Create | Modal shell, input, grouped result list, keyboard navigation, result fetching. |
| `aroma-admin/src/components/layout/AppLayout.vue` | Modify | Mount `<CommandPalette />` once, register global ⌘K listener. |
| `aroma-admin/src/components/layout/Sidebar.vue` | Modify | Convert static search `<div>` to a `<button>` that calls `openPalette()`. |

---

## Task 1: Add i18n keys

**Files:**
- Modify: `aroma-admin/src/locales/en.ts` (after the `nav` block, ~line 38)
- Modify: `aroma-admin/src/locales/ar.ts` (matching position)

- [ ] **Step 1: Add `commandPalette` block to `en.ts`**

Insert between the `nav: { ... }` block (ends ~line 38) and `topbar: { ... }` (starts ~line 39):

```ts
  commandPalette: {
    placeholder:     'Search pages, products, customers, orders…',
    sectionNavigate: 'Navigate',
    sectionProducts: 'Products',
    sectionUsers:    'Customers',
    sectionOrders:   'Orders',
    sectionBrands:   'Brands',
    sectionCoupons:  'Coupons',
    emptyHint:       'Type to search across the admin',
    noResults:       'No matches',
    escHint:         'Esc',
  },
```

- [ ] **Step 2: Mirror block in `ar.ts`**

Insert at the same structural position in `ar.ts`:

```ts
  commandPalette: {
    placeholder:     'بحث في الصفحات، المنتجات، العملاء، الطلبات…',
    sectionNavigate: 'تصفح',
    sectionProducts: 'المنتجات',
    sectionUsers:    'العملاء',
    sectionOrders:   'الطلبات',
    sectionBrands:   'العلامات',
    sectionCoupons:  'الكوبونات',
    emptyHint:       'اكتب للبحث في لوحة التحكم',
    noResults:       'لا توجد نتائج',
    escHint:         'Esc',
  },
```

- [ ] **Step 3: Type-check**

Run from `aroma-admin/`:

```bash
npx vue-tsc -b
```

Expected: exits 0, no new errors. (Pre-existing `NotifKind` errors are tolerated — see admin-i18n memory.)

- [ ] **Step 4: Commit**

```bash
git add aroma-admin/src/locales/en.ts aroma-admin/src/locales/ar.ts
git commit -m "feat(admin): add commandPalette i18n keys"
```

---

## Task 2: Create `useCommandPalette` composable

**Files:**
- Create: `aroma-admin/src/composables/useCommandPalette.ts`

- [ ] **Step 1: Write the composable**

```ts
import { ref } from 'vue'

const open = ref(false)

export function useCommandPalette() {
  function openPalette()  { open.value = true  }
  function closePalette() { open.value = false }
  function togglePalette(){ open.value = !open.value }
  return { open, openPalette, closePalette, togglePalette }
}
```

- [ ] **Step 2: Type-check**

```bash
npx vue-tsc -b
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add aroma-admin/src/composables/useCommandPalette.ts
git commit -m "feat(admin): add useCommandPalette singleton state composable"
```

---

## Task 3: Create CommandPalette.vue (shell + nav-only behavior)

**Files:**
- Create: `aroma-admin/src/components/layout/CommandPalette.vue`

The component is created in two tasks. This task delivers a working palette that shows nav items and routes on Enter — entity search is added in Task 4.

- [ ] **Step 1: Write the component**

Full file contents:

```vue
<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Search,
  LayoutDashboard, ShoppingBag, Users, Package,
  SlidersHorizontal, Tag, Grid3X3, Ticket, ShieldCheck, Home,
} from 'lucide-vue-next'
import { useAuthStore } from '../../stores/auth'
import { useCommandPalette } from '../../composables/useCommandPalette'

type ResultKind = 'nav' | 'product' | 'user' | 'brand' | 'order' | 'coupon'

interface Result {
  kind:      ResultKind
  id:        string
  label:     string
  sub?:      string
  icon:      any
  to:        string
}

interface Section {
  key:   string
  label: string
  items: Result[]
}

const { t, locale } = useI18n()
const router = useRouter()
const auth   = useAuthStore()
const { open, closePalette } = useCommandPalette()

const query        = ref('')
const highlightIdx = ref(0)
const inputEl      = ref<HTMLInputElement | null>(null)
const listEl       = ref<HTMLDivElement | null>(null)

// ── Nav source (mirrors Sidebar.vue groups, flattened) ──────────────────
interface NavItem { key: string; label: string; icon: any; path: string; resource?: string }

const navItems = computed<NavItem[]>(() => {
  const all: NavItem[] = [
    { key: 'dashboard',  label: t('nav.dashboard'),  icon: LayoutDashboard,  path: 'dashboard' },
    { key: 'orders',     label: t('nav.orders'),     icon: ShoppingBag,      path: 'orders',     resource: 'orders' },
    { key: 'users',      label: t('nav.customers'),  icon: Users,            path: 'users',      resource: 'customers' },
    { key: 'products',   label: t('nav.products'),   icon: Package,          path: 'products',   resource: 'products' },
    { key: 'spec-types', label: t('nav.specTypes'),  icon: SlidersHorizontal,path: 'spec-types', resource: 'specs' },
    { key: 'brands',     label: t('nav.brands'),     icon: Tag,              path: 'brands',     resource: 'brands' },
    { key: 'categories', label: t('nav.categories'), icon: Grid3X3,          path: 'categories', resource: 'brands' },
    { key: 'coupons',    label: t('nav.coupons'),    icon: Ticket,           path: 'coupons',    resource: 'coupons' },
    { key: 'homepage',   label: t('nav.homepage'),   icon: Home,             path: 'homepage' },
    { key: 'admins',     label: t('nav.admins'),     icon: ShieldCheck,      path: 'admins',     resource: 'admins' },
  ]
  return all.filter(i => !i.resource || auth.can(i.resource, 'view'))
})

function matchesNav(item: NavItem, q: string): boolean {
  return item.label.toLowerCase().includes(q.toLowerCase())
}

// ── Sections ────────────────────────────────────────────────────────────
const sections = computed<Section[]>(() => {
  const q = query.value.trim()
  const navMatching = q
    ? navItems.value.filter(i => matchesNav(i, q))
    : navItems.value

  const navSection: Section = {
    key:   'nav',
    label: t('commandPalette.sectionNavigate'),
    items: navMatching.map<Result>(n => ({
      kind: 'nav', id: n.key, label: n.label, icon: n.icon, to: '/' + n.path,
    })),
  }

  // Entity sections are filled in Task 4. For now the palette is nav-only.
  const all: Section[] = [navSection]
  return all.filter(s => s.items.length > 0)
})

const flatItems = computed<Result[]>(() => sections.value.flatMap(s => s.items))

const showNoResults = computed(() =>
  query.value.trim().length >= 2 && flatItems.value.length === 0,
)

// ── Keyboard navigation ─────────────────────────────────────────────────
function clamp(i: number, len: number): number {
  if (len === 0) return 0
  if (i < 0)     return len - 1
  if (i >= len)  return 0
  return i
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape')      { e.preventDefault(); closePalette(); return }
  if (e.key === 'ArrowDown')   { e.preventDefault(); highlightIdx.value = clamp(highlightIdx.value + 1, flatItems.value.length); scrollHighlightIntoView(); return }
  if (e.key === 'ArrowUp')     { e.preventDefault(); highlightIdx.value = clamp(highlightIdx.value - 1, flatItems.value.length); scrollHighlightIntoView(); return }
  if (e.key === 'Home')        { e.preventDefault(); highlightIdx.value = 0; scrollHighlightIntoView(); return }
  if (e.key === 'End')         { e.preventDefault(); highlightIdx.value = Math.max(0, flatItems.value.length - 1); scrollHighlightIntoView(); return }
  if (e.key === 'Enter')       { e.preventDefault(); activate(highlightIdx.value); return }
}

function activate(idx: number) {
  const item = flatItems.value[idx]
  if (!item) return
  closePalette()
  router.push(item.to)
}

function scrollHighlightIntoView() {
  nextTick(() => {
    const el = listEl.value?.querySelector(`[data-cp-idx="${highlightIdx.value}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  })
}

// Reset highlight when results shrink past it
watch(flatItems, (items) => {
  if (highlightIdx.value >= items.length) highlightIdx.value = 0
})

// Reset on open; focus input
watch(open, async (v) => {
  if (v) {
    query.value = ''
    highlightIdx.value = 0
    await nextTick()
    inputEl.value?.focus()
  }
})

function onBackdrop() { closePalette() }

// Stop the outer keydown from also reacting when palette is open (handled inline)
onMounted(() => {})
onUnmounted(() => {})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      :dir="locale === 'ar' ? 'rtl' : 'ltr'"
      @keydown="onKeydown"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        @click="onBackdrop"
      />

      <!-- Card -->
      <div
        class="relative w-full max-w-[560px] bg-dash-paper border border-dash-border rounded-card shadow-xl overflow-hidden"
        @click.stop
      >
        <!-- Input row -->
        <div class="flex items-center gap-2 px-4 py-3 border-b border-dash-border-lt">
          <Search :size="16" class="text-dash-muted shrink-0" />
          <input
            ref="inputEl"
            v-model="query"
            :placeholder="t('commandPalette.placeholder')"
            class="flex-1 bg-transparent text-[14px] outline-none text-dash-text placeholder:text-dash-faint"
          />
          <button
            type="button"
            class="text-[10px] px-1.5 py-0.5 rounded border border-dash-border-lt text-dash-faint hover:text-dash-text"
            @click="closePalette"
          >
            {{ t('commandPalette.escHint') }}
          </button>
        </div>

        <!-- Result list -->
        <div ref="listEl" class="max-h-[60vh] overflow-y-auto py-2">
          <div v-if="sections.length === 0 && !showNoResults" class="px-4 py-8 text-center text-[12px] text-dash-faint">
            {{ t('commandPalette.emptyHint') }}
          </div>
          <div v-else-if="showNoResults" class="px-4 py-8 text-center text-[12px] text-dash-faint">
            {{ t('commandPalette.noResults') }}
          </div>
          <template v-else>
            <div v-for="section in sections" :key="section.key" class="mb-1">
              <p class="px-4 pt-2 pb-1 text-[10px] font-semibold tracking-[.18em] uppercase text-dash-faint">
                {{ section.label }}
              </p>
              <button
                v-for="(item, _i) in section.items"
                :key="`${section.key}-${item.id}`"
                type="button"
                :data-cp-idx="flatItems.indexOf(item)"
                class="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-start transition-colors"
                :class="flatItems.indexOf(item) === highlightIdx
                  ? 'bg-dash-bg text-dash-text'
                  : 'text-dash-text-2 hover:bg-dash-paper-2'"
                @mouseenter="highlightIdx = flatItems.indexOf(item)"
                @click="activate(flatItems.indexOf(item))"
              >
                <component :is="item.icon" :size="16" class="text-dash-muted shrink-0" />
                <span class="flex-1 truncate">{{ item.label }}</span>
                <span v-if="item.sub" class="text-[11px] text-dash-faint truncate max-w-[40%]">
                  {{ item.sub }}
                </span>
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>
```

- [ ] **Step 2: Type-check**

```bash
npx vue-tsc -b
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add aroma-admin/src/components/layout/CommandPalette.vue
git commit -m "feat(admin): add CommandPalette shell with nav-item routing"
```

---

## Task 4: Add entity search to CommandPalette

**Files:**
- Modify: `aroma-admin/src/components/layout/CommandPalette.vue`

This adds debounced parallel API calls to products, users, brands, orders, coupons with `AbortController` cancellation.

- [ ] **Step 1: Add API imports**

Replace the existing import line at the top of `<script setup>`:

```ts
import { useAuthStore } from '../../stores/auth'
import { useCommandPalette } from '../../composables/useCommandPalette'
```

with:

```ts
import { useAuthStore } from '../../stores/auth'
import { useCommandPalette } from '../../composables/useCommandPalette'
import { apiGetProducts, apiGetUsers, apiGetBrands, apiGetOrders, apiGetCoupons } from '../../api/admin'
import type { AdminProduct, AdminUserRow, AdminBrand, AdminOrder, AdminCoupon } from '../../types'
```

- [ ] **Step 2: Add entity state and fetcher**

Insert just after the `const navItems = computed<NavItem[]>(...)` block (before `function matchesNav`):

```ts
// ── Entity search state ─────────────────────────────────────────────────
const products = ref<AdminProduct[]>([])
const users    = ref<AdminUserRow[]>([])
const brands   = ref<AdminBrand[]>([])
const orders   = ref<AdminOrder[]>([])
const coupons  = ref<AdminCoupon[]>([])

let abortCtrl: AbortController | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function clearEntities() {
  products.value = []
  users.value    = []
  brands.value   = []
  orders.value   = []
  coupons.value  = []
}

async function fetchEntities(q: string) {
  if (abortCtrl) abortCtrl.abort()
  abortCtrl = new AbortController()
  const signal = abortCtrl.signal

  const tasks: Promise<unknown>[] = []
  const swallow = () => { /* surfacing inline errors in a search palette is noisier than it's worth */ }

  if (auth.can('products', 'view')) {
    tasks.push(
      apiGetProducts({ search: q, page: 1 })
        .then(r => { if (!signal.aborted) products.value = r.data.data.slice(0, 5) })
        .catch(swallow)
    )
  }

  if (auth.can('customers', 'view')) {
    // Backend matches `search` against name|email, and `phone` separately.
    // Route digit-prefixed queries to `phone`, everything else to `search`.
    const userParams: { search?: string; phone?: string; page: number } = { page: 1 }
    if (/^\d/.test(q)) userParams.phone  = q
    else               userParams.search = q
    tasks.push(
      apiGetUsers(userParams)
        .then(r => { if (!signal.aborted) users.value = r.data.data.slice(0, 5) })
        .catch(swallow)
    )
  }

  if (auth.can('brands', 'view')) {
    tasks.push(
      apiGetBrands({ name: q })
        .then(r => { if (!signal.aborted) brands.value = r.data.slice(0, 3) })
        .catch(swallow)
    )
  }

  if (auth.can('orders', 'view')) {
    const orderParams: { order_id?: string; phone?: string; page?: number } = { page: 1 }
    if (q.toUpperCase().startsWith('ORD')) orderParams.order_id = q
    else if (/^\d/.test(q))                orderParams.phone    = q
    if (orderParams.order_id || orderParams.phone) {
      tasks.push(
        apiGetOrders(orderParams)
          .then(r => { if (!signal.aborted) orders.value = r.data.data.slice(0, 3) })
          .catch(swallow)
      )
    } else {
      orders.value = []
    }
  }

  if (auth.can('coupons', 'view')) {
    tasks.push(
      apiGetCoupons({ search: q })
        .then(r => { if (!signal.aborted) coupons.value = r.data.slice(0, 3) })
        .catch(swallow)
    )
  }

  await Promise.all(tasks)
}

// Debounced reaction to query changes
watch(query, (q) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  const trimmed = q.trim()
  if (trimmed.length < 2) {
    if (abortCtrl) abortCtrl.abort()
    clearEntities()
    return
  }
  debounceTimer = setTimeout(() => fetchEntities(trimmed), 250)
})

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (abortCtrl)     abortCtrl.abort()
})
```

- [ ] **Step 3: Wire entity results into `sections`**

Replace the existing `sections` computed (the block currently ending with `const all: Section[] = [navSection]; return all.filter(s => s.items.length > 0)`) with:

```ts
const sections = computed<Section[]>(() => {
  const q = query.value.trim()
  const navMatching = q
    ? navItems.value.filter(i => matchesNav(i, q))
    : navItems.value

  const navSection: Section = {
    key:   'nav',
    label: t('commandPalette.sectionNavigate'),
    items: navMatching.map<Result>(n => ({
      kind: 'nav', id: n.key, label: n.label, icon: n.icon, to: '/' + n.path,
    })),
  }

  const productSection: Section = {
    key:   'products',
    label: t('commandPalette.sectionProducts'),
    items: products.value.map<Result>(p => ({
      kind: 'product', id: String(p.id), label: p.name,
      sub: p.brand || undefined, icon: Package, to: `/products/${p.id}`,
    })),
  }

  const userSection: Section = {
    key:   'users',
    label: t('commandPalette.sectionUsers'),
    items: users.value.map<Result>(u => ({
      kind: 'user', id: String(u.id), label: u.name || u.phone || u.email || `#${u.id}`,
      sub: u.phone || u.email || undefined, icon: Users, to: `/users/${u.id}`,
    })),
  }

  const brandSection: Section = {
    key:   'brands',
    label: t('commandPalette.sectionBrands'),
    items: brands.value.map<Result>(b => ({
      kind: 'brand', id: String(b.id), label: b.name,
      sub: b.origin ?? undefined, icon: Tag, to: `/brands/${b.id}`,
    })),
  }

  const orderSection: Section = {
    key:   'orders',
    label: t('commandPalette.sectionOrders'),
    items: orders.value.map<Result>(o => ({
      kind: 'order', id: String(o.id), label: `#${o.id}`,
      sub: o.status ?? undefined, icon: ShoppingBag, to: `/orders/${o.id}`,
    })),
  }

  const couponSection: Section = {
    key:   'coupons',
    label: t('commandPalette.sectionCoupons'),
    items: coupons.value.map<Result>(c => ({
      kind: 'coupon', id: String(c.id), label: c.code,
      sub: c.type, icon: Ticket, to: `/coupons`,
    })),
  }

  return [navSection, productSection, userSection, orderSection, brandSection, couponSection]
    .filter(s => s.items.length > 0)
})
```

- [ ] **Step 4: Update `showNoResults` (already correct; verify)**

The existing definition is fine:

```ts
const showNoResults = computed(() =>
  query.value.trim().length >= 2 && flatItems.value.length === 0,
)
```

No change required if already present.

- [ ] **Step 5: Remove the obsolete inline comment**

Delete the stale comment line:

```ts
// Entity sections are filled in Task 4. For now the palette is nav-only.
```

It's superseded by the Task 4 implementation.

- [ ] **Step 6: Type-check**

```bash
npx vue-tsc -b
```

Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add aroma-admin/src/components/layout/CommandPalette.vue
git commit -m "feat(admin): wire CommandPalette to live entity search"
```

---

## Task 5: Mount palette in AppLayout + register global keybind

**Files:**
- Modify: `aroma-admin/src/components/layout/AppLayout.vue`

- [ ] **Step 1: Add imports**

Replace the existing import block at the top of `<script setup>`:

```ts
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import Sidebar          from './Sidebar.vue'
import Topbar           from './Topbar.vue'
import NewProductDrawer from '../product/NewProductDrawer.vue'
import { useAuthStore } from '../../stores/auth'
import { useNotificationsStore } from '../../stores/notifications'
```

with:

```ts
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import Sidebar          from './Sidebar.vue'
import Topbar           from './Topbar.vue'
import CommandPalette   from './CommandPalette.vue'
import NewProductDrawer from '../product/NewProductDrawer.vue'
import { useAuthStore } from '../../stores/auth'
import { useNotificationsStore } from '../../stores/notifications'
import { useCommandPalette } from '../../composables/useCommandPalette'
```

- [ ] **Step 2: Register the global keybind**

Add after `const notif = useNotificationsStore()`:

```ts
const { togglePalette, closePalette, open: paletteOpen } = useCommandPalette()

function onGlobalKeydown(e: KeyboardEvent) {
  const isMod = e.metaKey || e.ctrlKey
  if (isMod && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    togglePalette()
    return
  }
  // Esc closes when palette is open (in case focus is outside the palette)
  if (e.key === 'Escape' && paletteOpen.value) {
    e.preventDefault()
    closePalette()
  }
}
```

- [ ] **Step 3: Wire it into mount/unmount**

Replace the existing lifecycle hooks:

```ts
onMounted(async () => {
  await auth.init()
  await notif.load()
  notif.startPolling()
})

onUnmounted(() => notif.stopPolling())
```

with:

```ts
onMounted(async () => {
  await auth.init()
  await notif.load()
  notif.startPolling()
  window.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  notif.stopPolling()
  window.removeEventListener('keydown', onGlobalKeydown)
})
```

- [ ] **Step 4: Mount the palette in the template**

Replace `<NewProductDrawer />` with:

```html
    <NewProductDrawer />
    <CommandPalette />
```

(Both stay; CommandPalette is added below it.)

- [ ] **Step 5: Type-check**

```bash
npx vue-tsc -b
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add aroma-admin/src/components/layout/AppLayout.vue
git commit -m "feat(admin): mount CommandPalette and register ⌘K keybind"
```

---

## Task 6: Convert sidebar search div to button

**Files:**
- Modify: `aroma-admin/src/components/layout/Sidebar.vue`

- [ ] **Step 1: Import the composable**

Add to the existing imports after `import { useAuthStore } from '../../stores/auth'`:

```ts
import { useCommandPalette } from '../../composables/useCommandPalette'
```

- [ ] **Step 2: Use the composable**

Add after `const auth = useAuthStore()`:

```ts
const { openPalette } = useCommandPalette()
```

- [ ] **Step 3: Replace the search block in the template**

Find the existing block (around lines 99-106):

```html
    <!-- Search -->
    <div class="px-3 mb-1">
      <div class="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-dash-border-lt bg-dash-paper-2 cursor-pointer">
        <Search :size="14" class="text-dash-faint shrink-0" />
        <span class="flex-1 text-[12.5px] text-dash-muted">{{ $t('nav.search') }}…</span>
        <kbd class="text-[10px] px-1.5 py-0.5 rounded border border-dash-border-lt bg-white text-dash-faint">⌘K</kbd>
      </div>
    </div>
```

Replace with:

```html
    <!-- Search -->
    <div class="px-3 mb-1">
      <button
        type="button"
        class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-dash-border-lt bg-dash-paper-2 hover:border-dash-border transition-colors text-start"
        @click="openPalette"
      >
        <Search :size="14" class="text-dash-faint shrink-0" />
        <span class="flex-1 text-[12.5px] text-dash-muted">{{ $t('nav.search') }}…</span>
        <kbd class="text-[10px] px-1.5 py-0.5 rounded border border-dash-border-lt bg-white text-dash-faint">⌘K</kbd>
      </button>
    </div>
```

- [ ] **Step 4: Type-check**

```bash
npx vue-tsc -b
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add aroma-admin/src/components/layout/Sidebar.vue
git commit -m "feat(admin): wire sidebar search button to CommandPalette"
```

---

## Task 7: Manual verification

**Files:** none modified.

- [ ] **Step 1: Start the dev server**

From `aroma-admin/`:

```bash
npm run dev
```

Expected: Vite starts and prints a local URL (typically `http://localhost:5173`).

- [ ] **Step 2: Verify open / close**

In the browser, after logging in:

1. Press **⌘K** (or Ctrl+K on Windows/Linux) → palette opens, input is focused.
2. Press **Esc** → palette closes.
3. Press **⌘K** again → opens.
4. Click outside the card (on the backdrop) → palette closes.
5. Click the sidebar search bar → palette opens.

All five should pass.

- [ ] **Step 3: Verify navigation (empty query)**

Open palette, leave input empty.

1. The nav items the current user has permission for should appear under "Navigate" / "تصفح".
2. Press **↓** repeatedly → highlight wraps around.
3. Press **↑** → moves up, wraps from top to bottom.
4. Press **Enter** on "Products" → palette closes, URL becomes `/products`.

- [ ] **Step 4: Verify entity search**

Open palette, type a known product name (≥2 chars).

1. After ~250ms, "Products" section should populate with up to 5 matches.
2. Type a customer name → "Customers" section populates.
3. Type a digit-prefixed string (e.g. `091`) → "Orders" section populates (assuming matching orders exist).
4. Type `ORD` followed by a known order id → "Orders" populates with that order.
5. Type 1 character → nothing fetches.
6. Clear the field → entity sections disappear, only nav items remain.

Click a product result → URL becomes `/products/{id}` and palette closes.

- [ ] **Step 5: Verify locale + RTL**

Switch admin locale to Arabic (existing topbar toggle).

1. Reopen palette → placeholder and section headings are Arabic.
2. The card and result rows are right-to-left aligned (icons on the right of labels).
3. ⌘K still works.

- [ ] **Step 6: Verify permissions**

If you have access to a non-owner admin account with limited permissions, log in as them and confirm:

1. Empty query → nav items only show what they can `view`.
2. Search results don't include entity types they lack permission for.

If no limited account is available, note this and skip — the code path is mechanical.

- [ ] **Step 7: Production build sanity**

```bash
npm run build
```

Expected: exits 0. (Pre-existing `NotifKind` errors in Sidebar.vue / Topbar.vue / AdminsView.vue / NotificationsView.vue are tolerated per memory; no new errors should appear.)

- [ ] **Step 8: Done**

No commit for this verification task. If anything failed, return to the failing task and fix.

---

## Spec Coverage Check

| Spec section | Covered by |
|---|---|
| Components table | Tasks 2, 3, 4, 5, 6 (1 file each, plus locale changes in Task 1) |
| Open / Close behavior | Task 5 (⌘K + Esc), Task 6 (click sidebar), Task 3 (Esc / backdrop) |
| Empty query nav source | Task 3 |
| Debounced ≥2-char entity search + abort | Task 4 |
| Per-entity endpoint mapping (incl. orders ORD/phone split) | Task 4 |
| Result selection routes | Task 4 (`to:` field per result kind) |
| Keyboard navigation (↑/↓/Home/End/Enter/Esc) | Task 3 |
| UI tokens, Teleport, RTL | Task 3 |
| i18n keys EN + AR | Task 1 |
| Permission gating (`auth.can`) | Task 3 (nav), Task 4 (entities) |
| Coupons / Brands array-vs-paginated shape difference | Task 4 (per-source adapter) |
| ⌘K `preventDefault` | Task 5 |

All spec sections are covered.
