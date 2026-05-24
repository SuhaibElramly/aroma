# Admin Arabic / RTL Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Eliminate all English-only strings and LTR-specific CSS in the admin panel so the Arabic locale is fully usable.

**Architecture:** Two categories of fixes — (1) replace hardcoded directional Tailwind classes with logical-property equivalents (`left-*` → `start-*`, `ml-*` → `ms-*`, `text-left`/`text-right` → `rtl:` variants) and (2) wire every hardcoded English string through the i18n system by adding keys to both locale files and using `$t()` / `t()` in templates.

**Tech Stack:** Vue 3, Tailwind CSS v3 (with RTL logical-property support), vue-i18n v9, TypeScript

---

## File Map

| File | Change type |
|------|-------------|
| `aroma-admin/src/locales/en.ts` | Add missing i18n keys |
| `aroma-admin/src/locales/ar.ts` | Add missing i18n keys (Arabic) |
| `aroma-admin/src/components/layout/Topbar.vue` | Fix `setLocale` + RTL classes + missing keys |
| `aroma-admin/src/components/layout/Sidebar.vue` | Fix nav link LTR classes |
| `aroma-admin/src/components/ui/AStatCard.vue` | Fix hint `text-right` |
| `aroma-admin/src/views/UsersView.vue` | Fix search icon + table headers + KPI strings |
| `aroma-admin/src/views/OrderDetailView.vue` | Fix LTR classes + missing i18n strings |
| `aroma-admin/src/views/AdminsView.vue` | Fix table headers + missing i18n strings |
| `aroma-admin/src/views/DashboardView.vue` | Fix P&L section strings + progress bar |
| `aroma-admin/src/views/OrdersView.vue` | Fix search icon LTR classes |
| `aroma-admin/src/views/SpecTypesView.vue` | Fix search icon LTR classes |
| `aroma-admin/src/views/ProductsView.vue` | Fix search icon + thumbnail overlay LTR classes |

---

## Task 1: Add missing i18n keys to locale files

Missing keys referenced in templates that fall back to hardcoded English.

**Files:**
- Modify: `aroma-admin/src/locales/en.ts`
- Modify: `aroma-admin/src/locales/ar.ts`

- [x] **Step 1: Add missing topbar keys to `en.ts`**

In `en.ts`, inside the `topbar` object, add after `noNotifications`:
```ts
unreadLabel: 'unread',
viewAll: 'View all',
```

- [x] **Step 2: Add missing orderDetail keys to `en.ts`**

In `en.ts`, inside the `orderDetail` object, add after `coupon`:
```ts
print: 'Print',
refund: 'Refund',
updateStatusBtn: 'Update status',
orderLabel: 'Order',
totalLabel: 'Total',
inStore: 'In-store',
delivery: 'Delivery',
itemSingular: 'item',
itemPlural: 'items',
freeShipping: 'Free',
orderJourney: 'Order journey',
```

- [x] **Step 3: Add missing dashboard keys to `en.ts`**

In `en.ts`, inside the `dashboard` object, add after `onlineLabel`:
```ts
plSnapshot: 'P&L snapshot',
thisMonth: 'This month',
revenue: 'Revenue',
costOfGoods: 'Cost of goods',
grossProfit: 'Gross profit',
avgMarginLabel: 'Avg margin',
noDeliveredOrders: 'No delivered orders yet.',
profitLabel: 'profit',
```

- [x] **Step 4: Add missing users KPI keys to `en.ts`**

In `en.ts`, inside the `users` object, add after `noUsersSub`:
```ts
kpiAllCustomers: 'All customers',
kpiRegistered: 'registered accounts',
kpiNewThisMonth: 'New this month',
kpiJoinedRecently: 'joined recently',
kpiReturning: 'Returning',
kpi2PlusOrders: '2+ orders',
kpiVip: 'VIP tier',
kpiHighValue: 'high-value customers',
ordersUnitLabel: 'orders',
```

- [x] **Step 5: Add missing admins keys to `en.ts`**

In `en.ts`, inside the `admins` object, add after `generate`:
```ts
joined: 'Joined',
noAdmins: 'No admins found.',
ownerLabel: 'Owner',
```

