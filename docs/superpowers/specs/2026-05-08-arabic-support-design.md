# Arabic Support for Aroma Admin

**Date:** 2026-05-08
**Scope:** `aroma-admin` (Vue 3 + TypeScript + Tailwind)

## Goal

Add a bilingual EN/AR toggle to the admin. Switching to Arabic flips the entire layout to RTL, translates all UI strings, switches the font to Cairo, and formats dates in Arabic. The preference persists in `localStorage`.

---

## Architecture & Data Flow

### New files

```
src/
  locales/
    en.ts          ← flat translation map, English
    ar.ts          ← flat translation map, Arabic
  i18n.ts          ← vue-i18n instance (createI18n), exported and registered in main.ts
  composables/
    useLocale.ts   ← locale toggle composable
```

### `useLocale.ts`

Single source of truth for locale. Exposes:

- `locale` — reactive ref, `'en'` | `'ar'`
- `toggleLocale()` — flips locale, sets `document.documentElement.dir` (`ltr`/`rtl`) and `document.documentElement.lang` (`en`/`ar`), persists to `localStorage('admin_locale')`

`toggleLocale()` also calls `dayjs.locale(newLocale)` so the Topbar date renders in Arabic when Arabic is active.

### Boot sequence (`main.ts`)

Before mounting, read `localStorage('admin_locale')`. If `'ar'`, call the locale init with `'ar'` so `dir="rtl"` and `lang="ar"` are set on `<html>` before first paint.

### vue-i18n registration

`i18n.ts` creates the instance with `legacy: false` (Composition API mode). Registered via `app.use(i18n)` in `main.ts` alongside Pinia and the router.

---

## Translation Structure

Namespaced flat keys. One namespace per area:

```ts
{
  nav: {
    main, catalog,
    dashboard, orders, customers,
    products, specTypes, brands, categories, coupons,
  },
  topbar: {
    signOut, adminConsole,
  },
  pageTitles: {
    dashboard, orders, orderDetail,
    products, productVariants, productCreate,
    brands, brandDetail, categories, users, userDetail,
    coupons, specTypes,
  },
  dashboard: {
    greeting,          // "Good {timeOfDay}, {name}" — interpolated
    subtitle,
    totalRevenue, totalOrders, products, customers, vsLastMonth,
    revenueChart, ordersChart,
    recentOrders, topProducts,
  },
  orders: { title, filterAll, filterPending, filterProcessing,
            filterShipped, filterDelivered, filterCancelled,
            searchPlaceholder, noOrders, columns: { id, customer, date, total, status, actions } },
  orderDetail: { title, back, status, customer, items, summary,
                 subtotal, shipping, total, updateStatus },
  products: { title, addProduct, searchPlaceholder, noProducts,
              columns: { name, brand, category, price, stock, actions } },
  productCreate: { title, back, /* all form field labels, section headers, button labels */ },
  productVariants: { /* wizard step labels, grid headers, save */ },
  brands: { title, add, edit, delete, noData, columns: { name, slug, actions } },
  categories: { title, add, edit, delete, noData, columns: { name, slug, actions } },
  users: { title, searchPlaceholder, noUsers, columns: { name, email, joined, orders, actions } },
  userDetail: { title, back, /* field labels */ },
  coupons: { title, add, edit, delete, noData, columns: { code, discount, expiry, actions } },
  specTypes: { title, add, edit, delete, noData, columns: { name, actions } },
  login: { title, email, password, submit, error },
  common: { save, cancel, delete, edit, add, search, loading, error,
            confirmDelete, yes, no, showing, of, page, perPage },
}
```

Interpolated strings use vue-i18n `{placeholder}` syntax. `ar.ts` mirrors the exact same key structure.

---

## RTL Layout Handling

`dir="rtl"` on `<html>` handles the majority automatically (text alignment, flexbox order, `justify-between` swaps). Explicit `rtl:` Tailwind variants are needed in a small number of places:

| Component | Change |
|-----------|--------|
| `Sidebar.vue` | `border-r` → `border-r rtl:border-r-0 rtl:border-l` |
| `Sidebar.vue` (badge) | `ml-auto` → `ml-auto rtl:ml-0 rtl:mr-auto` |
| `Topbar.vue` (LogOut icon) | add `rtl:scale-x-[-1]` |
| Nav `<button>` | `text-left` → `text-left rtl:text-right` |
| Asymmetric padding used as visual indent | swap `pl-*`/`pr-*` for `ps-*`/`pe-*` (Tailwind logical properties) |

Direction-neutral classes (`gap-`, `px-`, `space-y-`, grids) need no changes.

---

## Font

Add **Cairo** (Google Fonts) alongside Inter. Cairo is a geometric Arabic font that matches Inter's weight range and proportions.

```css
/* style.css */
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');

:root:is([dir="rtl"]) {
  font-family: 'Cairo', system-ui, sans-serif;
}
```

Font switches automatically when `dir="rtl"` is applied — no component logic needed.

---

## Language Toggle UI

A two-option pill in the **Topbar**, between the page title and the profile button.

```
[ EN  AR ]
```

- Active locale: filled `bg-dash-secondary text-white` pill
- Inactive locale: `text-dash-muted hover:text-dash-text`
- Clicking the inactive option calls `toggleLocale()`
- Always visible in both locales so it's always discoverable
- In RTL the toggle sits on the left side of the topbar (flips with `justify-between`)

---

## Scope of String Changes

Every hardcoded UI string in the following files is replaced with `t('key')`:

- `components/layout/Sidebar.vue`
- `components/layout/Topbar.vue`
- All 13 views in `views/`
- Shared UI components that contain user-visible text (`AEmptyState`, `AConfirmDialog`, `APagination`, `ATable` column headers passed as props)

---

## Out of Scope

- Translating product/brand/category *data* stored in the database (that's a backend concern)
- Any other language beyond EN and AR
- Admin user preference synced to the server

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `vue-i18n` | `^9.x` | Translation engine (Vue 3 Composition API mode) |
| `dayjs/locale/ar` | bundled with dayjs | Arabic date formatting |
