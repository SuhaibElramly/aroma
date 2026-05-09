# Product Creation Stepper

**Date:** 2026-05-09  
**Scope:** Admin panel — replace the create-product modal + separate variants page with a single unified stepper page. Add per-variant image galleries. Update storefront to show variant images when available.

---

## Goals

- Eliminate the two-step friction: dialog → separate variants page.
- Guide admins through creation in a linear flow (Info → Images → Variants).
- Enforce at least one product image before variants can be configured.
- Allow each variant to carry its own optional image gallery.
- Storefront shows variant images when the selected variant has them; falls back to product images otherwise.

---

## Routes

| Before | After |
|---|---|
| Modal (`AModal`) in `ProductsView.vue` | Removed |
| `GET /products/new` → `ProductCreateView.vue` | `GET /products/new` → `ProductStepperView.vue` (create mode) |
| `GET /products/:id/variants` → `ProductVariantsView.vue` | `GET /products/:id/edit` → `ProductStepperView.vue` (edit mode) |
| "Variants" action button on product list | Renamed to "Edit" → `/products/:id/edit` |

The old `/products/:id/variants` route is redirected to `/products/:id/edit` so any bookmarks or links remain valid.

`ProductCreateView.vue` and `ProductVariantsView.vue` are removed once the stepper is complete.

---

## ProductStepperView.vue

One component, two modes derived from the route:

- **Create mode** (`/products/new`): steps unlock linearly; step 2 and 3 are locked until the previous step is saved.
- **Edit mode** (`/products/:id/edit`): all steps are immediately accessible and clickable; header shows a "Done" button that saves the current step (if there are unsaved changes) and navigates back to `/products`.

### Stepper header (sticky)

Three step indicators with connecting lines:

- **Pending** (create, not yet reached): gray circle with number, grayed label, not clickable.
- **Active**: purple circle with number, purple ring, "In progress" sub-label.
- **Complete** (create) / **All steps** (edit): green circle with checkmark, green label, clickable to jump.

Connecting line between steps: gray when the next step is pending, green once both sides are complete.

---

## Step 1 — Basic Info

### Fields

- Arabic name (required, `dir="rtl"`)
- English name (required) — auto-generates slug on input
- Slug preview (read-only, derived)
- Description (optional textarea)
- Brand (required select)
- Category (required select)
- Type — EDP / EDT / Parfum / EDC (required select)
- Status flags: Is New, Is Bestseller, Is On Offer (checkboxes)
- Card color: background hex + accent hex with live preview swatch

### Behaviour

- **Create:** Next validates required fields. On pass, calls `apiCreateProduct()`, stores the returned `productId` in component state, advances to step 2. Steps 2–3 unlock.
- **Edit:** Pre-populated from existing product data. Next calls `apiUpdateProduct(productId, …)` then advances.
- Validation errors shown inline per field.

---

## Step 2 — Images

### Fields

- Drag-and-drop upload zone (same interaction as current `ProductCreateView.vue`)
- Image grid preview; first image gets "Cover" badge
- Click any image to promote it to cover (calls `apiSetThumbnail`)
- ✕ button per image to remove it

### Behaviour

- **Required:** the Next button is disabled and an inline error is shown if no images are uploaded.
- **Create:** on Next, calls `apiUploadImages(productId, pendingFiles)` for any new files, then advances to step 3.
- **Edit:** existing images loaded via `apiGetImages(productId)` on mount. New files are uploaded immediately on drop/select. Deletions call `apiDeleteImage` immediately.
- Maximum 10 images.

---

## Step 3 — Variants

Contains all logic currently in `ProductVariantsView.vue` wizard mode:

1. **Single vs Multi toggle** — "This product has one variant" vs "Multiple variants (by size, concentration, etc.)".
2. **Spec definition** (multi only) — add spec types, enter values per spec, preview combination count.
3. **Generate** — calls `apiGenerateVariants(productId)`. Shows confirmation if variants already exist.
4. **Pricing & stock table** — editable rows: price, original price (optional), quantity, low-stock threshold; "Default" star per row.

### Per-variant images (new)

Each row in the pricing table has an **Images** column showing:
- Thumbnails of already-uploaded variant images (up to 3 stacked, "+ N more" overflow label).
- A `+` icon button that expands an inline upload panel below the row.

The inline upload panel mirrors the product images UI but is scoped to that variant. Images are uploaded immediately via `POST /admin/products/:id/variants/:variantId/images`. Existing images can be deleted via `DELETE /admin/products/:id/variants/:variantId/images/:imageId`.

Variant images are **optional** — a variant with no images inherits the product's images on the storefront.

### Behaviour

- **Create:** Save button calls `apiSaveVariants(productId, rows)` then navigates to `/products` (list).
- **Edit:** Save button calls `apiSaveVariants(productId, rows)` then navigates to `/products`. Step 1 and step 2 changes are already persisted when Next was clicked on those steps, so no additional calls are needed here.
- Back button returns to step 2 in both modes.

---

## Backend additions

### New endpoints (variant images)

```
GET    /admin/products/:id/variants/:variantId/images
POST   /admin/products/:id/variants/:variantId/images     (multipart, field: images[])
DELETE /admin/products/:id/variants/:variantId/images/:imageId
```

Response shape mirrors existing product image endpoints (`ProductImage[]`).

### Type update

```ts
// aroma-admin/src/types/index.ts
export interface ProductVariant {
  // … existing fields …
  images?: ProductImage[]   // absent = not loaded; empty array = no images
}
```

---

## Storefront — ProductPageClient.tsx

### Current logic

Always displays `product.images` (gallery) and `product.thumbnailUrl` (active image default).

### New logic

```
activeVariant selected AND activeVariant.images.length > 0
  → displayImages = activeVariant.images
  → hide product gallery thumbnails
otherwise
  → displayImages = product.images (unchanged)
```

The `activeImg` state (user-clicked thumbnail) resets to `null` whenever the selected variant changes, so the first image of whichever set is relevant is shown automatically.

Variants without images need no backend change — the storefront simply doesn't receive an `images` field for them (or receives an empty array).

---

## What is removed

- `AModal` create/edit block in `ProductsView.vue` (the `modalOpen`, `form`, `editing` state and the `<AModal>` template block).
- `ProductCreateView.vue` — replaced by `ProductStepperView.vue`.
- `ProductVariantsView.vue` — replaced by step 3 of `ProductStepperView.vue`.
- Route `products/new` pointing to `ProductCreateView` and `products/:id/variants` pointing to `ProductVariantsView` — replaced/redirected.

---

## Out of scope

- Bulk product import.
- Reordering variant rows via drag-and-drop (existing behaviour unchanged).
- Video upload per variant.
