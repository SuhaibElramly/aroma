# Curated Homepage Block — Design Spec

**Date:** 2026-05-24
**Status:** Implemented

## Overview

Add a `curated` block type to the homepage block system. The admin picks specific products by name search, orders them by drag-and-drop, and the storefront renders them as a standard product grid section with a custom label and title.

This extends the existing `homepage_blocks` infrastructure — no new tables, no schema changes.

---

## How "Offers" Works (Context)

The `offers` block type queries `WHERE is_offer = true LIMIT {limit}`. Each product has an `is_offer` boolean column. Admins flag individual products as offers via the product edit form. The block renders whichever products carry that flag, up to the configured limit. There is no price-based logic — it is a manual tag.

---

## Data Model

No migration needed. The `curated` type uses the existing `config` JSON column with a new shape:

```json
{
  "label": "اختيارات المحرر",
  "title": "مختارات خاصة",
  "product_ids": [12, 7, 34, 2]
}
```

`product_ids` is an ordered array of product IDs. Products render in this order on the storefront.

---

## API Changes

### Backend — `GET /api/admin/products`

Add support for an `ids` query parameter. When `?ids=1,2,3` is present, skip all other filters and return those specific products (used by `ProductPicker` to pre-populate the selected list when editing an existing curated block).

### `GET /api/home`

`HomeService` gains a new match arm for `curated` that fetches products by `whereIn('id', $ids)` and reorders the result to match the `product_ids` array order.

### `POST /api/admin/homepage/blocks` validation

`curated` added to the `in:` allowlist.

---

## Admin UI

### New component: `ProductPicker.vue`

Located at `aroma-admin/src/components/homepage/ProductPicker.vue`.

- **Props:** `modelValue: number[]` (ordered product IDs)
- **Emits:** `update:modelValue: [number[]]`
- **Search:** text input, 300ms debounce, calls `apiGetProducts({ search: query })`. Results shown as dropdown (name + brand). Clicking adds to selected list if not already present.
- **Selected list:** draggable rows via `vuedraggable` (already installed). Each row shows name, brand, thumbnail (if available), and a remove button. Drag reorders; emit fires on every change.
- **Pre-population:** on mount, if `modelValue` is non-empty, calls `apiGetProducts({ ids: modelValue })` to fetch product names for display.

### Modified: `BlockEditor.vue`

- `curated` added to `BLOCK_TYPES` array
- `productIds` ref (`number[]`) added to local state
- `watch` on `props.block` populates `productIds.value = b.config.product_ids ?? []`
- Reset sets `productIds.value = []`
- `submit()` sets `config.product_ids = productIds.value` when `type === 'curated'`
- `<ProductPicker v-if="type === 'curated'" v-model="productIds" />` rendered below label/title fields

### Modified: `HomepageBlock.config` type

`product_ids?: number[]` added to the config shape in `aroma-admin/src/types/index.ts`.

### Modified: `apiGetProducts`

`ids?: number[]` added to the params type in `aroma-admin/src/api/admin.ts`.

---

## Storefront

### `HomeBlock` type

`'curated'` added to the `type` union in `aroma/src/types/index.ts`.

### New component: `CuratedSection`

In `aroma/src/features/home/HomeSection.tsx` — renders identically to `BestsellersSection` (label + title header, 3-column product grid). Arabic fallbacks: label `'مختارات خاصة'`, title `'مختارات المحرر'`. No "view all" action link.

### `HomeSections` switch

New `case 'curated'` renders `<CuratedSection>`.

---

## Out of Scope

- Pagination within a curated block
- Maximum product count enforcement (admin picks however many they want)
- Duplicate product detection across blocks
