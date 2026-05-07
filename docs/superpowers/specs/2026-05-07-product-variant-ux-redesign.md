# Product & Variant UX Redesign

**Date:** 2026-05-07
**Status:** Approved

## Problem

The current product creation flow is fragmented and confusing from a store owner's perspective:

1. **Specs appear in two places** — the create page has a Specifications section (no generate button, no prices) and the Variants page also has a Specs section. Neither feels like the "real" place.
2. **Multi-step confusion** — admins must click "Save Specs & Values" then separately click "Generate Variants" in the right order.
3. **Prices are an afterthought** — each variant must be edited one at a time via a modal after generation.
4. **No first-class single-variant path** — simple products with one price are still forced through spec/variant setup.

## Goals

- A store owner should be able to go from "product created" to "product ready to sell" without confusion about order of operations.
- Single-price products must be handled in fewer steps than multi-variant products.
- Prices for all variants must be fillable in one operation, not one modal at a time.

---

## Structure: Two Pages, Clear Responsibilities

### Product Create Page (`/products/new`) — no change to purpose, one removal

Remove the "Specifications" section entirely. The create page stays focused on product identity: Arabic name, English name, slug, description, images, brand, category, type, status flags, and card colors.

On save, the admin is redirected to the Variants & Images page as before.

### Variants & Images Page (`/products/:id/variants`) — full redesign

This page becomes the single place for all variant setup. It is redesigned as a **guided 3-step flow** when no variants exist, and a **direct price grid** when variants already exist.

---

## Variants Page: First Visit (No Variants Yet)

### Step indicators

A row of three numbered steps at the top of the page indicates progress and locks downstream steps until prerequisites are met.

```
[1 Product type]  [2 Define variants — locked]  [3 Set prices — locked]
```

Steps unlock sequentially. Completed steps show a checkmark and a brief summary label (e.g., "✓ Multiple variants", "✓ 6 variants generated").

### Images section

Shown as a full card above the step flow. After images are uploaded and the admin moves past Step 1, the images card collapses to a one-line summary ("3 images · Manage").

### Step 1 — Product type

Two radio options:

- **Single price & stock** — one price, one quantity. No spec setup needed.
- **Multiple variants** — the product comes in different sizes, colors, or combinations.

A "Continue →" button advances to the appropriate next step. The choice is local state only — not persisted to the backend.

For the **single-variant path**, clicking "Continue →" immediately calls `POST /admin/products/{id}/variants/generate` (with no spec assignments, which the existing backend supports — it creates one default variant). On success, Step 3 is shown with one pre-populated row. If the generate call fails, an error banner is shown and the admin stays on Step 1.

### Step 2 — Define variants (multi-variant path only)

- Dropdown to assign spec types from the global spec types list.
- Each assigned spec shows its values as removable tag chips.
- Tag input (type + Enter or click Add) to add values per spec.
- Up/down arrows to reorder specs (controls label order, e.g., "30ml / Gold" vs "Gold / 30ml").
- A preview line shows the combination count before committing: *"Will generate 6 variants (3 × 2)"*.
- **One button: "⚡ Generate Variants"** — replaces the separate "Save Specs & Values" and "Generate Variants" buttons. Clicking it:
  1. Calls `PUT /admin/products/{id}/specs` to persist spec assignments and values.
  2. Calls `POST /admin/products/{id}/variants/generate` to create all combinations.
  3. On success, advances to Step 3.
- If variants already exist from a previous generate, a confirmation modal appears before proceeding: *"This will permanently delete N existing variants and regenerate from your current spec values. Continue?"*
- If any assigned spec has no values, the button is disabled with a tooltip: *"Add at least one value for each spec."*

### Step 3 — Set prices & stock

**Single-variant path:**
A simple 2×2 grid (price, original price, quantity, low stock threshold). One "Save" button. Done.

**Multi-variant path:**
An inline-editable table with one row per variant. All inputs are visible at once — no modals.

Columns:
| Variant | Price (LYD) | Original price | Qty in stock | Low stock at |
|---------|-------------|----------------|--------------|--------------|

- Variant label is derived from spec values in sort order (e.g., "30ml / Gold").
- Original price column inputs are styled lighter — they are optional and visually secondary.
- A "★ Default" badge appears on the default variant row. Clicking a different row's badge sets that variant as default via `PUT /admin/products/{id}/variants/{id}/default`.
- Stock status (in stock / low stock / out of stock) is shown as a live computed preview next to the save button — calculated from qty vs low_stock_threshold.
- **One "Save Prices & Stock" button** calls the new bulk update endpoint with all rows. Individual rows are not saved separately.

---

## Variants Page: Returning Visit (Variants Already Exist)

No wizard. The page opens directly in the completed state:

**Top — collapsed summary cards:**
- Images card: thumbnail count + "Manage" button (expands to full image grid).
- Specs card (multi-variant products only): one-line summary of the spec configuration + "Edit Specs" button. For single-variant products (no specs), this card is not shown — instead, a subtle "Switch to multiple variants" link appears below the price table.

**Main — price/stock table:**
Same inline-editable table as Step 3 above. Shown immediately. No step indicators.

**"Edit Specs" flow:**
Clicking "Edit Specs" expands the spec editor inline (same UI as Step 2). Admin modifies values and clicks "Regenerate Variants". Confirmation modal as before. After regeneration the table refreshes.

---

## API Changes

### New endpoint

**`PUT /admin/products/{id}/variants/bulk`**

Accepts an array of variant updates and saves all in one request.

Request body:
```json
{
  "variants": [
    { "id": 12, "price": 89.00, "original_price": null, "quantity": 50, "low_stock_threshold": 5 },
    { "id": 13, "price": 149.00, "original_price": 199.00, "quantity": 30, "low_stock_threshold": 5 }
  ]
}
```

Response: the updated variant array (same shape as individual variant responses).

### Removed from the admin frontend

- **Manual "Add Variant" button and modal** — variants come from generation only. The `POST /admin/products/{id}/variants` endpoint stays on the backend but is not exposed in the UI.

### Unchanged

All spec type endpoints, the generate endpoint, the individual variant GET/PUT/DELETE endpoints, the default endpoint, and all image endpoints are unchanged.

---

## Removed from Product Create Page

The "Specifications" section (Step 1: Assign Spec Types + Step 2: Define Values) is removed from `ProductCreateView.vue`. The corresponding `apiGetSpecTypes` and `apiSaveProductSpecs` calls are removed from that component. The create page no longer touches specs.

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Generate clicked with a spec that has no values | Button disabled; tooltip shown |
| Generate when variants exist | Confirmation modal before proceeding |
| Save Prices with an empty price field | Inline validation: red border + "Price is required" under that cell |
| Bulk save partial failure | Show error banner above table; no rows are cleared |
| Images section — unchanged | Same as current implementation |

---

## Out of Scope

- Storefront rendering of the new spec-based variant labels (handled separately).
- Per-variant images tied to spec values.
- Importing or exporting variant data.
- Bulk price fill ("apply this price to all variants") — can be added later if needed.
