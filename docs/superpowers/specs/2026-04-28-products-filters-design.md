# Products Page — Extended Filters Design

Date: 2026-04-28

## Overview

Add 6 filter fields to the admin Products page, replacing the single name-search input with a structured two-row filter bar. Filters are applied server-side; the frontend passes params to the existing paginated endpoint.

## Layout

**Row 1 (3-column grid):** Name | Brand | Category
**Row 2 (3-column grid):** Type | Price Min | Price Max

The "Add Product" button remains in its current top-right position, unchanged.

## Filter Behaviour

| Field      | Component | Trigger      | Notes |
|------------|-----------|--------------|-------|
| Name       | AInput    | debounce 350ms | Searches `name` (AR) OR `name_en` (EN) via LIKE |
| Brand      | ASelect   | immediate    | Options from brands already loaded on mount |
| Category   | ASelect   | immediate    | Options from categories already loaded on mount |
| Type       | ASelect   | immediate    | Options: All, EDP, EDT, Parfum, EDC |
| Price Min  | AInput (number) | debounce 350ms | Filters by minimum variant price ≥ value |
| Price Max  | AInput (number) | debounce 350ms | Filters by minimum variant price ≤ value |

All filter changes reset to page 1. No explicit reset button — fields are cleared individually.

## Backend Changes — `AdminProductController@index`

Current filters: `search` (name AR only), `brand_id`.

New filters to add:

- **search**: extend `WHERE` to `name LIKE ? OR name_en LIKE ?`
- **category_id**: `WHERE category_id = ?`
- **type**: `WHERE type = ?` (validated against ProductType enum values)
- **price_min**: subquery `WHERE (SELECT MIN(price) FROM product_variants WHERE product_id = products.id) >= ?`
- **price_max**: subquery `WHERE (SELECT MIN(price) FROM product_variants WHERE product_id = products.id) <= ?`

## Frontend Changes — `admin.ts`

Extend `apiGetProducts` params type:

```ts
params: {
  search?: string
  brand_id?: string
  category_id?: string
  type?: string
  price_min?: number
  price_max?: number
  page?: number
}
```

## Frontend Changes — `ProductsView.vue`

- Replace single `search` ref + input with 6 filter refs: `search`, `brandId`, `categoryId`, `type`, `priceMin`, `priceMax`
- Replace current single-input toolbar with two 3-column `grid` rows using `AInput`/`ASelect`
- Pass all filter values to `apiGetProducts` (omit undefined/empty values)
- A single shared debounce covers text inputs; selects trigger fetch directly
- Reuse `brands` and `cats` arrays already loaded on mount for dropdown options

## Out of Scope

- Reset button
- Client-side filtering
- Saving filter state across navigation