- [x] **Step 6: Add all new Arabic translations to `ar.ts`**

In `ar.ts`, add the same keys with Arabic values:

In `topbar` object:
```ts
unreadLabel: 'غير مقروء',
viewAll: 'عرض الكل',
```

In `orderDetail` object:
```ts
print: 'طباعة',
refund: 'استرداد',
updateStatusBtn: 'تحديث الحالة',
orderLabel: 'طلب',
totalLabel: 'الإجمالي',
inStore: 'استلام من المتجر',
delivery: 'توصيل',
itemSingular: 'منتج',
itemPlural: 'منتجات',
freeShipping: 'مجاني',
orderJourney: 'مسار الطلب',
```

In `dashboard` object:
```ts
plSnapshot: 'ملخص الأرباح والخسائر',
thisMonth: 'هذا الشهر',
revenue: 'الإيرادات',
costOfGoods: 'تكلفة البضاعة',
grossProfit: 'إجمالي الربح',
avgMarginLabel: 'متوسط الهامش',
noDeliveredOrders: 'لا توجد طلبات مسلّمة بعد.',
profitLabel: 'ربح',
```

In `users` object:
```ts
kpiAllCustomers: 'جميع العملاء',
kpiRegistered: 'حساب مسجل',
kpiNewThisMonth: 'جدد هذا الشهر',
kpiJoinedRecently: 'انضموا مؤخراً',
kpiReturning: 'عائدون',
kpi2PlusOrders: 'طلبان أو أكثر',
kpiVip: 'الفئة المميزة',
kpiHighValue: 'عملاء بقيمة عالية',
ordersUnitLabel: 'طلبات',
```

In `admins` object:
```ts
joined: 'تاريخ الانضمام',
noAdmins: 'لا يوجد مشرفون.',
ownerLabel: 'المالك',
```

- [x] **Step 7: Commit locale changes**

```bash
git add aroma-admin/src/locales/en.ts aroma-admin/src/locales/ar.ts
git commit -m "feat(i18n): add missing translation keys for admin RTL pass"
```

---

## Task 2: Fix Topbar — locale wiring + LTR classes + missing strings

**Files:**
- Modify: `aroma-admin/src/components/layout/Topbar.vue`

- [x] **Step 1: Fix `setLocale` to use the `useLocale` composable**

Replace the script section's locale setup. Change:
```ts
const { locale } = useI18n()
```
to:
```ts
const { locale } = useI18n()
import { useLocale } from '../../composables/useLocale'
```

Actually — add the import and replace the `setLocale` function. The full change in `<script setup>`:

Replace:
```ts
const { locale } = useI18n()
const route  = useRoute()
const router = useRouter()
```
with:
```ts
const { locale } = useI18n()
const { applyLocale } = useLocale()
const route  = useRoute()
const router = useRouter()
```

Then replace the `setLocale` function:
```ts
// Language
function setLocale(l: string) {
  locale.value = l
  document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'
}
```
with:
```ts
// Language
function setLocale(l: string) {
  applyLocale(l as 'en' | 'ar')
}
```

- [x] **Step 2: Fix the `today` date — make it reactive**

The current `today` is computed once at module load; replace the static `const today` with a computed:

Replace:
```ts
// Date
const today = new Date().toLocaleDateString(locale.value === 'ar' ? 'ar-LY' : 'en-GB', {
  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
})
```
with:
```ts
// Date
const today = computed(() =>
  new Date().toLocaleDateString(locale.value === 'ar' ? 'ar-LY' : 'en-GB', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  })
)
```

Also add `computed` to the vue import:
```ts
import { ref, computed } from 'vue'
```

- [x] **Step 3: Fix notification dot `right-1.5` → `end-1.5`**

In the template, replace:
```html
class="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-dash-danger"
```
with:
```html
class="absolute top-1.5 end-1.5 h-1.5 w-1.5 rounded-full bg-dash-danger"
```

- [x] **Step 4: Wire `unreadLabel` and `viewAll` through i18n**

Replace:
```html
{{ unreadCount }} {{ $t('topbar.unreadLabel') ?? 'unread' }}
```
with:
```html
{{ unreadCount }} {{ $t('topbar.unreadLabel') }}
```

