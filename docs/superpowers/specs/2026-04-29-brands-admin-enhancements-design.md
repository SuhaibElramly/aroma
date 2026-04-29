# Brands Admin Enhancements — Design Spec

**Date:** 2026-04-29
**Status:** Approved

---

## Overview

Three enhancements to the brands section of the admin panel:

1. Server-side filters on the brands list
2. Brand detail page showing all of the brand's products
3. Auto-generate brand slug from the English name on creation

---

## 1. Brand List Filters (Server-Side)

### API changes — `AdminBrandController@index`

Accept four optional query parameters:

| Param | Type | Behaviour |
|---|---|---|
| `name` | string | LIKE search on `brands.name` OR `brands.name_en` |
| `origin` | string | LIKE search on `brands.origin` |
| `tagline` | string | LIKE search on `brands.tagline` |
| `min_products` | integer | HAVING `products_count >= min_products` |
| `max_products` | integer | HAVING `products_count <= max_products` |

The response shape remains unchanged (flat array, no pagination). The query uses `withCount('products')` (already present) with an added `HAVING` clause when min/max are provided.

### Frontend changes — `BrandsView.vue`

Add a filter bar above the table. Two-row grid layout, same as `ProductsView`:

- **Row 1:** Name (text, debounced 350ms), Origin (text, debounced 350ms), Tagline (text, debounced 350ms)
- **Row 2:** Min Products (number, debounced 350ms), Max Products (number, debounced 350ms)

On any filter change the list re-fetches. `apiGetBrands()` gains an optional params object passed through to the request.

---

## 2. Brand Detail Page

### Route

`/brands/:id` → `BrandDetailView.vue`

Add to router alongside the existing `/brands` entry. The brand `id` is passed as a prop.

In `BrandsView.vue`, wrap the name cell content in a `RouterLink` to `/brands/:id`.

### Header

Matches the `UserDetailView` pattern:

- Back link → "Brands" (`/brands`)
- Brand name (Arabic, large) + English name (muted, small)
- Stat chips in a row: Origin, product count, background colour swatch (small coloured square + hex code)

### Products section

Full paginated product table — identical to `ProductsView` with these differences:

- `brand_id` is a fixed param (the route `:id`), not a user-controlled filter
- The **Brand** column is removed from the table columns
- The **Brand** filter select is removed from the filter bar
- All other filters remain: Name search, Category, Type, Price Min, Price Max
- Pagination works the same via `usePagination`

Uses the existing `GET /admin/products?brand_id=:id&page=N` endpoint — no new API endpoint required.

The Edit modal and Delete confirm dialog are included in full (same as `ProductsView`). The brand field in the Edit modal remains (user can reassign a product to a different brand from here).

---

## 3. Auto-Generate Slug from English Name

### Behaviour

On the **Add Brand** form:

- Remove the manual "ID (slug)" `AInput` field entirely
- Derive the slug from `name_en` as the user types:
  ```
  name_en.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  ```
  Examples: `"Jo Malone London"` → `"jo-malone-london"`, `"Yves Saint Laurent"` → `"yves-saint-laurent"`
- Show the derived slug as a read-only preview chip beneath the English name input, using the same pill style as the slug display on the Edit Product form (icon + `aromashop.ly/brands/` prefix + monospace slug value)
- The derived slug is sent as `id` on form submit
- Validation: if `name_en` is empty, the slug will be empty; block save with an error "English name is required to generate a slug"

### Backend

No changes. `id` is still `required|string|unique:brands,id` in `AdminBrandController@store`. The slug is now computed on the frontend instead of typed manually.

### `Brand` model fix

The `$fillable` array currently omits `name_en`. Add it:

```php
protected $fillable = ['id', 'name', 'name_en', 'origin', 'tagline', 'bg'];
```

---

## Files Touched

| File | Change |
|---|---|
| `aroma-api/app/Http/Controllers/Api/Admin/AdminBrandController.php` | Add filter params to `index()` |
| `aroma-api/app/Models/Brand.php` | Add `name_en` to `$fillable` |
| `aroma-admin/src/api/admin.ts` | Add optional params to `apiGetBrands()` |
| `aroma-admin/src/views/BrandsView.vue` | Add filter bar, name cell as RouterLink, remove manual ID field, add slug preview |
| `aroma-admin/src/views/BrandDetailView.vue` | New file — brand header + filtered product table |
| `aroma-admin/src/router/index.ts` | Add `/brands/:id` route |

---

## Out of Scope

- Pagination on the brands list (brands catalogue is small)
- Brand logo / image upload
- Editing brand info from the detail page (use the Edit button on the list)
