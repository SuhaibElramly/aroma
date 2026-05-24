# Aroma Project — Current State (2026-05-24)

This document summarises everything that has been built so a new agent can orient quickly without reading every plan and spec.

---

## Stack

| Layer | Tech |
|-------|------|
| API | Laravel 11 (PHP), SQLite in dev |
| Admin panel | Vue 3 + TypeScript + Vite, `aroma-admin/` |
| Storefront | Next.js 14 (App Router, React), `aroma/` |
| Shared API client | Axios, auth via Laravel Sanctum |

Working directory: `/Users/suhaib/web_projects/aroma-full-project`

---

## What Has Been Built

All features below are **fully implemented and committed to master**.

### Core e-commerce (April 2026)

- **Admin dashboard** — stats cards, order list with filters, order detail view
- **Products** — CRUD with flexible specs (dynamic spec types), product variants (generate/manage), category and brand assignment, product images panel (upload/reorder/delete thumbnail)
- **Brands** — CRUD with logo upload, brand detail page in storefront
- **Categories** — CRUD with slug, category filter in storefront search
- **Coupons** — admin CRUD, storefront coupon code entry in cart
- **Cart** — API-persisted (server-side), replaces localStorage approach
- **Wishlist** — API-persisted, syncs with auth state
- **Checkout / address / profile** — address management, order placement
- **Default variant** — first variant selected automatically on product page
- **Product creation stepper** — multi-step form for creating products in admin

### Product card bg colour picker (May 2026)

Admin can assign a background colour to each product card. The picker appears in both the new-product drawer and the edit modal. Colour is stored on the product record and read by the storefront `ProductCard`.

### Arabic / RTL support (May 2026)

Full RTL layout support in the admin panel (vue-i18n, `ar`/`en` locale files, direction toggling). Storefront was always RTL-first.

### Admin panel redesign (May 2026)

Sidebar redesign, dark-mode design tokens (`dash-*` CSS variables), topbar, breadcrumbs.

### Roles & permissions — dynamic DB-backed (May 2026)

- `roles` table with 6 seeded roles (owner, admin, manager, editor, support, viewer)
- Each role has a `permissions` JSON column
- Admin can create/edit/delete roles inline in the Admins view → Roles tab
- Auth store loads roles from API; `owner` role is protected from modification
- Role assignment validated against DB roles

### Admin notifications (May 2026)

- `admin_notifications` table + model
- Observers on `Order` (new order placed) and `Product` (stock hits zero)
- `AdminNotificationController` — list + mark-read endpoints
- Topbar badge with unread count, polling every 30 s
- Clicking a notification navigates to the relevant record

### Order payment tracking (May 2026)

- `order_payments` table + `payment_status` column on orders (`not_paid`, `partially_paid`, `paid`)
- Admin can log payments against an order; status auto-computes from total vs. paid
- Payment status column in orders list, live payment management panel in order detail

### Product images admin (May 2026)

Full image management panel in the admin product detail view — upload multiple images, set thumbnail, reorder, delete. Images returned in product API responses.

### Homepage admin control (May 2026)

- `settings` table (key-value JSON store) — stores hero config
- `homepage_blocks` table — type, position, enabled, config JSON
- `HomepageAdminService` + `AdminHomepageController` for full CRUD
- Admin view: hero text editor, hero image upload, draggable block list, block editor drawer
- Storefront `GET /api/home` reads and hydrates all enabled blocks from DB
- Block types: `bestsellers`, `new_arrivals`, `offers`, `categories`, `featured_brand`, `curated`
- Trust Strip removed from storefront

### Curated homepage block (May 2026)

- New `curated` block type — admin hand-picks specific products by ID in a specific order
- `ProductPicker.vue` component — search dropdown + drag-reorder selected list
- `GET /api/admin/products?ids=1,2,3` returns products by ID (skips other filters)
- `HomeService` hydrates curated blocks by `whereIn` + re-sorts to match `product_ids` order
- Storefront renders `CuratedSection` identically to `BestsellersSection`

### Logo management (May 2026)

- Logo stored as `site_logo_path` in the `settings` table
- `POST /api/admin/homepage/logo` — upload; `DELETE` — remove
- `GET /api/home` and `GET /api/admin/homepage` both return `logo_url`
- Storefront `layout.tsx` fetches logo server-side (ISR, 60s revalidate), passes to `Header` and `Footer`
- Falls back to "AROMA" text wordmark when no logo uploaded

---

## Key Files and Where Things Live

### Backend (`aroma-api/app/`)

| Path | Purpose |
|------|---------|
| `Services/HomeService.php` | Reads hero + blocks from DB, hydrates each block with live data |
| `Services/HomepageAdminService.php` | Hero CRUD, block CRUD, logo upload/delete |
| `Http/Controllers/Api/HomeController.php` | `GET /api/home` |
| `Http/Controllers/Api/Admin/AdminHomepageController.php` | All admin homepage endpoints |
| `Http/Controllers/Api/Admin/AdminProductController.php` | Products list + `ids` param support |
| `Models/Setting.php` | Key-value store with static `get()`/`set()` |
| `Models/HomepageBlock.php` | Homepage blocks |

### Admin (`aroma-admin/src/`)

| Path | Purpose |
|------|---------|
| `views/HomepageView.vue` | Homepage editor page (hero + block list + logo card) |
| `components/homepage/HeroEditor.vue` | Hero text/image editor card |
| `components/homepage/BlockList.vue` | Draggable block rows |
| `components/homepage/BlockEditor.vue` | Slide-over drawer for editing/adding blocks |
| `components/homepage/ProductPicker.vue` | Search + drag-reorder product picker for curated blocks |
| `api/admin.ts` | All admin API functions |
| `types/index.ts` | All TypeScript interfaces |

### Storefront (`aroma/src/`)

| Path | Purpose |
|------|---------|
| `app/(storefront)/layout.tsx` | Async server component; fetches logo from API |
| `components/layout/Header.tsx` | Accepts `logoUrl` prop, renders image or "AROMA" fallback |
| `components/layout/Footer.tsx` | Same |
| `features/home/HeroSection.tsx` | Accepts `HeroConfig` props from API |
| `features/home/HomeSection.tsx` | `HomeSections` iterates blocks, renders per type (incl. `CuratedSection`) |
| `features/home/HomePageClient.tsx` | Passes hero + blocks to section components |
| `types/index.ts` | `HomePageData`, `HeroConfig`, `HomeBlock` interfaces |

---

## Test Coverage

- `tests/Feature/HomeTest.php` — public homepage endpoint (hero, blocks, ordering, disabled filtering, curated block ordering, logo_url)
- `tests/Feature/AdminHomepageTest.php` — all admin homepage CRUD endpoints

Run with:
```bash
cd aroma-api && php artisan test tests/Feature/HomeTest.php tests/Feature/AdminHomepageTest.php
```

---

## Git Branch

All work is on `master`. No feature branches open.

---

## Pending / Not Yet Started

Nothing is in-flight. The next feature should start with a new spec + plan.