Replace:
```html
{{ $t('topbar.viewAll') ?? 'View all' }}
```
with:
```html
{{ $t('topbar.viewAll') }}
```

- [x] **Step 5: Commit**

```bash
git add aroma-admin/src/components/layout/Topbar.vue
git commit -m "fix(topbar): wire setLocale through composable, reactive date, fix RTL dot position"
```

---

## Task 3: Fix Sidebar — LTR classes on nav links

**Files:**
- Modify: `aroma-admin/src/components/layout/Sidebar.vue`

- [x] **Step 1: Fix `pl-3 pr-2 text-left` on router-link**

In `Sidebar.vue`, find the `router-link` class at line 109:
```html
class="w-full flex items-center gap-3 rounded-lg pl-3 pr-2 py-2 text-[13px] font-medium text-left transition-colors"
```
Replace with:
```html
class="w-full flex items-center gap-3 rounded-lg ps-3 pe-2 py-2 text-[13px] font-medium rtl:text-right transition-colors"
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/components/layout/Sidebar.vue
git commit -m "fix(sidebar): replace LTR padding/text-align with logical properties"
```

---

## Task 4: Fix AStatCard hint alignment

**Files:**
- Modify: `aroma-admin/src/components/ui/AStatCard.vue`

- [x] **Step 1: Fix `text-right` → `rtl:text-left`**

Find at line 28:
```html
<span v-if="hint" class="text-[11.5px] text-dash-faint truncate text-right">{{ hint }}</span>
```
Replace with:
```html
<span v-if="hint" class="text-[11.5px] text-dash-faint truncate text-right rtl:text-left">{{ hint }}</span>
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/components/ui/AStatCard.vue
git commit -m "fix(AStatCard): hint text alignment respects RTL"
```

---

## Task 5: Fix UsersView — search icon + table headers + KPI strings

**Files:**
- Modify: `aroma-admin/src/views/UsersView.vue`

- [x] **Step 1: Fix search icon absolute positioning**

Find:
```html
<svg class="absolute left-3 top-1/2 -translate-y-1/2 text-dash-faint" ...>
```
Replace with:
```html
<svg class="absolute start-3 top-1/2 -translate-y-1/2 text-dash-faint" ...>
```

- [x] **Step 2: Fix search input padding**

Find:
```html
class="w-full rounded-lg border border-dash-border bg-dash-paper-2 pl-9 pr-3 py-2 text-[13px] outline-none text-dash-text focus:border-dash-primary transition-colors"
```
Replace with:
```html
class="w-full rounded-lg border border-dash-border bg-dash-paper-2 ps-9 pe-3 py-2 text-[13px] outline-none text-dash-text focus:border-dash-primary transition-colors"
```

- [x] **Step 3: Fix table header text alignment**

Find the three `<th class="text-left ...">` in the thead (name, orders, joined). Replace each `text-left` with `text-start`:
```html
<th class="text-start font-semibold py-3 px-6 border-b border-dash-border-lt">{{ t('users.columns.name') }}</th>
<th class="text-start font-semibold py-3 px-6 border-b border-dash-border-lt">{{ t('users.columns.orders') }}</th>
<th class="text-start font-semibold py-3 px-6 border-b border-dash-border-lt">{{ t('users.columns.joined') }}</th>
```

- [x] **Step 4: Fix action cell alignment**

Find (around line 101):
```html
<td class="py-3.5 px-4 border-b border-dash-border-lt text-right">
```
Replace with:
```html
<td class="py-3.5 px-4 border-b border-dash-border-lt text-end">
```

- [x] **Step 5: Fix `ml-1` in orders count cell**

Find:
```html
<span class="text-dash-faint text-[10px] ml-1">{{ t('users.columns.orders').toLowerCase() }}</span>
```
Replace with:
```html
<span class="text-dash-faint text-[10px] ms-1">{{ t('users.columns.orders').toLowerCase() }}</span>
```

- [x] **Step 6: Replace hardcoded KPI card strings with i18n**

Find the KPI strip (4 cards). Replace each hardcoded English label/sub:

