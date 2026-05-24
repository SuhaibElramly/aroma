# Admin Command Palette — Design Spec

**Date:** 2026-05-24
**Status:** Approved

## Overview

The sidebar search bar (`aroma-admin/src/components/layout/Sidebar.vue`) currently displays a static "Search…" placeholder with a ⌘K hint but is wired to nothing — clicking it does nothing, ⌘K does nothing.

Replace it with a real command palette: ⌘K (or click the sidebar bar) opens an overlay that combines **page navigation** with **live entity search** across products, users, orders, brands, and coupons. Linear/Notion-style.

---

## Components

| File | Purpose |
|---|---|
| `aroma-admin/src/components/layout/CommandPalette.vue` | The overlay UI — backdrop, card, input, grouped result list, keyboard navigation. |
| `aroma-admin/src/composables/useCommandPalette.ts` | Singleton open/close state (`open`, `openPalette()`, `closePalette()`) so `Sidebar.vue` and a global ⌘K listener can both trigger it. |
| `aroma-admin/src/components/layout/AppLayout.vue` | Mounts `<CommandPalette />` once at the root and registers the global ⌘K keydown listener. |
| `aroma-admin/src/components/layout/Sidebar.vue` | Existing static search div becomes a `<button>` that calls `openPalette()`. Visual is unchanged. |
| `aroma-admin/src/locales/{en,ar}.ts` | New `commandPalette.*` keys. |

---

## Open / Close Behavior

- **Open:** `⌘K` (Mac) / `Ctrl+K` (Win/Linux) global keydown, OR click the sidebar search bar.
  - The global listener fires regardless of focus (palette input is what we want focused next anyway).
- **Close:** `Esc`, backdrop click, or selecting a result.
- On open: input is focused, query is reset to empty, result selection resets to index 0.

---

## Result Sources

The palette has two modes:

**Empty query** → show permitted **nav items** only. Source is the same `groups` array that `Sidebar.vue` already builds (Dashboard, Orders, Users, Products, Spec Types, Brands, Categories, Coupons, Homepage, Admins) filtered by `auth.can(resource, 'view')`.

**Query length ≥ 2** (debounced 250 ms):

1. **Nav matches** — local case-insensitive `includes` over the same nav-item labels. Always shown first.
2. **Entity matches** — in parallel, only call endpoints whose `auth.can(...,'view')` is true:
   - Products → `apiGetProducts({ search })` → top 5
   - Users → `apiGetUsers({ search })` → top 5
   - Brands → `apiGetBrands({ name: search })` → top 3
   - Orders → `apiGetOrders({ order_id: q })` if `q.startsWith('ORD')`, else `apiGetOrders({ phone: q })` if `/^\d/.test(q)` → top 3
   - Coupons → `apiGetCoupons({ search })` → top 3
3. **Cancellation:** each fetch uses an `AbortController`; on every keystroke, in-flight requests are aborted before new ones are issued.

Empty sections are not rendered. "No results" is shown only when query length ≥ 2, all promises have settled, and every section is empty.

---

## Result Selection

Each result has a target route:

| Source | Route |
|---|---|
| Nav item | `/{path}` from the nav-item config |
| Product | `/products/{id}` |
| User | `/users/{id}` |
| Brand | `/brands/{id}` |
| Order | `/orders/{id}` |
| Coupon | `/coupons` (list; we'll scroll/flag the row in a follow-up if needed) |

Activating a result (`Enter` or click) navigates and closes the palette.

---

## Keyboard Navigation

A single highlight index walks a flattened list of all currently visible items in render order (nav items + each entity section's items, top-to-bottom).

- `↑` / `↓` move the index, wrap at edges.
- `Home` / `End` jump to first / last.
- `Enter` activates highlighted item.
- `Esc` closes.

The highlighted item is scrolled into view inside the result list.

---

## UI

Match existing dashboard design tokens (`bg-dash-paper`, `border-dash-border`, `text-dash-text`, etc.).

- Backdrop: full-viewport, semi-transparent dark, `Teleport` to `body`.
- Card: ~560 px wide, centered horizontally, ~120 px from top, capped height with scrolling result list.
- Header row: search icon + input + small "Esc" hint.
- Each group: small uppercase section heading (`Navigate`, `Products`, `Users`, `Orders`, `Brands`, `Coupons`).
- Each result row: leading icon (lucide), primary label, optional secondary label (e.g. brand → product count, user → phone, order → status).
- Highlighted row: `bg-dash-bg` background.
- RTL-aware via existing `useLocale` `dir` handling.

---

## i18n

Add to `commandPalette` namespace in both `en.ts` and `ar.ts`:

| Key | EN | AR (suggested) |
|---|---|---|
| `placeholder` | Search pages, products, users, orders… | بحث في الصفحات، المنتجات، العملاء، الطلبات… |
| `sectionNavigate` | Navigate | تصفح |
| `sectionProducts` | Products | المنتجات |
| `sectionUsers` | Customers | العملاء |
| `sectionOrders` | Orders | الطلبات |
| `sectionBrands` | Brands | العلامات |
| `sectionCoupons` | Coupons | الكوبونات |
| `emptyHint` | Type to search across the admin | اكتب للبحث في لوحة التحكم |
| `noResults` | No matches | لا توجد نتائج |
| `escHint` | Esc | Esc |

---

## Out of Scope (YAGNI)

- Recent / pinned searches (no localStorage).
- A unified backend search endpoint — we use the five existing endpoints in parallel.
- Action commands like "Create product" or "Toggle locale."
- Spec Types and Admins entity search (no search endpoint exists; nav-only is fine).
- Result ranking across categories — we keep the fixed `Navigate → Products → Users → Orders → Brands → Coupons` order.

---

## Risk / Notes

- ⌘K is a browser default in some contexts (Safari focuses URL bar). We `preventDefault()` only when the modifier key check matches `(e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'`.
- Orders search requires the unified-query split logic that mirrors `OrdersView.vue:140-141`. We replicate that, we don't refactor it.
- `apiGetBrands` and `apiGetCoupons` return unpaginated arrays (`T[]`); `apiGetProducts`, `apiGetUsers`, `apiGetOrders` return `{ data, meta }`. The palette's per-source adapter must normalize both shapes before slicing the top N.
