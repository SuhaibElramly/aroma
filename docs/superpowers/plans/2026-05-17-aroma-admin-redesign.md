# Aroma Admin Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Redesign the Aroma admin panel to match the new design (warm parchment palette, Fraunces headings, RTL-ready) and implement all new features: profit stats on the dashboard, cost_price on variants, product discounts, and admin management with roles.

**Architecture:** The admin panel is Vue 3 + TypeScript + Tailwind CSS. The backend is Laravel 11 (aroma-api). The storefront is Next.js TypeScript (aroma). Design tokens live in `tailwind.config.js`; layout shells are in `src/components/layout/`; each page is a view in `src/views/`. New backend features are added as dedicated controllers under `app/Http/Controllers/Api/Admin/`.

**Tech Stack:** Vue 3 + Pinia + Vue Router + Tailwind CSS (admin); Laravel 11 + Sanctum + SQLite (API); Next.js 14 (storefront).

---

## File Map

### Modified files
- `aroma-admin/tailwind.config.js` — replace `dash-*` blue palette with warm cream/ink/teal/sage/fig tokens
- `aroma-admin/src/style.css` — add Fraunces font import
- `aroma-admin/src/components/layout/Sidebar.vue` — new design: logo, search, Workspace/Catalog/Settings groups, user card
- `aroma-admin/src/components/layout/Topbar.vue` — new design: Fraunces headline, notifications bell, EN/AR switcher, "New product" button
- `aroma-admin/src/components/layout/AppLayout.vue` — background token update
- `aroma-admin/src/locales/en.ts` — new keys: nav.settings, nav.admins, topbar.newProduct, notif.*, admins.*, productDetail.*
- `aroma-admin/src/locales/ar.ts` — Arabic translations for all new keys
- `aroma-admin/src/router/index.ts` — add `/products/:id` (detail) and `/admins` routes
- `aroma-admin/src/types/index.ts` — add `cost_price` to `ProductVariant`, add `ProductDiscount` type, add `AdminUser`/`AdminRole` types
- `aroma-admin/src/components/product/StepVariants.vue` — replace `original_price` with `cost_price` + live margin display
- `aroma-admin/src/views/DashboardView.vue` — update KPI cards + add ProfitBreakdown + P&L Snapshot panels
- `aroma-api/app/Models/ProductVariant.php` — add `cost_price` to fillable/casts
- `aroma-api/app/Http/Controllers/Api/Admin/AdminProductVariantController.php` — accept/return `cost_price`
- `aroma-api/app/Http/Controllers/Api/Admin/AdminDashboardController.php` — extend stats to include profit data
- `aroma-api/routes/api.php` — add admins + discounts routes

### Created files
- `aroma-api/database/migrations/2026_05_17_000001_add_cost_price_to_product_variants.php`
- `aroma-api/database/migrations/2026_05_17_000002_add_role_status_to_users.php`
- `aroma-api/database/migrations/2026_05_17_000003_create_product_discounts_table.php`
- `aroma-api/app/Models/ProductDiscount.php`
- `aroma-api/app/Http/Controllers/Api/Admin/AdminAdminsController.php`
- `aroma-api/app/Http/Controllers/Api/Admin/AdminProductDiscountController.php`
- `aroma-admin/src/views/ProductDetailView.vue`
- `aroma-admin/src/views/AdminsView.vue`

---

## Task 1: Design System — Tailwind Tokens + Fraunces Font

**Files:**
- Modify: `aroma-admin/tailwind.config.js`
- Modify: `aroma-admin/src/style.css`

- [x] **Step 1: Replace Tailwind palette**