Card 1:
```html
<p class="text-[12px] font-medium text-dash-muted">All customers</p>
...
<p class="text-[11.5px] mt-2 text-dash-muted">registered accounts</p>
```
→
```html
<p class="text-[12px] font-medium text-dash-muted">{{ t('users.kpiAllCustomers') }}</p>
...
<p class="text-[11.5px] mt-2 text-dash-muted">{{ t('users.kpiRegistered') }}</p>
```

Card 2:
```html
<p class="text-[12px] font-medium text-dash-muted">New this month</p>
...
<p class="text-[11.5px] mt-2 text-dash-muted">joined recently</p>
```
→
```html
<p class="text-[12px] font-medium text-dash-muted">{{ t('users.kpiNewThisMonth') }}</p>
...
<p class="text-[11.5px] mt-2 text-dash-muted">{{ t('users.kpiJoinedRecently') }}</p>
```

Card 3:
```html
<p class="text-[12px] font-medium text-dash-muted">Returning</p>
...
<p class="text-[11.5px] mt-2 text-dash-muted">2+ orders</p>
```
→
```html
<p class="text-[12px] font-medium text-dash-muted">{{ t('users.kpiReturning') }}</p>
...
<p class="text-[11.5px] mt-2 text-dash-muted">{{ t('users.kpi2PlusOrders') }}</p>
```

Card 4:
```html
<p class="text-[12px] font-medium text-dash-muted">VIP tier</p>
...
<p class="text-[11.5px] mt-2 text-dash-muted">high-value customers</p>
```
→
```html
<p class="text-[12px] font-medium text-dash-muted">{{ t('users.kpiVip') }}</p>
...
<p class="text-[11.5px] mt-2 text-dash-muted">{{ t('users.kpiHighValue') }}</p>
```

- [x] **Step 7: Commit**

```bash
git add aroma-admin/src/views/UsersView.vue
git commit -m "fix(UsersView): RTL classes + i18n KPI strings"
```

---

## Task 6: Fix OrderDetailView — LTR classes + missing i18n strings

**Files:**
- Modify: `aroma-admin/src/views/OrderDetailView.vue`

- [x] **Step 1: Wire action bar buttons through i18n**

Find the three action buttons at the top of the content section:
```html
Print
```
→ `{{ t('orderDetail.print') }}`

```html
Refund
```
→ `{{ t('orderDetail.refund') }}`

```html
Update status
```
→ `{{ t('orderDetail.updateStatusBtn') }}`

- [x] **Step 2: Fix order header card strings**

Find (around line 55):
```html
<p class="text-[10.5px] tracking-[.16em] uppercase font-semibold text-dash-faint whitespace-nowrap">Order</p>
```
→
```html
<p class="text-[10.5px] tracking-[.16em] uppercase font-semibold text-dash-faint whitespace-nowrap">{{ t('orderDetail.orderLabel') }}</p>
```

The right-side total header (around line 66):
```html
<p class="text-[10.5px] tracking-[.16em] uppercase font-semibold text-dash-faint">Total</p>
```
→
```html
<p class="text-[10.5px] tracking-[.16em] uppercase font-semibold text-dash-faint">{{ t('orderDetail.totalLabel') }}</p>
```

- [x] **Step 3: Fix `text-right` on the header total block**

Find (around line 65):
```html
<div class="text-right shrink-0">
```
Replace with:
```html
<div class="text-end shrink-0">
```

- [x] **Step 4: Fix order type badge (In-store / Delivery)**

Find:
```html
{{ order.isPickup ? 'In-store' : 'Delivery' }}
```
Replace with:
```html
{{ order.isPickup ? t('orderDetail.inStore') : t('orderDetail.delivery') }}
```

- [x] **Step 5: Fix items count pluralization**

Find:
```html
{{ order.items?.length ?? order.itemCount }} item{{ (order.items?.length ?? order.itemCount) !== 1 ? 's' : '' }}
```
Replace with:
```html
{{ order.items?.length ?? order.itemCount }} {{ (order.items?.length ?? order.itemCount) === 1 ? t('orderDetail.itemSingular') : t('orderDetail.itemPlural') }}
```

Also fix the same pluralization inside the line items card:
```html
{{ mergedItems.length }} {{ mergedItems.length === 1 ? 'item' : 'items' }}
```
Replace with:
```html
{{ mergedItems.length }} {{ mergedItems.length === 1 ? t('orderDetail.itemSingular') : t('orderDetail.itemPlural') }}
```

- [x] **Step 6: Fix table header text alignment**

Find all five `<th>` in the items table that have `text-left` or `text-right`. Replace with `text-start` / `text-end`:
```html
<th class="text-start font-semibold py-2 border-b border-dash-border-lt">{{ t('orderDetail.product') }}</th>
<th class="text-start font-semibold py-2 border-b border-dash-border-lt">{{ t('orderDetail.size') }}</th>
<th class="text-end font-semibold py-2 border-b border-dash-border-lt">{{ t('orderDetail.qty') }}</th>
<th class="text-end font-semibold py-2 border-b border-dash-border-lt">{{ t('orderDetail.price') }}</th>
<th class="text-end font-semibold py-2 border-b border-dash-border-lt">Total</th>
```
(The 5th "Total" column header can also use `t('orderDetail.totalLabel')`)

- [x] **Step 7: Fix table data cell `text-right` classes**

Find each `text-right` in the tbody (qty, price, total cells):
```html
class="py-3 border-b border-dash-border-lt tabular-nums text-right text-dash-text-2"
```
Replace all three with `text-end`:
```html
class="py-3 border-b border-dash-border-lt tabular-nums text-end text-dash-text-2"
```
And the total cell:
```html
class="py-3 border-b border-dash-border-lt tabular-nums text-right font-semibold whitespace-nowrap text-dash-text"
```
→
```html
class="py-3 border-b border-dash-border-lt tabular-nums text-end font-semibold whitespace-nowrap text-dash-text"
```

- [x] **Step 8: Fix order totals `ml-auto` → `ms-auto`**

Find (around line 149):
```html
<div class="mt-4 ml-auto w-[300px] space-y-1.5 text-[12.5px]">
```
Replace with:
```html
<div class="mt-4 ms-auto w-[300px] space-y-1.5 text-[12.5px]">
```

- [x] **Step 9: Fix "Shipping" / "Free" strings**

Find:
```html
<span class="text-dash-muted">Shipping</span>
```
→ `{{ t('orderDetail.shipping') }}`

Find:
```html
{{ order.isPickup ? 'Free' : '—' }}
```
→ `{{ order.isPickup ? t('orderDetail.freeShipping') : '—' }}`

- [x] **Step 10: Fix timeline `left-[7px]` and "Order journey" string**

Find (around line 185):
```html
<div class="absolute left-[7px] top-2 bottom-2 w-px bg-dash-border" />
```
Replace with:
```html
<div class="absolute start-[7px] top-2 bottom-2 w-px bg-dash-border" />
```

Find:
```html
<h3 class="font-display text-[18px] leading-tight mt-0.5 text-dash-text">Order journey</h3>
```
→
```html
<h3 class="font-display text-[18px] leading-tight mt-0.5 text-dash-text">{{ t('orderDetail.orderJourney') }}</h3>
```

- [x] **Step 11: Commit**

```bash
git add aroma-admin/src/views/OrderDetailView.vue
git commit -m "fix(OrderDetailView): RTL classes + i18n all hardcoded English strings"
```

---

## Task 7: Fix AdminsView — missing i18n strings + LTR classes

**Files:**
- Modify: `aroma-admin/src/views/AdminsView.vue`

- [x] **Step 1: Fix "Joined" table header**

Find:
```html
<th class="text-left font-semibold py-3 px-6 border-b border-dash-border-lt">Joined</th>
```
Replace with:
```html
<th class="text-start font-semibold py-3 px-6 border-b border-dash-border-lt">{{ $t('admins.joined') }}</th>
```

- [x] **Step 2: Fix other `text-left` table headers**

Find the three other `<th class="text-left ...">` in the admins table. Replace `text-left` → `text-start` on all:
```html
<th class="text-start font-semibold py-3 px-6 border-b border-dash-border-lt">{{ $t('admins.name') }}</th>
<th class="text-start font-semibold py-3 px-6 border-b border-dash-border-lt">{{ $t('admins.role') }}</th>
<th class="text-start font-semibold py-3 px-6 border-b border-dash-border-lt">{{ $t('admins.status') }}</th>
```