Open `aroma-admin/tailwind.config.js` and replace the entire `colors.dash` block (and font family) with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        dash: {
          // Surfaces
          bg:          'oklch(95.5% 0.018 85)',    // --cream
          paper:       'oklch(98.2% 0.012 80)',    // --paper
          'paper-2':   'oklch(96.5% 0.016 80)',   // --paper-2
          // Borders
          border:      'oklch(89% 0.018 80)',      // --line
          'border-lt': 'oklch(92.5% 0.014 80)',   // --line-2
          // Text
          text:        'oklch(26% 0.04 250)',      // --ink
          'text-2':    'oklch(40% 0.04 245)',      // --ink-2
          muted:       'oklch(56% 0.035 240)',     // --muted
          faint:       'oklch(70% 0.025 235)',     // --faint
          // Teal (primary)
          primary:     'oklch(58% 0.075 205)',     // --teal
          'primary-dk':'oklch(46% 0.075 210)',     // --teal-dk
          'primary-lt':'oklch(94% 0.025 200)',     // --teal-lt
          // Sage (success)
          success:     'oklch(68% 0.045 140)',     // --sage
          'success-dk':'oklch(52% 0.045 145)',     // --sage-dk
          'success-lt':'oklch(94% 0.022 140)',     // --sage-lt
          // Fig (warning/amber)
          fig:         'oklch(75% 0.085 100)',     // --fig
          'fig-lt':    'oklch(94% 0.035 100)',     // --fig-lt
          // Rose (danger)
          danger:      'oklch(60% 0.13 25)',       // --rose
          'danger-lt': 'oklch(95% 0.025 25)',      // --rose-lt
        },
      },
      fontFamily: {
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        card: '16px',
        btn:  '10px',
        tag:  '8px',
      },
      boxShadow: {
        card:       '0 1px 4px oklch(26% 0.04 250 / 0.06), 0 0 1px oklch(26% 0.04 250 / 0.04)',
        'card-hover':'0 4px 16px oklch(26% 0.04 250 / 0.1), 0 1px 4px oklch(26% 0.04 250 / 0.06)',
        modal:      '0 8px 32px oklch(26% 0.04 250 / 0.12)',
        dropdown:   '0 4px 16px oklch(26% 0.04 250 / 0.1)',
      },
      animation: {
        'fade-up':  'fadeUp 0.22s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in':  'fadeIn 0.18s ease forwards',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1) forwards',
      },
      keyframes: {
        fadeUp:  { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}
```

- [x] **Step 2: Add Fraunces to style.css**

In `aroma-admin/src/style.css`, find the Google Fonts import line and add Fraunces:

```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..500&family=Inter:wght@300..700&family=Cairo:wght@300..700&display=swap');
```

Also update the body background:

```css
body {
  background-color: oklch(95.5% 0.018 85); /* dash-bg = cream */
  color: oklch(26% 0.04 250); /* dash-text = ink */
}
```

- [x] **Step 3: Start dev server and confirm no compile errors**

```bash
cd aroma-admin && npm run dev
```

Expected: Dev server starts, no TypeScript or Tailwind errors.

- [x] **Step 4: Commit**

```bash
git add aroma-admin/tailwind.config.js aroma-admin/src/style.css
git commit -m "feat(admin): replace dash-* blue palette with warm cream/ink design system, add Fraunces font"
```

---

## Task 2: Sidebar Redesign

**Files:**
- Modify: `aroma-admin/src/components/layout/Sidebar.vue`

The new sidebar has:
- Logo image (`/aroma-logo.png`) with `mix-blend-mode: multiply` in a cream box
- Brand name in Fraunces serif + "Admin" label
- `⌘K` search bar
- Nav groups: **Workspace** (Dashboard, Orders, Customers), **Catalog** (Products, Spec Types, Brands, Categories, Coupons), **Settings** (Admins)
- Active item: `bg-dash-text text-white` (navy background, white text)
- User card at bottom with avatar, name, email, sign-out

- [x] **Step 1: Rewrite Sidebar.vue**

Replace the full content of `aroma-admin/src/components/layout/Sidebar.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'

const { t, locale } = useI18n()
const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

const isActive = (path: string) => route.path.startsWith('/' + path)

const groups = computed(() => [
  {
    label: t('nav.workspace'),
    items: [
      { key: 'dashboard',  label: t('nav.dashboard'),  icon: '⊞', path: 'dashboard' },
      { key: 'orders',     label: t('nav.orders'),     icon: '◫', path: 'orders' },
      { key: 'users',      label: t('nav.customers'),  icon: '◯', path: 'users' },
    ],
  },
  {
    label: t('nav.catalog'),
    items: [
      { key: 'products',   label: t('nav.products'),   icon: '⬡', path: 'products' },
      { key: 'spec-types', label: t('nav.specTypes'),  icon: '≡',  path: 'spec-types' },
      { key: 'brands',     label: t('nav.brands'),     icon: '◈', path: 'brands' },
      { key: 'categories', label: t('nav.categories'), icon: '⊟', path: 'categories' },
      { key: 'coupons',    label: t('nav.coupons'),    icon: '◇', path: 'coupons' },
    ],
  },
  {
    label: t('nav.settings'),
    items: [
      { key: 'admins', label: t('nav.admins'), icon: '⬤', path: 'admins' },
    ],
  },
])

function signOut() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <aside
    class="flex flex-col w-60 shrink-0 h-screen bg-dash-paper border-e border-dash-border"
    :dir="locale === 'ar' ? 'rtl' : 'ltr'"
  >
    <!-- Logo -->
    <div class="flex items-center gap-3 px-5 pt-6 pb-4">
      <div class="w-9 h-9 rounded-lg bg-dash-bg flex items-center justify-center overflow-hidden shrink-0">
        <img src="/aroma-logo.png" alt="Aroma" class="w-8 h-8 object-contain" style="mix-blend-mode:multiply" />
      </div>
      <div class="min-w-0">
        <p class="font-display font-semibold text-dash-text text-sm leading-tight tracking-tight">Aroma</p>
        <p class="text-2xs text-dash-muted">{{ $t('nav.adminLabel') }}</p>
      </div>
    </div>

    <!-- Search -->
    <div class="px-3 mb-3">
      <div class="flex items-center gap-2 px-3 py-2 rounded-btn bg-dash-bg border border-dash-border text-dash-muted text-xs cursor-pointer hover:border-dash-primary/40 transition-colors">
        <span class="opacity-60">⌕</span>
        <span class="flex-1">{{ $t('nav.search') }}</span>
        <kbd class="opacity-50 font-sans">⌘K</kbd>
      </div>
    </div>

    <!-- Nav groups -->
    <nav class="flex-1 overflow-y-auto px-3 space-y-5 py-1">
      <div v-for="group in groups" :key="group.label">
        <p class="text-2xs font-medium text-dash-faint uppercase tracking-widest px-2 mb-1">{{ group.label }}</p>
        <ul class="space-y-0.5">
          <li v-for="item in group.items" :key="item.key">
            <router-link
              :to="'/' + item.path"
              class="flex items-center gap-2.5 px-2.5 py-2 rounded-btn text-sm transition-colors"
              :class="isActive(item.path)
                ? 'bg-dash-text text-white font-medium'
                : 'text-dash-text-2 hover:bg-dash-bg'"
            >
              <span class="text-base leading-none opacity-70">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </router-link>
          </li>
        </ul>
      </div>
    </nav>

    <!-- User card -->
    <div class="border-t border-dash-border px-3 py-3 mt-auto">
      <div class="flex items-center gap-2.5 px-2.5 py-2 rounded-btn hover:bg-dash-bg transition-colors cursor-default">
        <div class="w-8 h-8 rounded-full bg-dash-primary/20 flex items-center justify-center text-dash-primary font-semibold text-xs shrink-0">
          {{ auth.user?.name?.[0]?.toUpperCase() ?? 'A' }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium text-dash-text truncate">{{ auth.user?.name }}</p>
          <p class="text-2xs text-dash-muted truncate">{{ auth.user?.email }}</p>
        </div>
        <button @click="signOut" class="text-dash-muted hover:text-dash-danger transition-colors text-sm" :title="$t('topbar.signOut')">⇥</button>
      </div>
    </div>
  </aside>
</template>
```

- [x] **Step 2: Add missing i18n keys to en.ts and ar.ts** (nav.workspace, nav.adminLabel, nav.search, nav.settings, nav.admins)

In `aroma-admin/src/locales/en.ts`, inside the `nav` object add:

```ts
workspace: 'Workspace',
adminLabel: 'Admin',
search: 'Search',
settings: 'Settings',
admins: 'Admins',
```

In `aroma-admin/src/locales/ar.ts`, inside the `nav` object add:

```ts
workspace: 'الرئيسية',
adminLabel: 'المشرف',
search: 'بحث',
settings: 'الإعدادات',
admins: 'المشرفون',
```

- [x] **Step 3: Visual check in browser**

Navigate to `http://localhost:5173` (or whichever port Vite picked). Confirm: logo visible, nav groups render with correct labels, active route highlighted in navy.

- [x] **Step 4: Commit**

```bash
git add aroma-admin/src/components/layout/Sidebar.vue aroma-admin/src/locales/en.ts aroma-admin/src/locales/ar.ts
git commit -m "feat(admin): redesign sidebar — logo, search bar, Workspace/Catalog/Settings groups, user card"
```

---

## Task 3: Topbar Redesign

**Files:**
- Modify: `aroma-admin/src/components/layout/Topbar.vue`
- Modify: `aroma-admin/src/components/layout/AppLayout.vue`

The new topbar has:
- Left: small eyebrow label (`DASHBOARD`, `ORDERS`, etc.) + Fraunces hero heading (the page title)
- Right: date string, EN/AR language switcher, notifications bell (dropdown), "New product" button

- [x] **Step 1: Add topbar i18n keys**

In `aroma-admin/src/locales/en.ts`, inside `topbar`:

```ts
newProduct: 'New product',
notifications: 'Notifications',
markAllRead: 'Mark all read',
noNotifications: 'No new notifications',
```

In `aroma-admin/src/locales/ar.ts`, inside `topbar`:

```ts
newProduct: 'منتج جديد',
notifications: 'الإشعارات',
markAllRead: 'تعليم الكل مقروءًا',
noNotifications: 'لا إشعارات جديدة',
```

- [x] **Step 2: Rewrite Topbar.vue**

Replace the full content of `aroma-admin/src/components/layout/Topbar.vue`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const route  = useRoute()
const router = useRouter()

// Map route names → eyebrow + heading
const PAGE_META: Record<string, { eyebrow: string; heading: string }> = {
  dashboard:      { eyebrow: 'WORKSPACE',    heading: 'Dashboard' },
  orders:         { eyebrow: 'WORKSPACE',    heading: 'Orders' },
  'order-detail': { eyebrow: 'ORDERS',       heading: 'Order Detail' },
  users:          { eyebrow: 'WORKSPACE',    heading: 'Customers' },
  'user-detail':  { eyebrow: 'CUSTOMERS',   heading: 'Customer Detail' },
  products:       { eyebrow: 'CATALOG',      heading: 'Products' },
  'product-create': { eyebrow: 'PRODUCTS',  heading: 'New Product' },
  'product-edit': { eyebrow: 'PRODUCTS',    heading: 'Edit Product' },
  'product-detail': { eyebrow: 'PRODUCTS',  heading: 'Product Detail' },
  brands:         { eyebrow: 'CATALOG',      heading: 'Brands' },
  'brand-detail': { eyebrow: 'BRANDS',       heading: 'Brand Detail' },
  categories:     { eyebrow: 'CATALOG',      heading: 'Categories' },
  coupons:        { eyebrow: 'CATALOG',      heading: 'Coupons' },
  'spec-types':   { eyebrow: 'CATALOG',      heading: 'Spec Types' },
  admins:         { eyebrow: 'SETTINGS',     heading: 'Admins' },
}

const meta = computed(() => PAGE_META[route.name as string] ?? { eyebrow: '', heading: '' })

// Date
const today = new Date().toLocaleDateString(locale.value === 'ar' ? 'ar-LY' : 'en-GB', {
  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
})

// Language
function toggleLocale() {
  locale.value = locale.value === 'ar' ? 'en' : 'ar'
  document.documentElement.dir = locale.value === 'ar' ? 'rtl' : 'ltr'
}

// Notifications
const notifOpen = ref(false)
const notifications = ref([
  { id: 1, type: 'order', read: false, title: 'New order #1042', time: '2m ago' },
  { id: 2, type: 'stock', read: false, title: 'Low stock: Oud Royal 30ml', time: '1h ago' },
  { id: 3, type: 'order', read: true,  title: 'Order #1041 delivered', time: '3h ago' },
])
const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)
function markAllRead() { notifications.value.forEach(n => n.read = true) }
function closeNotif(e: MouseEvent) {
  if (!(e.target as Element).closest('[data-notif]')) notifOpen.value = false
}
</script>

<template>
  <header
    class="flex items-center gap-4 px-6 py-4 border-b border-dash-border bg-dash-paper"
    @click="closeNotif"
  >
    <!-- Left: eyebrow + heading -->
    <div class="flex-1 min-w-0">
      <p class="text-2xs font-medium text-dash-muted uppercase tracking-widest">{{ meta.eyebrow }}</p>
      <h1 class="font-display font-semibold text-dash-text text-xl leading-tight truncate">{{ meta.heading }}</h1>
    </div>

    <!-- Right: date, lang, bell, new product -->
    <div class="flex items-center gap-3 shrink-0">
      <span class="hidden md:block text-xs text-dash-muted">{{ today }}</span>

      <!-- EN/AR -->
      <button
        @click.stop="toggleLocale"
        class="h-8 px-3 rounded-btn border border-dash-border text-xs font-medium text-dash-text-2 hover:border-dash-primary/40 transition-colors"
      >
        {{ locale === 'ar' ? 'EN' : 'AR' }}
      </button>

      <!-- Notifications -->
      <div class="relative" data-notif>
        <button
          @click.stop="notifOpen = !notifOpen"
          class="relative h-8 w-8 flex items-center justify-center rounded-btn border border-dash-border text-dash-muted hover:border-dash-primary/40 transition-colors"
        >
          <span class="text-sm">🔔</span>
          <span
            v-if="unreadCount > 0"
            class="absolute -top-1 -end-1 h-4 min-w-4 px-1 bg-dash-danger text-white text-2xs rounded-full flex items-center justify-center"
          >{{ unreadCount }}</span>
        </button>

        <!-- Dropdown -->
        <div
          v-if="notifOpen"
          data-notif
          class="absolute end-0 top-10 w-80 bg-dash-paper border border-dash-border rounded-card shadow-dropdown z-50 animate-scale-in"
        >
          <div class="flex items-center justify-between px-4 py-3 border-b border-dash-border">
            <p class="text-sm font-medium text-dash-text">{{ $t('topbar.notifications') }}</p>
            <button @click="markAllRead" class="text-2xs text-dash-primary hover:underline">{{ $t('topbar.markAllRead') }}</button>
          </div>
          <ul v-if="notifications.length" class="max-h-72 overflow-y-auto divide-y divide-dash-border">
            <li
              v-for="n in notifications"
              :key="n.id"
              class="flex gap-3 px-4 py-3 text-xs"
              :class="n.read ? '' : 'bg-dash-primary-lt/30'"
            >
              <span class="mt-0.5 text-sm">{{ n.type === 'stock' ? '📦' : '🛒' }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-dash-text truncate">{{ n.title }}</p>
                <p class="text-dash-muted mt-0.5">{{ n.time }}</p>
              </div>
              <span v-if="!n.read" class="w-2 h-2 mt-1.5 rounded-full bg-dash-primary shrink-0"></span>
            </li>
          </ul>
          <p v-else class="px-4 py-6 text-xs text-dash-muted text-center">{{ $t('topbar.noNotifications') }}</p>
        </div>
      </div>

      <!-- New product -->
      <button
        @click="router.push('/products/new')"
        class="h-8 px-4 bg-dash-text text-white text-xs font-medium rounded-btn hover:bg-dash-text-2 transition-colors whitespace-nowrap"
      >
        + {{ $t('topbar.newProduct') }}
      </button>
    </div>
  </header>
</template>
```

- [x] **Step 3: Update AppLayout.vue background**

In `aroma-admin/src/components/layout/AppLayout.vue`, change the wrapper class to use `bg-dash-bg` instead of any hardcoded background. The file should look like:

```vue
<template>
  <div class="flex h-screen overflow-hidden bg-dash-bg">
    <Sidebar />
    <div class="flex flex-col flex-1 overflow-hidden">
      <Topbar />
      <main class="flex-1 overflow-y-auto p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import Sidebar from './Sidebar.vue'
import Topbar  from './Topbar.vue'
</script>
```

- [x] **Step 4: Visual check**

Confirm: eyebrow + Fraunces heading visible in topbar, notifications bell opens/closes, "New product" navigates to `/products/new`.

- [x] **Step 5: Commit**

```bash
git add aroma-admin/src/components/layout/Topbar.vue aroma-admin/src/components/layout/AppLayout.vue aroma-admin/src/locales/en.ts aroma-admin/src/locales/ar.ts
git commit -m "feat(admin): redesign topbar — Fraunces heading, notifications bell, EN/AR switcher, New product button"
```

---

## Task 4: Add `cost_price` to Product Variants (Backend)

**Files:**
- Create: `aroma-api/database/migrations/2026_05_17_000001_add_cost_price_to_product_variants.php`
- Modify: `aroma-api/app/Models/ProductVariant.php`
- Modify: `aroma-api/app/Http/Controllers/Api/Admin/AdminProductVariantController.php`

- [x] **Step 1: Create migration**

Create `aroma-api/database/migrations/2026_05_17_000001_add_cost_price_to_product_variants.php`:

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->decimal('cost_price', 10, 2)->nullable()->after('price');
        });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn('cost_price');
        });
    }
};
```

- [x] **Step 2: Run migration**

```bash
cd aroma-api && php artisan migrate
```

Expected: `Migrating: 2026_05_17_000001_add_cost_price_to_product_variants` followed by `Migrated`.

- [x] **Step 3: Update ProductVariant model**

In `aroma-api/app/Models/ProductVariant.php`, add `cost_price` to `$fillable` and `$casts`:

```php
protected $fillable = [
    'product_id', 'price', 'cost_price', 'original_price',
    'quantity', 'low_stock_threshold', 'stock', 'is_default',
];

protected $casts = [
    'price'               => 'decimal:2',
    'cost_price'          => 'decimal:2',
    'original_price'      => 'decimal:2',
    'quantity'            => 'integer',
    'low_stock_threshold' => 'integer',
    'stock'               => StockStatus::class,
    'is_default'          => 'boolean',
];
```

- [x] **Step 4: Update AdminProductVariantController to accept and return cost_price**

In `aroma-api/app/Http/Controllers/Api/Admin/AdminProductVariantController.php`:

In `store()` validation rules, add after `'original_price'`:
```php
'cost_price' => 'nullable|numeric|min:0',
```

In the `ProductVariant::create()` call inside `store()`, add:
```php
'cost_price' => $data['cost_price'] ?? null,
```

In `update()` validation rules, add:
```php
'cost_price' => 'nullable|numeric|min:0',
```

In `bulkUpdate()` validation rules, add:
```php
'variants.*.cost_price' => 'nullable|numeric|min:0',
```

In the `$variantMap[$item['id']]->update()` call in `bulkUpdate()`, add:
```php
'cost_price' => $item['cost_price'] ?? $variantMap[$item['id']]->cost_price,
```

In the `fmt()` private method, add `cost_price` to the returned array after `price`:
```php
'costPrice'         => $v->cost_price,
```

- [x] **Step 5: Verify with artisan tinker**

```bash
cd aroma-api && php artisan tinker --execute="echo App\Models\ProductVariant::first()?->cost_price ?? 'null';"
```

Expected: `null` (no cost set yet, but column exists).

- [x] **Step 6: Commit**

```bash
git add aroma-api/database/migrations/2026_05_17_000001_add_cost_price_to_product_variants.php \
        aroma-api/app/Models/ProductVariant.php \
        aroma-api/app/Http/Controllers/Api/Admin/AdminProductVariantController.php
git commit -m "feat(api): add cost_price column to product_variants for profit tracking"
```

---

## Task 5: Update StepVariants.vue (Frontend) with Cost Price + Margin

**Files:**
- Modify: `aroma-admin/src/components/product/StepVariants.vue`
- Modify: `aroma-admin/src/types/index.ts`

- [x] **Step 1: Add cost_price to TypeScript types**

In `aroma-admin/src/types/index.ts`, find the `ProductVariant` interface and add `costPrice`:

```ts
export interface ProductVariant {
  id: number
  productId: number
  price: number
  costPrice: number | null    // ← add
  originalPrice: number | null
  quantity: number
  lowStockThreshold: number
  stock: 'in_stock' | 'low_stock' | 'out_of_stock'
  isDefault: boolean
  specs: { name: string; unit: string | null; value: string }[]
}
```

- [x] **Step 2: Update StepVariants.vue variant table**

In `aroma-admin/src/components/product/StepVariants.vue`, find the variants table header and add a "Cost" column next to "Price":

```html
<th class="text-start text-xs font-medium text-dash-muted py-2 px-3">Cost (LYD)</th>
<th class="text-start text-xs font-medium text-dash-muted py-2 px-3">Selling price (LYD)</th>
<th class="text-start text-xs font-medium text-dash-muted py-2 px-3">Margin</th>
```

In each variant row, replace the single price input with cost + selling price inputs and a live margin display:

```html
<!-- Cost -->
<td class="px-3 py-2">
  <input
    v-model.number="variant.costPrice"
    type="number" min="0" step="0.01"
    class="w-24 rounded-btn border border-dash-border px-2 py-1.5 text-xs text-dash-text bg-dash-bg focus:outline-none focus:border-dash-primary"
    placeholder="0.00"
  />
</td>
<!-- Selling price -->
<td class="px-3 py-2">
  <input
    v-model.number="variant.price"
    type="number" min="0" step="0.01"
    class="w-24 rounded-btn border border-dash-border px-2 py-1.5 text-xs text-dash-text bg-dash-bg focus:outline-none focus:border-dash-primary"
    placeholder="0.00"
  />
</td>
<!-- Margin -->
<td class="px-3 py-2">
  <template v-if="variant.price && variant.costPrice != null">
    <span
      class="text-xs font-medium"
      :class="(variant.price - variant.costPrice) >= 0 ? 'text-dash-success' : 'text-dash-danger'"
    >
      {{ (variant.price - variant.costPrice).toFixed(2) }} LYD
      <span class="text-dash-muted font-normal">
        ({{ variant.price > 0 ? Math.round(((variant.price - variant.costPrice) / variant.price) * 100) : 0 }}%)
      </span>
    </span>
  </template>
  <span v-else class="text-dash-faint text-xs">—</span>
</td>
```

Make sure the variant object in the composable/ref includes `costPrice: null` as a default.

- [x] **Step 3: Update API calls in StepVariants.vue**

When building the payload for `store`/`bulkUpdate`, include `cost_price: variant.costPrice`.

- [x] **Step 4: Visual test**

Open `/products/new`, add a variant, enter a cost and selling price. Confirm the margin chip shows green/red correctly.

- [x] **Step 5: Commit**

```bash
git add aroma-admin/src/components/product/StepVariants.vue aroma-admin/src/types/index.ts
git commit -m "feat(admin): add cost price + live margin display to StepVariants"
```

---

## Task 6: Dashboard Profit Stats (Backend)

**Files:**
- Modify: `aroma-api/app/Http/Controllers/Api/Admin/AdminDashboardController.php`

The design adds to the dashboard:
- KPI cards: Revenue, Gross Profit, Avg Margin %, Orders
- ProfitBreakdown: horizontal bars per category (cost segment + profit segment)
- P&L Snapshot: Revenue → COGS → Gross profit → Discounts → Net profit

- [x] **Step 1: Read current AdminDashboardController**

```bash
cat aroma-api/app/Http/Controllers/Api/Admin/AdminDashboardController.php
```

- [x] **Step 2: Extend stats endpoint**

Add profit calculations to the `stats()` method. The cost data comes from `order_items` joined with `product_variants` (using `cost_price`). Since `cost_price` may be null for existing variants, fall back to 0.

In `AdminDashboardController.php`, after gathering existing revenue/orders data, add:

```php
use Illuminate\Support\Facades\DB;

// Gross profit: sum(selling_price * qty) - sum(cost_price * qty) for delivered orders
$profitData = DB::table('order_items as oi')
    ->join('orders as o', 'oi.order_id', '=', 'o.id')
    ->join('product_variants as pv', 'oi.variant_id', '=', 'pv.id')
    ->where('o.status', 'delivered')
    ->selectRaw('
        SUM(oi.price * oi.quantity) as revenue,
        SUM(COALESCE(pv.cost_price, 0) * oi.quantity) as cogs,
        SUM((oi.price - COALESCE(pv.cost_price, 0)) * oi.quantity) as gross_profit
    ')
    ->first();

$revenue     = (float) ($profitData->revenue ?? 0);
$cogs        = (float) ($profitData->cogs ?? 0);
$grossProfit = (float) ($profitData->gross_profit ?? 0);
$avgMargin   = $revenue > 0 ? round(($grossProfit / $revenue) * 100, 1) : 0;

// Per-category breakdown
$categoryBreakdown = DB::table('order_items as oi')
    ->join('orders as o', 'oi.order_id', '=', 'o.id')
    ->join('product_variants as pv', 'oi.variant_id', '=', 'pv.id')
    ->join('products as p', 'pv.product_id', '=', 'p.id')
    ->join('categories as c', 'p.category_id', '=', 'c.id')
    ->where('o.status', 'delivered')
    ->selectRaw('
        c.name as category,
        SUM(oi.price * oi.quantity) as revenue,
        SUM(COALESCE(pv.cost_price, 0) * oi.quantity) as cogs,
        SUM((oi.price - COALESCE(pv.cost_price, 0)) * oi.quantity) as profit
    ')
    ->groupBy('c.id', 'c.name')
    ->orderByDesc('revenue')
    ->limit(6)
    ->get()
    ->map(fn($row) => [
        'category' => $row->category,
        'revenue'  => (float) $row->revenue,
        'cogs'     => (float) $row->cogs,
        'profit'   => (float) $row->profit,
        'margin'   => $row->revenue > 0 ? round(($row->profit / $row->revenue) * 100, 1) : 0,
    ]);
```

Return these in the JSON response alongside existing stats:

```php
return response()->json([
    // existing stats...
    'grossProfit'       => $grossProfit,
    'avgMargin'         => $avgMargin,
    'cogs'              => $cogs,
    'categoryBreakdown' => $categoryBreakdown,
]);
```

- [x] **Step 3: Test endpoint**

```bash
cd aroma-api && php artisan tinker --execute="
  \$ctrl = app(App\Http\Controllers\Api\Admin\AdminDashboardController::class);
  \$resp = \$ctrl->stats();
  echo json_encode(json_decode(\$resp->getContent()), JSON_PRETTY_PRINT);
"
```

Expected: JSON includes `grossProfit`, `avgMargin`, `cogs`, `categoryBreakdown` keys.

- [x] **Step 4: Commit**

```bash
git add aroma-api/app/Http/Controllers/Api/Admin/AdminDashboardController.php
git commit -m "feat(api): extend dashboard stats with gross profit, avg margin, and category profit breakdown"
```

---

## Task 7: Dashboard Profit Stats (Frontend)

**Files:**
- Modify: `aroma-admin/src/views/DashboardView.vue`

- [x] **Step 1: Update KPI cards**

In `DashboardView.vue`, replace or update the KPI card section to show:
1. Revenue (existing)
2. Gross Profit (new — from `stats.grossProfit`)
3. Avg Margin % (new — from `stats.avgMargin`)
4. Orders (existing)

Each KPI card uses the existing `AStatCard` component or equivalent. Add the two new stat fields to the API data binding.

- [x] **Step 2: Add ProfitBreakdown panel**

Below the revenue chart row, add a new card for "Profit Breakdown by Category". It renders `stats.categoryBreakdown` as horizontal stacked bars:

```vue
<!-- Profit Breakdown -->
<div class="bg-dash-paper rounded-card border border-dash-border p-5">
  <p class="text-2xs font-medium text-dash-muted uppercase tracking-widest mb-4">Profit Breakdown</p>
  <ul class="space-y-3">
    <li v-for="cat in stats.categoryBreakdown" :key="cat.category">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-dash-text">{{ cat.category }}</span>
        <span class="text-xs text-dash-muted">{{ cat.margin }}% margin</span>
      </div>
      <div class="h-2 rounded-full bg-dash-bg overflow-hidden flex">
        <div
          class="h-full bg-dash-danger/40"
          :style="{ width: cat.revenue > 0 ? (cat.cogs / cat.revenue * 100) + '%' : '0%' }"
        ></div>
        <div
          class="h-full bg-dash-success"
          :style="{ width: cat.revenue > 0 ? (cat.profit / cat.revenue * 100) + '%' : '0%' }"
        ></div>
      </div>
    </li>
  </ul>
</div>
```

- [x] **Step 3: Add P&L Snapshot panel**

Next to the ProfitBreakdown card (side by side on md+), add a P&L Snapshot:

```vue
<!-- P&L Snapshot -->
<div class="bg-dash-paper rounded-card border border-dash-border p-5">
  <p class="text-2xs font-medium text-dash-muted uppercase tracking-widest mb-4">P&L Snapshot</p>
  <ul class="space-y-2.5">
    <li class="flex items-center justify-between">
      <span class="text-xs text-dash-text">Revenue</span>
      <span class="text-xs font-medium text-dash-text">{{ stats.revenue?.toFixed(2) }} LYD</span>
    </li>
    <li class="flex items-center justify-between">
      <span class="text-xs text-dash-muted">Cost of Goods</span>
      <span class="text-xs text-dash-danger">-{{ stats.cogs?.toFixed(2) }} LYD</span>
    </li>
    <li class="flex items-center justify-between border-t border-dash-border pt-2 mt-1">
      <span class="text-xs font-medium text-dash-text">Gross Profit</span>
      <span class="text-xs font-medium text-dash-success">{{ stats.grossProfit?.toFixed(2) }} LYD</span>
    </li>
    <li class="flex items-center justify-between">
      <span class="text-xs text-dash-muted">Avg Margin</span>
      <span class="text-xs font-medium text-dash-primary">{{ stats.avgMargin }}%</span>
    </li>
  </ul>
</div>
```

- [x] **Step 4: Visual check**

Navigate to Dashboard. Confirm: 4 KPI cards, profit breakdown bars, P&L snapshot all render with real data.

- [x] **Step 5: Commit**

```bash
git add aroma-admin/src/views/DashboardView.vue
git commit -m "feat(admin): add profit KPIs, category breakdown bars, and P&L snapshot to dashboard"
```

---

## Task 8: Product Detail Page

**Files:**
- Create: `aroma-api/database/migrations/2026_05_17_000003_create_product_discounts_table.php`
- Create: `aroma-api/app/Models/ProductDiscount.php`
- Create: `aroma-api/app/Http/Controllers/Api/Admin/AdminProductDiscountController.php`
- Modify: `aroma-api/routes/api.php`
- Create: `aroma-admin/src/views/ProductDetailView.vue`
- Modify: `aroma-admin/src/router/index.ts`

### 8a — Backend: Product Discounts

- [x] **Step 1: Create product_discounts migration**

Create `aroma-api/database/migrations/2026_05_17_000003_create_product_discounts_table.php`:

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('product_discounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->enum('type', ['percentage', 'fixed']);
            $table->decimal('value', 10, 2);
            $table->enum('scope', ['all', 'specific'])->default('all');
            $table->json('variant_ids')->nullable();  // null = all variants
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_discounts');
    }
};
```

- [x] **Step 2: Run migration**

```bash
cd aroma-api && php artisan migrate
```

Expected: `Migrated: 2026_05_17_000003_create_product_discounts_table`.

- [x] **Step 3: Create ProductDiscount model**

Create `aroma-api/app/Models/ProductDiscount.php`:

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductDiscount extends Model
{
    protected $fillable = [
        'product_id', 'name', 'type', 'value', 'scope', 'variant_ids',
        'starts_at', 'ends_at', 'is_active',
    ];

    protected $casts = [
        'value'       => 'decimal:2',
        'variant_ids' => 'array',
        'starts_at'   => 'datetime',
        'ends_at'     => 'datetime',
        'is_active'   => 'boolean',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    /** Compute discounted price for a given variant and selling price */
    public function applyTo(float $price, int $variantId): float
    {
        if ($this->scope === 'specific' && !in_array($variantId, $this->variant_ids ?? [])) {
            return $price;
        }
        return $this->type === 'percentage'
            ? max(0, $price * (1 - $this->value / 100))
            : max(0, $price - $this->value);
    }
}
```

- [x] **Step 4: Create AdminProductDiscountController**

Create `aroma-api/app/Http/Controllers/Api/Admin/AdminProductDiscountController.php`:

```php
<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductDiscount;
use Illuminate\Http\Request;

class AdminProductDiscountController extends Controller
{
    public function index(int $productId)
    {
        Product::findOrFail($productId);
        return response()->json(
            ProductDiscount::where('product_id', $productId)->orderByDesc('created_at')->get()
        );
    }

    public function store(Request $request, int $productId)
    {
        Product::findOrFail($productId);
        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'type'        => 'required|in:percentage,fixed',
            'value'       => 'required|numeric|min:0',
            'scope'       => 'required|in:all,specific',
            'variant_ids' => 'required_if:scope,specific|array|nullable',
            'variant_ids.*' => 'integer',
            'starts_at'   => 'nullable|date',
            'ends_at'     => 'nullable|date|after_or_equal:starts_at',
        ]);
        $discount = ProductDiscount::create(['product_id' => $productId] + $data);
        return response()->json($discount, 201);
    }

    public function destroy(int $productId, int $discountId)
    {
        $discount = ProductDiscount::where('product_id', $productId)->findOrFail($discountId);
        $discount->delete();
        return response()->json(null, 204);
    }

    public function toggle(int $productId, int $discountId)
    {
        $discount = ProductDiscount::where('product_id', $productId)->findOrFail($discountId);
        $discount->update(['is_active' => !$discount->is_active]);
        return response()->json($discount);
    }
}
```

- [x] **Step 5: Register routes in api.php**

In `aroma-api/routes/api.php`, inside the admin group, add after the existing product routes:

```php
use App\Http\Controllers\Api\Admin\AdminProductDiscountController;

Route::get('/products/{productId}/discounts',                    [AdminProductDiscountController::class, 'index']);
Route::post('/products/{productId}/discounts',                   [AdminProductDiscountController::class, 'store']);
Route::delete('/products/{productId}/discounts/{discountId}',    [AdminProductDiscountController::class, 'destroy']);
Route::patch('/products/{productId}/discounts/{discountId}/toggle', [AdminProductDiscountController::class, 'toggle']);
```

Also add `AdminProductDiscountController` to the `use` import at the top of the admin section.

- [x] **Step 6: Test routes**

```bash
cd aroma-api && php artisan route:list --path=admin/products | grep discount
```

Expected: Four discount routes listed.

- [x] **Step 7: Commit backend**

```bash
git add aroma-api/database/migrations/2026_05_17_000003_create_product_discounts_table.php \
        aroma-api/app/Models/ProductDiscount.php \
        aroma-api/app/Http/Controllers/Api/Admin/AdminProductDiscountController.php \
        aroma-api/routes/api.php
git commit -m "feat(api): add product_discounts table, model, and CRUD controller"
```

### 8b — Frontend: ProductDetailView.vue

- [x] **Step 8: Add route**

In `aroma-admin/src/router/index.ts`, add inside the children array after the product-edit route:

```ts
{ path: 'products/:id', name: 'product-detail', component: () => import('../views/ProductDetailView.vue'), props: true },
```

- [x] **Step 9: Add TypeScript types**

In `aroma-admin/src/types/index.ts`, add:

```ts
export interface ProductDiscount {
  id: number
  productId: number
  name: string
  type: 'percentage' | 'fixed'
  value: number
  scope: 'all' | 'specific'
  variantIds: number[] | null
  startsAt: string | null
  endsAt: string | null
  isActive: boolean
  createdAt: string
}
```

- [x] **Step 10: Create ProductDetailView.vue**

Create `aroma-admin/src/views/ProductDetailView.vue`:

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { ProductVariant, ProductDiscount } from '../types'

const props   = defineProps<{ id: string }>()
const route   = useRoute()
const router  = useRouter()
const { t }   = useI18n()

// ── State ──────────────────────────────────────────────────────────
const product   = ref<any>(null)
const variants  = ref<ProductVariant[]>([])
const discounts = ref<ProductDiscount[]>([])
const loading   = ref(true)
const error     = ref('')

// New discount form
const showDiscountForm = ref(false)
const form = ref({
  name: '', type: 'percentage' as 'percentage' | 'fixed',
  value: 0, scope: 'all' as 'all' | 'specific',
  variantIds: [] as number[], startsAt: '', endsAt: '',
})

// ── API helpers ────────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
const token = () => localStorage.getItem('auth_token') ?? ''
const headers = () => ({ 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json', 'Accept': 'application/json' })

async function load() {
  try {
    loading.value = true
    const [pRes, vRes, dRes] = await Promise.all([
      fetch(`${BASE}/admin/products/${props.id}`, { headers: headers() }),
      fetch(`${BASE}/admin/products/${props.id}/variants`, { headers: headers() }),
      fetch(`${BASE}/admin/products/${props.id}/discounts`, { headers: headers() }),
    ])
    product.value   = await pRes.json()
    variants.value  = await vRes.json()
    discounts.value = await dRes.json()
  } catch {
    error.value = 'Failed to load product'
  } finally {
    loading.value = false
  }
}

async function addDiscount() {
  const body: any = { ...form.value, variant_ids: form.value.scope === 'specific' ? form.value.variantIds : null }
  const res = await fetch(`${BASE}/admin/products/${props.id}/discounts`, {
    method: 'POST', headers: headers(), body: JSON.stringify(body),
  })
  if (res.ok) {
    discounts.value.unshift(await res.json())
    showDiscountForm.value = false
    form.value = { name: '', type: 'percentage', value: 0, scope: 'all', variantIds: [], startsAt: '', endsAt: '' }
  }
}

async function toggleDiscount(d: ProductDiscount) {
  const res = await fetch(`${BASE}/admin/products/${props.id}/discounts/${d.id}/toggle`, { method: 'PATCH', headers: headers() })
  if (res.ok) { const updated = await res.json(); Object.assign(d, updated) }
}

async function deleteDiscount(d: ProductDiscount) {
  if (!confirm('Delete this discount?')) return
  const res = await fetch(`${BASE}/admin/products/${props.id}/discounts/${d.id}`, { method: 'DELETE', headers: headers() })
  if (res.ok) discounts.value = discounts.value.filter(x => x.id !== d.id)
}

// Best active discount for a variant
function bestDiscount(variantId: number, price: number): { discountedPrice: number; discount: ProductDiscount | null } {
  const now = new Date()
  const applicable = discounts.value.filter(d => {
    if (!d.isActive) return false
    if (d.startsAt && new Date(d.startsAt) > now) return false
    if (d.endsAt && new Date(d.endsAt) < now) return false
    if (d.scope === 'specific' && !d.variantIds?.includes(variantId)) return false
    return true
  })
  if (!applicable.length) return { discountedPrice: price, discount: null }
  const best = applicable.reduce((a, b) => {
    const aDisc = a.type === 'percentage' ? price * a.value / 100 : a.value
    const bDisc = b.type === 'percentage' ? price * b.value / 100 : b.value
    return bDisc > aDisc ? b : a
  })
  const discountedPrice = best.type === 'percentage'
    ? Math.max(0, price * (1 - best.value / 100))
    : Math.max(0, price - best.value)
  return { discountedPrice, discount: best }
}

const activeDiscounts  = computed(() => discounts.value.filter(d => d.isActive))
const expiredDiscounts = computed(() => discounts.value.filter(d => !d.isActive))

onMounted(load)
</script>

<template>
  <div v-if="loading" class="flex items-center justify-center h-64 text-dash-muted text-sm">Loading…</div>
  <div v-else-if="error" class="text-dash-danger text-sm">{{ error }}</div>

  <div v-else class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <button @click="router.back()" class="text-xs text-dash-muted hover:text-dash-text flex items-center gap-1">
        ← {{ $t('common.back') }}
      </button>
      <button
        @click="router.push(`/products/${id}/edit`)"
        class="h-8 px-4 bg-dash-text text-white text-xs font-medium rounded-btn hover:opacity-90 transition-opacity"
      >
        {{ $t('common.edit') }}
      </button>
    </div>

    <!-- Hero card -->
    <div class="bg-dash-paper rounded-card border border-dash-border p-5">
      <div class="flex items-start gap-4">
        <div class="w-20 h-20 rounded-card bg-dash-bg flex items-center justify-center text-3xl shrink-0">🧴</div>
        <div class="flex-1 min-w-0">
          <p class="font-display font-semibold text-dash-text text-lg leading-tight">{{ product.name ?? product.name_en }}</p>
          <p class="text-xs text-dash-muted mt-0.5">{{ product.slug }}</p>
          <div class="flex gap-2 mt-2 flex-wrap">
            <span class="px-2 py-0.5 rounded-tag text-2xs font-medium" :class="product.is_active ? 'bg-dash-success-lt text-dash-success-dk' : 'bg-dash-fig-lt text-dash-fig'">
              {{ product.is_active ? 'Live' : 'Draft' }}
            </span>
            <span v-if="product.type" class="px-2 py-0.5 rounded-tag text-2xs bg-dash-primary-lt text-dash-primary-dk">{{ product.type }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Variants table -->
    <div class="bg-dash-paper rounded-card border border-dash-border overflow-hidden">
      <div class="px-5 py-4 border-b border-dash-border">
        <p class="text-sm font-medium text-dash-text">Variants</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-dash-bg">
            <tr>
              <th class="text-start text-dash-muted font-medium py-2 px-4">Variant</th>
              <th class="text-start text-dash-muted font-medium py-2 px-4">Cost</th>
              <th class="text-start text-dash-muted font-medium py-2 px-4">Price</th>
              <th class="text-start text-dash-muted font-medium py-2 px-4">Discounted</th>
              <th class="text-start text-dash-muted font-medium py-2 px-4">Margin</th>
              <th class="text-start text-dash-muted font-medium py-2 px-4">Stock</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-dash-border">
            <tr v-for="v in variants" :key="v.id" class="hover:bg-dash-bg/50 transition-colors">
              <td class="py-3 px-4">
                <span class="text-dash-text">{{ v.specs.map(s => `${s.value}${s.unit ?? ''}`).join(' / ') || 'Default' }}</span>
                <span v-if="v.isDefault" class="ms-2 px-1.5 py-0.5 rounded text-2xs bg-dash-primary-lt text-dash-primary-dk">Default</span>
              </td>
              <td class="py-3 px-4 text-dash-muted">{{ v.costPrice != null ? v.costPrice + ' LYD' : '—' }}</td>
              <td class="py-3 px-4 font-medium text-dash-text">{{ Number(v.price).toFixed(2) }} LYD</td>
              <td class="py-3 px-4">
                <template v-if="bestDiscount(v.id, Number(v.price)).discount">
                  <span class="font-medium text-dash-success">{{ bestDiscount(v.id, Number(v.price)).discountedPrice.toFixed(2) }} LYD</span>
                  <span class="ms-1 line-through text-dash-muted">{{ Number(v.price).toFixed(2) }}</span>
                </template>
                <span v-else class="text-dash-muted">—</span>
              </td>
              <td class="py-3 px-4">
                <template v-if="v.costPrice != null && Number(v.price) > 0">
                  <span :class="(Number(v.price) - v.costPrice) >= 0 ? 'text-dash-success' : 'text-dash-danger'" class="font-medium">
                    {{ Math.round(((Number(v.price) - v.costPrice) / Number(v.price)) * 100) }}%
                  </span>
                </template>
                <span v-else class="text-dash-faint">—</span>
              </td>
              <td class="py-3 px-4">
                <span
                  class="px-2 py-0.5 rounded-tag text-2xs font-medium"
                  :class="{
                    'bg-dash-success-lt text-dash-success-dk': v.stock === 'in_stock',
                    'bg-dash-fig-lt text-dash-fig':            v.stock === 'low_stock',
                    'bg-dash-danger-lt text-dash-danger':      v.stock === 'out_of_stock',
                  }"
                >
                  {{ v.quantity }} · {{ v.stock === 'in_stock' ? 'In stock' : v.stock === 'low_stock' ? 'Low' : 'Out' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Discounts -->
    <div class="bg-dash-paper rounded-card border border-dash-border p-5">
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm font-medium text-dash-text">Discounts</p>
        <button
          @click="showDiscountForm = !showDiscountForm"
          class="h-7 px-3 bg-dash-text text-white text-xs rounded-btn hover:opacity-90 transition-opacity"
        >
          + Add discount
        </button>
      </div>

      <!-- Composer -->
      <form v-if="showDiscountForm" @submit.prevent="addDiscount" class="mb-5 p-4 rounded-card bg-dash-bg border border-dash-border space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-2xs text-dash-muted mb-1 block">Name</label>
            <input v-model="form.name" required placeholder="Summer sale" class="w-full rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-paper text-dash-text focus:outline-none focus:border-dash-primary" />
          </div>
          <div>
            <label class="text-2xs text-dash-muted mb-1 block">Type</label>
            <select v-model="form.type" class="w-full rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-paper text-dash-text focus:outline-none focus:border-dash-primary">
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed amount (LYD)</option>
            </select>
          </div>
          <div>
            <label class="text-2xs text-dash-muted mb-1 block">Value</label>
            <input v-model.number="form.value" type="number" min="0" required class="w-full rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-paper text-dash-text focus:outline-none focus:border-dash-primary" />
          </div>
          <div>
            <label class="text-2xs text-dash-muted mb-1 block">Scope</label>
            <select v-model="form.scope" class="w-full rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-paper text-dash-text focus:outline-none focus:border-dash-primary">
              <option value="all">All variants</option>
              <option value="specific">Specific variants</option>
            </select>
          </div>
          <div v-if="form.scope === 'specific'" class="col-span-2">
            <label class="text-2xs text-dash-muted mb-1 block">Variants</label>
            <div class="flex flex-wrap gap-2">
              <label v-for="v in variants" :key="v.id" class="flex items-center gap-1.5 text-xs text-dash-text cursor-pointer">
                <input type="checkbox" :value="v.id" v-model="form.variantIds" class="accent-dash-primary" />
                {{ v.specs.map(s => `${s.value}${s.unit ?? ''}`).join(' / ') || 'Default' }}
              </label>
            </div>
          </div>
          <div>
            <label class="text-2xs text-dash-muted mb-1 block">Starts at</label>
            <input v-model="form.startsAt" type="datetime-local" class="w-full rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-paper text-dash-text focus:outline-none focus:border-dash-primary" />
          </div>
          <div>
            <label class="text-2xs text-dash-muted mb-1 block">Ends at</label>
            <input v-model="form.endsAt" type="datetime-local" class="w-full rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-paper text-dash-text focus:outline-none focus:border-dash-primary" />
          </div>
        </div>
        <div class="flex gap-2 justify-end">
          <button type="button" @click="showDiscountForm = false" class="h-8 px-4 border border-dash-border rounded-btn text-xs text-dash-text hover:bg-dash-bg transition-colors">Cancel</button>
          <button type="submit" class="h-8 px-4 bg-dash-text text-white rounded-btn text-xs hover:opacity-90 transition-opacity">Save discount</button>
        </div>
      </form>

      <!-- Active discounts -->
      <div v-if="activeDiscounts.length">
        <p class="text-2xs font-medium text-dash-muted uppercase tracking-widest mb-2">Active</p>
        <ul class="space-y-2 mb-4">
          <li v-for="d in activeDiscounts" :key="d.id" class="flex items-center gap-3 p-3 rounded-card bg-dash-success-lt border border-dash-border">
            <span class="flex-1 text-xs text-dash-text font-medium">{{ d.name }}</span>
            <span class="text-xs text-dash-muted">{{ d.type === 'percentage' ? d.value + '%' : d.value + ' LYD' }}</span>
            <span class="text-xs text-dash-muted">{{ d.scope === 'all' ? 'All variants' : 'Specific' }}</span>
            <button @click="toggleDiscount(d)" class="text-2xs text-dash-muted hover:text-dash-fig px-2 py-1 rounded border border-dash-border">Pause</button>
            <button @click="deleteDiscount(d)" class="text-2xs text-dash-danger hover:underline">Delete</button>
          </li>
        </ul>
      </div>

      <!-- Past / paused discounts -->
      <div v-if="expiredDiscounts.length">
        <p class="text-2xs font-medium text-dash-muted uppercase tracking-widest mb-2">Paused / Expired</p>
        <ul class="space-y-2">
          <li v-for="d in expiredDiscounts" :key="d.id" class="flex items-center gap-3 p-3 rounded-card bg-dash-bg border border-dash-border opacity-70">
            <span class="flex-1 text-xs text-dash-text">{{ d.name }}</span>
            <span class="text-xs text-dash-muted">{{ d.type === 'percentage' ? d.value + '%' : d.value + ' LYD' }}</span>
            <button @click="toggleDiscount(d)" class="text-2xs text-dash-primary hover:underline px-2 py-1 rounded border border-dash-border">Reactivate</button>
            <button @click="deleteDiscount(d)" class="text-2xs text-dash-danger hover:underline">Delete</button>
          </li>
        </ul>
      </div>

      <p v-if="!discounts.length && !showDiscountForm" class="text-xs text-dash-muted text-center py-6">No discounts yet.</p>
    </div>
  </div>
</template>
```

- [x] **Step 11: Wire product cards to navigate to detail**

In `aroma-admin/src/views/ProductsView.vue`, make product cards/rows link to `/products/:id` instead of `/products/:id/edit` (clicking the name/row goes to detail; edit still uses the pencil icon).

Find the router-link or click handler on the product card and change it to:
```ts
router.push(`/products/${product.id}`)
```

- [x] **Step 12: Visual test**

Navigate to Products, click a product card. Confirm the detail page shows: hero card, variants table with margins, discounts panel. Add a discount and confirm it appears in the active list.

- [x] **Step 13: Commit**

```bash
git add aroma-admin/src/views/ProductDetailView.vue \
        aroma-admin/src/router/index.ts \
        aroma-admin/src/types/index.ts \
        aroma-admin/src/views/ProductsView.vue
git commit -m "feat(admin): add product detail page with variants table and discount management"
```

---

## Task 9: Admin Management (Backend)

**Files:**
- Create: `aroma-api/database/migrations/2026_05_17_000002_add_role_status_to_users.php`
- Create: `aroma-api/app/Http/Controllers/Api/Admin/AdminAdminsController.php`
- Modify: `aroma-api/routes/api.php`

- [x] **Step 1: Create migration for role + status on users**

Create `aroma-api/database/migrations/2026_05_17_000002_add_role_status_to_users.php`:

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('admin')->after('is_admin');
            // Roles: owner, admin, catalog_manager, sales, support, read_only
            $table->string('admin_status')->default('active')->after('role');
            // admin_status: active, suspended (not the same as the user's general status)
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'admin_status']);
        });
    }
};
```

- [x] **Step 2: Run migration**

```bash
cd aroma-api && php artisan migrate
```

Expected: Migration for `add_role_status_to_users` migrated successfully.

- [x] **Step 3: Create AdminAdminsController**

Create `aroma-api/app/Http/Controllers/Api/Admin/AdminAdminsController.php`:

```php
<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminAdminsController extends Controller
{
    private function fmt(User $u): array
    {
        return [
            'id'          => $u->id,
            'name'        => $u->name,
            'phone'       => $u->phone,
            'email'       => $u->email,
            'role'        => $u->role,
            'adminStatus' => $u->admin_status,
            'createdAt'   => $u->created_at,
            'lastLoginAt' => null, // extend later if needed
        ];
    }

    public function index()
    {
        $admins = User::where('is_admin', true)->orderBy('created_at')->get();
        return response()->json($admins->map(fn($u) => $this->fmt($u)));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:100',
            'phone'    => 'required|string|max:20|unique:users,phone',
            'role'     => ['required', Rule::in(['admin', 'catalog_manager', 'sales', 'support', 'read_only'])],
            'password' => 'required|string|min:8',
        ]);

        $user = User::create([
            'name'       => $data['name'],
            'phone'      => $data['phone'],
            'email'      => $data['phone'] . '@admin.local', // placeholder, phone is the login identifier
            'password'   => Hash::make($data['password']),
            'is_admin'   => true,
            'role'       => $data['role'],
            'admin_status' => 'active',
        ]);

        return response()->json($this->fmt($user), 201);
    }

    public function update(Request $request, int $id)
    {
        $user = User::where('is_admin', true)->findOrFail($id);
        $data = $request->validate([
            'role' => ['sometimes', Rule::in(['admin', 'catalog_manager', 'sales', 'support', 'read_only'])],
            'name' => 'sometimes|string|max:100',
        ]);
        $user->update($data);
        return response()->json($this->fmt($user));
    }

    public function resetPassword(Request $request, int $id)
    {
        $user = User::where('is_admin', true)->findOrFail($id);
        $data = $request->validate(['password' => 'required|string|min:8']);
        $user->update(['password' => Hash::make($data['password'])]);
        return response()->json(['message' => 'Password reset successfully']);
    }

    public function toggleStatus(int $id)
    {
        $user = User::where('is_admin', true)->findOrFail($id);
        // Prevent suspending owner
        if ($user->role === 'owner') {
            return response()->json(['message' => 'Cannot suspend the owner'], 422);
        }
        $user->update(['admin_status' => $user->admin_status === 'active' ? 'suspended' : 'active']);
        return response()->json($this->fmt($user));
    }
}
```

- [x] **Step 4: Also update AuthController to support phone login**

In `aroma-api/app/Http/Controllers/Api/AuthController.php`, find the `login()` method. Currently it authenticates by email. Admin login should also check `phone` field. Add a fallback:

```php
// In login(), before the standard attempt:
$user = \App\Models\User::where('phone', $request->email)->first(); // phone submitted in email field for admin login
if ($user && \Illuminate\Support\Facades\Hash::check($request->password, $user->password)) {
    $token = $user->createToken('auth')->plainTextToken;
    return response()->json(['token' => $token, 'user' => $user]);
}
```

Or alternatively, update the existing attempt to check phone OR email:
```php
$credentials = $request->validate(['email' => 'required|string', 'password' => 'required']);
// Try by email first, then by phone
$user = \App\Models\User::where('email', $credentials['email'])
    ->orWhere('phone', $credentials['email'])
    ->first();
if (!$user || !\Illuminate\Support\Facades\Hash::check($credentials['password'], $user->password)) {
    return response()->json(['message' => 'Invalid credentials'], 401);
}
$token = $user->createToken('auth')->plainTextToken;
return response()->json(['token' => $token, 'user' => $user]);
```

Check what the current `login()` looks like before applying this. The pattern above is the intent — adapt to the existing code structure.

- [x] **Step 5: Register admin routes in api.php**

Add to the admin group in `routes/api.php`:

```php
use App\Http\Controllers\Api\Admin\AdminAdminsController;

Route::get('/admins',                         [AdminAdminsController::class, 'index']);
Route::post('/admins',                        [AdminAdminsController::class, 'store']);
Route::put('/admins/{id}',                    [AdminAdminsController::class, 'update']);
Route::patch('/admins/{id}/reset-password',   [AdminAdminsController::class, 'resetPassword']);
Route::patch('/admins/{id}/toggle-status',    [AdminAdminsController::class, 'toggleStatus']);
```

- [x] **Step 6: Test**

```bash
cd aroma-api && php artisan route:list --path=admin/admins
```

Expected: Five admin routes listed.

- [x] **Step 7: Commit backend**

```bash
git add aroma-api/database/migrations/2026_05_17_000002_add_role_status_to_users.php \
        aroma-api/app/Http/Controllers/Api/Admin/AdminAdminsController.php \
        aroma-api/routes/api.php \
        aroma-api/app/Http/Controllers/Api/AuthController.php
git commit -m "feat(api): add admin management — role/status on users, AdminAdminsController, phone login support"
```

---

## Task 10: Admin Management (Frontend)

**Files:**
- Create: `aroma-admin/src/views/AdminsView.vue`
- Modify: `aroma-admin/src/router/index.ts`
- Modify: `aroma-admin/src/locales/en.ts` and `ar.ts`

- [x] **Step 1: Add i18n keys**

In `aroma-admin/src/locales/en.ts`, add an `admins` section:

```ts
admins: {
  title: 'Admins',
  newAdmin: 'New admin',
  members: 'Members',
  roles: 'Roles & Permissions',
  name: 'Name',
  phone: 'Phone',
  role: 'Role',
  status: 'Status',
  active: 'Active',
  suspended: 'Suspended',
  actions: 'Actions',
  editRole: 'Edit role',
  resetPassword: 'Reset password',
  suspend: 'Suspend',
  activate: 'Activate',
  createAdmin: 'Create admin',
  tempPassword: 'Temporary password',
  generate: 'Generate',
  roles_owner: 'Owner',
  roles_admin: 'Admin',
  roles_catalog_manager: 'Catalog Manager',
  roles_sales: 'Sales',
  roles_support: 'Support',
  roles_read_only: 'Read-only',
},
```

In `ar.ts`, add the corresponding Arabic:

```ts
admins: {
  title: 'المشرفون',
  newAdmin: 'مشرف جديد',
  members: 'الأعضاء',
  roles: 'الأدوار والصلاحيات',
  name: 'الاسم',
  phone: 'الهاتف',
  role: 'الدور',
  status: 'الحالة',
  active: 'نشط',
  suspended: 'موقوف',
  actions: 'إجراءات',
  editRole: 'تعديل الدور',
  resetPassword: 'إعادة تعيين كلمة المرور',
  suspend: 'إيقاف',
  activate: 'تفعيل',
  createAdmin: 'إنشاء مشرف',
  tempPassword: 'كلمة مرور مؤقتة',
  generate: 'توليد',
  roles_owner: 'المالك',
  roles_admin: 'مشرف',
  roles_catalog_manager: 'مدير الكتالوج',
  roles_sales: 'مبيعات',
  roles_support: 'دعم',
  roles_read_only: 'قراءة فقط',
},
```

- [x] **Step 2: Add route**

In `aroma-admin/src/router/index.ts`, add inside the children array:

```ts
{ path: 'admins', name: 'admins', component: () => import('../views/AdminsView.vue') },
```

- [x] **Step 3: Create AdminsView.vue**

Create `aroma-admin/src/views/AdminsView.vue`:

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface AdminUser {
  id: number; name: string; phone: string; role: string; adminStatus: 'active' | 'suspended'; createdAt: string
}

const admins  = ref<AdminUser[]>([])
const loading = ref(true)
const showForm = ref(false)
const form = ref({ name: '', phone: '', role: 'admin', password: '' })

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
const token = () => localStorage.getItem('auth_token') ?? ''
const headers = () => ({ 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json', 'Accept': 'application/json' })

async function load() {
  try {
    loading.value = true
    const res = await fetch(`${BASE}/admin/admins`, { headers: headers() })
    admins.value = await res.json()
  } finally {
    loading.value = false }
}

async function createAdmin() {
  const res = await fetch(`${BASE}/admin/admins`, {
    method: 'POST', headers: headers(), body: JSON.stringify(form.value),
  })
  if (res.ok) {
    admins.value.push(await res.json())
    showForm.value = false
    form.value = { name: '', phone: '', role: 'admin', password: '' }
  }
}

async function toggleStatus(a: AdminUser) {
  const res = await fetch(`${BASE}/admin/admins/${a.id}/toggle-status`, { method: 'PATCH', headers: headers() })
  if (res.ok) { const updated = await res.json(); Object.assign(a, updated) }
}

async function resetPassword(a: AdminUser) {
  const pw = prompt('New temporary password (min 8 chars):')
  if (!pw || pw.length < 8) return
  const res = await fetch(`${BASE}/admin/admins/${a.id}/reset-password`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify({ password: pw }),
  })
  if (res.ok) alert('Password reset successfully.')
}

function generatePassword() {
  form.value.password = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase()
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', admin: 'Admin', catalog_manager: 'Catalog Manager',
  sales: 'Sales', support: 'Support', read_only: 'Read-only',
}
const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-dash-fig-lt text-dash-fig',
  admin: 'bg-dash-primary-lt text-dash-primary-dk',
  catalog_manager: 'bg-dash-success-lt text-dash-success-dk',
  sales: 'bg-dash-paper-2 text-dash-text-2',
  support: 'bg-dash-paper-2 text-dash-text-2',
  read_only: 'bg-dash-bg text-dash-muted',
}

const stats = computed(() => ({
  total:     admins.value.length,
  active:    admins.value.filter(a => a.adminStatus === 'active').length,
  suspended: admins.value.filter(a => a.adminStatus === 'suspended').length,
}))

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <!-- Stats strip -->
    <div class="grid grid-cols-3 gap-4">
      <div v-for="(val, label) in { 'Total Admins': stats.total, 'Active': stats.active, 'Suspended': stats.suspended }"
           :key="label"
           class="bg-dash-paper rounded-card border border-dash-border px-5 py-4">
        <p class="text-2xs text-dash-muted uppercase tracking-widest mb-1">{{ label }}</p>
        <p class="font-display text-2xl font-semibold text-dash-text">{{ val }}</p>
      </div>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium text-dash-text">Team Members</p>
      <button @click="showForm = !showForm" class="h-8 px-4 bg-dash-text text-white text-xs font-medium rounded-btn hover:opacity-90 transition-opacity">
        + {{ $t('admins.newAdmin') }}
      </button>
    </div>

    <!-- Create form -->
    <form v-if="showForm" @submit.prevent="createAdmin" class="bg-dash-paper rounded-card border border-dash-border p-5 space-y-4">
      <p class="text-sm font-medium text-dash-text mb-3">{{ $t('admins.createAdmin') }}</p>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-2xs text-dash-muted mb-1 block">{{ $t('admins.name') }}</label>
          <input v-model="form.name" required class="w-full rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary" />
        </div>
        <div>
          <label class="text-2xs text-dash-muted mb-1 block">{{ $t('admins.phone') }}</label>
          <input v-model="form.phone" required dir="ltr" class="w-full rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary" placeholder="+218..." />
        </div>
        <div>
          <label class="text-2xs text-dash-muted mb-1 block">{{ $t('admins.role') }}</label>
          <select v-model="form.role" class="w-full rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary">
            <option value="admin">Admin</option>
            <option value="catalog_manager">Catalog Manager</option>
            <option value="sales">Sales</option>
            <option value="support">Support</option>
            <option value="read_only">Read-only</option>
          </select>
        </div>
        <div>
          <label class="text-2xs text-dash-muted mb-1 block">{{ $t('admins.tempPassword') }}</label>
          <div class="flex gap-2">
            <input v-model="form.password" required type="text" dir="ltr" class="flex-1 rounded-btn border border-dash-border px-3 py-2 text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary font-mono" />
            <button type="button" @click="generatePassword" class="h-8 px-3 border border-dash-border rounded-btn text-xs text-dash-text hover:bg-dash-bg transition-colors whitespace-nowrap">{{ $t('admins.generate') }}</button>
          </div>
          <p class="text-2xs text-dash-muted mt-1">Admin will be prompted to change this on first sign-in.</p>
        </div>
      </div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" @click="showForm = false" class="h-8 px-4 border border-dash-border rounded-btn text-xs text-dash-text hover:bg-dash-bg transition-colors">Cancel</button>
        <button type="submit" class="h-8 px-4 bg-dash-text text-white rounded-btn text-xs hover:opacity-90 transition-opacity">Create</button>
      </div>
    </form>

    <!-- Table -->
    <div v-if="loading" class="text-xs text-dash-muted py-8 text-center">Loading…</div>
    <div v-else class="bg-dash-paper rounded-card border border-dash-border overflow-hidden">
      <table class="w-full text-xs">
        <thead class="bg-dash-bg">
          <tr>
            <th class="text-start text-dash-muted font-medium py-2.5 px-4">{{ $t('admins.name') }}</th>
            <th class="text-start text-dash-muted font-medium py-2.5 px-4">{{ $t('admins.phone') }}</th>
            <th class="text-start text-dash-muted font-medium py-2.5 px-4">{{ $t('admins.role') }}</th>
            <th class="text-start text-dash-muted font-medium py-2.5 px-4">{{ $t('admins.status') }}</th>
            <th class="text-start text-dash-muted font-medium py-2.5 px-4">{{ $t('admins.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-dash-border">
          <tr v-for="a in admins" :key="a.id" class="hover:bg-dash-bg/40 transition-colors">
            <td class="py-3 px-4">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-full bg-dash-primary/15 flex items-center justify-center text-dash-primary font-semibold text-xs shrink-0">
                  {{ a.name[0]?.toUpperCase() }}
                </div>
                <span class="font-medium text-dash-text">{{ a.name }}</span>
              </div>
            </td>
            <td class="py-3 px-4 text-dash-muted" dir="ltr">{{ a.phone }}</td>
            <td class="py-3 px-4">
              <span class="px-2 py-0.5 rounded-tag text-2xs font-medium" :class="ROLE_COLORS[a.role] ?? 'bg-dash-bg text-dash-muted'">
                {{ ROLE_LABELS[a.role] ?? a.role }}
              </span>
            </td>
            <td class="py-3 px-4">
              <span
                class="px-2 py-0.5 rounded-tag text-2xs font-medium"
                :class="a.adminStatus === 'active' ? 'bg-dash-success-lt text-dash-success-dk' : 'bg-dash-danger-lt text-dash-danger'"
              >
                {{ a.adminStatus === 'active' ? $t('admins.active') : $t('admins.suspended') }}
              </span>
            </td>
            <td class="py-3 px-4">
              <div class="flex gap-2" v-if="a.role !== 'owner'">
                <button @click="resetPassword(a)" class="text-2xs text-dash-muted hover:text-dash-text border border-dash-border rounded px-2 py-1 transition-colors">{{ $t('admins.resetPassword') }}</button>
                <button
                  @click="toggleStatus(a)"
                  class="text-2xs border rounded px-2 py-1 transition-colors"
                  :class="a.adminStatus === 'active'
                    ? 'text-dash-danger border-dash-danger/30 hover:bg-dash-danger-lt'
                    : 'text-dash-success border-dash-success/30 hover:bg-dash-success-lt'"
                >
                  {{ a.adminStatus === 'active' ? $t('admins.suspend') : $t('admins.activate') }}
                </button>
              </div>
              <span v-else class="text-2xs text-dash-faint">Owner</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!admins.length" class="text-xs text-dash-muted text-center py-8">No admins found.</p>
    </div>
  </div>
</template>
```

- [x] **Step 4: Visual test**

Navigate to `/admins`. Confirm the stats strip, table, and create form all render. Create a test admin and verify it appears in the list.

- [x] **Step 5: Commit frontend**

```bash
git add aroma-admin/src/views/AdminsView.vue \
        aroma-admin/src/router/index.ts \
        aroma-admin/src/locales/en.ts \
        aroma-admin/src/locales/ar.ts
git commit -m "feat(admin): add Admins page with member table, create form, role chips, and status toggle"
```

---

## Task 11: Final Integration Check

- [x] **Step 1: Run full API migration stack from scratch to confirm no conflicts**

```bash
cd aroma-api && php artisan migrate:fresh --seed 2>&1 | tail -20
```

Expected: All migrations run without errors.

- [x] **Step 2: Run frontend build to confirm no TypeScript errors**

```bash
cd aroma-admin && npm run build 2>&1 | tail -30
```

Expected: Build succeeds with no TypeScript errors.

- [x] **Step 3: Manual smoke test checklist**

Walk through each page in the browser at `http://localhost:5173`:

- [x] Dashboard loads with 4 KPI cards including Gross Profit and Avg Margin
- [x] Dashboard shows ProfitBreakdown and P&L Snapshot panels
- [x] Sidebar shows logo, search bar, Workspace/Catalog/Settings groups correctly
- [x] Active nav item is navy on white
- [x] Topbar shows Fraunces heading, notifications bell opens, EN/AR toggles RTL correctly
- [x] "New product" button navigates to the stepper
- [x] Product stepper's variant table shows Cost + Selling price + live Margin
- [x] Clicking a product card navigates to the Product Detail page
- [x] Product Detail shows variants with margin and the discount form
- [x] Adding a discount persists and shows in Active discounts
- [x] `/admins` loads the admins table
- [x] Creating a new admin via the form works
- [x] Suspend/Activate button toggles admin status

- [x] **Step 4: Final commit**

```bash
git add -p  # stage any stray fixups
git commit -m "chore: final integration cleanup after admin redesign"
```