- [x] **Step 3: Fix action cell `text-right` → `text-end`**

Find (around line 394):
```html
<td class="py-3.5 px-4 border-b border-dash-border-lt text-right">
```
Replace with:
```html
<td class="py-3.5 px-4 border-b border-dash-border-lt text-end">
```

- [x] **Step 4: Fix "Loading…" and "No admins found." strings**

Find:
```html
<div v-if="loading" class="py-10 text-center text-xs text-dash-muted">Loading…</div>
```
→
```html
<div v-if="loading" class="py-10 text-center text-xs text-dash-muted">{{ $t('common.loading') }}</div>
```

Find:
```html
<p v-if="!loading && !admins.length" class="text-xs text-dash-muted text-center py-8">No admins found.</p>
```
→
```html
<p v-if="!loading && !admins.length" class="text-xs text-dash-muted text-center py-8">{{ $t('admins.noAdmins') }}</p>
```

- [x] **Step 5: Fix "Owner" hardcoded string**

Find:
```html
<span v-else class="text-[11px] text-dash-faint">Owner</span>
```
→
```html
<span v-else class="text-[11px] text-dash-faint">{{ $t('admins.ownerLabel') }}</span>
```

- [x] **Step 6: Fix Roles tab `text-left` on role list buttons**

Find (around line 427):
```html
class="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-dash-paper-2"
```
Replace with:
```html
class="w-full flex items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-dash-paper-2"
```

- [x] **Step 7: Commit**

```bash
git add aroma-admin/src/views/AdminsView.vue
git commit -m "fix(AdminsView): i18n missing strings + RTL table alignment"
```

---

## Task 8: Fix DashboardView — P&L strings + progress bar LTR

**Files:**
- Modify: `aroma-admin/src/views/DashboardView.vue`

- [x] **Step 1: Fix progress bar `left-0 border-r` → `start-0 border-e`**

Find (around line 106):
```html
class="absolute inset-y-0 left-0 border-r border-dashed border-dash-border"
```
Replace with:
```html
class="absolute inset-y-0 start-0 border-e border-dashed border-dash-border"
```

Also fix the inline `left:` style and `right: '0'` in the adjacent divs. Find:
```html
:style="{
  left: cat.revenue > 0 ? (cat.cogs / cat.revenue * 100) + '%' : '0%',
  right: '0'
}"
```
These inline styles are LTR-specific. Since chart bars have an inherent left→right reading, they're exempt from RTL flip. Add `dir="ltr"` to the parent chart container instead of trying to mirror it. Find the category breakdown `<ul>`:
```html
<ul v-if="stats?.categoryBreakdown?.length" class="mt-5 space-y-3">
```
Replace with:
```html
<ul v-if="stats?.categoryBreakdown?.length" class="mt-5 space-y-3" dir="ltr">
```

- [x] **Step 2: Fix "profit · X%" hardcoded text**

Find:
```html
<span class="font-semibold text-dash-text">{{ (cat.profit / 1000).toFixed(1) }}k</span>
profit · {{ cat.margin }}%
```
Replace with:
```html
<span class="font-semibold text-dash-text">{{ (cat.profit / 1000).toFixed(1) }}k</span>
{{ t('dashboard.profitLabel') }} · {{ cat.margin }}%
```

- [x] **Step 3: Fix "No delivered orders yet." string**

Find:
```html
<p v-else class="text-xs text-dash-muted text-center py-6">No delivered orders yet.</p>
```
→
```html
<p v-else class="text-xs text-dash-muted text-center py-6">{{ t('dashboard.noDeliveredOrders') }}</p>
```

- [x] **Step 4: Fix P&L section hardcoded strings**

Find:
```html
<p class="text-[11px] tracking-[.16em] uppercase font-semibold text-dash-faint">P&amp;L snapshot</p>
<h3 class="font-display text-[18px] mt-0.5 leading-tight text-dash-text">This month</h3>
```
Replace with:
```html
<p class="text-[11px] tracking-[.16em] uppercase font-semibold text-dash-faint">{{ t('dashboard.plSnapshot') }}</p>
<h3 class="font-display text-[18px] mt-0.5 leading-tight text-dash-text">{{ t('dashboard.thisMonth') }}</h3>
```

Find the four row labels in the P&L block:
```html
<span class="text-[12.5px] text-dash-muted">Revenue</span>
```
→ `{{ t('dashboard.revenue') }}`

```html
<span class="text-[12.5px] text-dash-muted">Cost of goods</span>
```
→ `{{ t('dashboard.costOfGoods') }}`

```html
<span class="text-[12.5px] text-dash-muted">Gross profit</span>
```
→ `{{ t('dashboard.grossProfit') }}`

```html
<span class="text-[12.5px] text-dash-muted">Avg margin</span>
```
→ `{{ t('dashboard.avgMarginLabel') }}`

- [x] **Step 5: Fix `text-right` classes in the P&L value spans**

Find all four:
```html
<span class="text-right whitespace-nowrap">
```
Replace each with:
```html
<span class="text-end whitespace-nowrap">
```

- [x] **Step 6: Fix Dashboard recent orders table headers**

Find the `<th>` elements in the recent orders table (they use `text-left`). Read the exact lines and replace `text-left` → `text-start` and `text-right` → `text-end`.

- [x] **Step 7: Commit**

```bash
git add aroma-admin/src/views/DashboardView.vue
git commit -m "fix(DashboardView): RTL classes + i18n P&L section strings"
```

---

## Task 9: Fix search inputs in OrdersView, SpecTypesView, ProductsView

**Files:**
- Modify: `aroma-admin/src/views/OrdersView.vue`
- Modify: `aroma-admin/src/views/SpecTypesView.vue`
- Modify: `aroma-admin/src/views/ProductsView.vue`

Same pattern for each: `left-3` → `start-3` on the icon, `pl-9 pr-3` → `ps-9 pe-3` on the input.

- [x] **Step 1: Fix OrdersView search**

In `OrdersView.vue`, find the search icon svg:
```html
class="absolute left-3 top-1/2 -translate-y-1/2 ...
```
→ `class="absolute start-3 top-1/2 -translate-y-1/2 ...`

Find the search input:
```html
class="... pl-9 pr-3 ...
```
→ `class="... ps-9 pe-3 ...`

- [x] **Step 2: Fix SpecTypesView search**

Same substitution in `SpecTypesView.vue` — `left-3` → `start-3`, `pl-9 pr-3` → `ps-9 pe-3`.

Also fix table headers: `text-left` → `text-start` on all `<th>` in the spec types table.

- [x] **Step 3: Fix ProductsView search + thumbnail overlay**

In `ProductsView.vue`, fix the search input as above.

Find the thumbnail overlay absolute position (around line 154):
```html
class="absolute top-2 left-2 ...
```
→ `class="absolute top-2 start-2 ...`

- [x] **Step 4: Commit**

```bash
git add aroma-admin/src/views/OrdersView.vue aroma-admin/src/views/SpecTypesView.vue aroma-admin/src/views/ProductsView.vue
git commit -m "fix(views): RTL search icon + input padding in Orders, SpecTypes, Products"
```

---

## Final Verification

- [x] **Start the admin dev server**

```bash
cd aroma-admin && npm run dev
```

- [x] **Switch to Arabic and visually check each page**

1. Open the admin (default: `http://localhost:5173`)
2. Click the **ع** language toggle — the entire layout should flip RTL
3. Verify each page:
   - **Dashboard**: P&L labels in Arabic, chart bar container stays LTR, stat card hints aligned correctly
   - **Orders**: search icon on the right side, table headers right-aligned
   - **Order Detail**: all buttons translated, timeline line on the right
   - **Users**: KPI cards in Arabic, search icon right-aligned, table headers right-aligned
   - **Admins**: "تاريخ الانضمام" in header, "المالك" for owner row
   - **Spec Types / Products / Brands**: search icon on correct side
   - **Sidebar**: nav item text right-aligned

- [x] **Switch back to English and verify no regressions**

- [x] **Final commit if anything was missed**

```bash
git add -p
git commit -m "fix(admin): final RTL/i18n cleanup"
```
