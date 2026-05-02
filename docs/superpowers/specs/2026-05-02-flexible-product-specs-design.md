# Flexible Product Specifications & Variants

**Date:** 2026-05-02
**Status:** Approved

## Overview

Replace the hardcoded `size` (ml) column on product variants with a fully normalized, admin-configurable specification system. Admins manage a global list of spec types (e.g. "Size", "Color", "Weight"), assign which specs each product uses, define allowed values per spec, and auto-generate all variant combinations. Each variant's identity is stored in a normalized `variant_spec_values` pivot table.

Products with no specs are fully supported — they get a single variant with only price and stock.

---

## Database Schema

### New Tables

**`spec_types`** — globally managed spec types
```
id               bigint PK
name             string       e.g. "Color", "Size"
unit             string|null  e.g. "ml", "g" — appended when displaying values
timestamps
```

**`product_spec_assignments`** — which spec types a product uses, in what order
```
id               bigint PK
product_id       FK → products (cascade delete)
spec_type_id     FK → spec_types (restrict delete)
sort_order       integer      controls display order of specs in variant labels
timestamps
unique(product_id, spec_type_id)
```

**`product_spec_values`** — the allowed values per spec per product
```
id               bigint PK
product_id       FK → products (cascade delete)
spec_type_id     FK → spec_types (restrict delete)
value            string       e.g. "30", "Gold", "Large"
sort_order       integer      controls order within that spec's value list
timestamps
```

**`variant_spec_values`** — the specific value each variant holds per spec
```
id               bigint PK
variant_id       FK → product_variants (cascade delete)
spec_type_id     FK → spec_types (restrict delete)
value            string
timestamps
unique(variant_id, spec_type_id)
```

### Modified Tables

**`product_variants`** — drop the `size` column. All other columns unchanged:
`price`, `original_price`, `quantity`, `low_stock_threshold`, `stock`, `is_default`.

A variant's human-readable label (e.g. "30ml / Gold") is derived from its `variant_spec_values` joined through `spec_types` and ordered by `product_spec_assignments.sort_order`.

---

## API Endpoints

### Spec Types (new)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/spec-types` | List all spec types |
| POST | `/admin/spec-types` | Create spec type |
| PUT | `/admin/spec-types/{id}` | Update name or unit |
| DELETE | `/admin/spec-types/{id}` | Delete — blocked with 422 if assigned to any product |

### Product Specs (new)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/products/{id}/specs` | Return assigned spec types with their values |
| PUT | `/admin/products/{id}/specs` | Replace all spec assignments and values |

`GET` response shape:
```json
{
  "specs": [
    {
      "spec_type_id": 1,
      "name": "Size",
      "unit": "ml",
      "sort_order": 0,
      "values": [
        { "id": 1, "value": "30", "sort_order": 0 },
        { "id": 2, "value": "50", "sort_order": 1 }
      ]
    }
  ]
}
```

### Variant Generation (new)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/products/{id}/variants/generate` | Generate variants from cartesian product of spec values |

- If no variants exist: generate immediately, return created variants.
- If variants already exist and `?force=true` is absent: return `409` with `{ "existing_count": N }`.
- If `?force=true`: delete all existing variants, then generate.

### Important: Updating Specs Does Not Affect Existing Variants

`PUT /admin/products/{id}/specs` only updates spec assignments and their allowed values. It does NOT delete or modify existing variants. Existing variants retain their `variant_spec_values` until the admin clicks Generate. The Generate step is the sole action that reconciles variants with the current spec config.

### Existing Variant Endpoints — unchanged

Admin still uses existing `GET/POST/PUT/DELETE /admin/products/{id}/variants` to edit price, stock, quantity, and default status after generation.

**Variant response shape** — add `specs` array:
```json
{
  "id": 12,
  "price": "50.00",
  "quantity": 100,
  "stock": "in_stock",
  "isDefault": true,
  "specs": [
    { "name": "Size", "unit": "ml", "value": "30" },
    { "name": "Color", "unit": null, "value": "Gold" }
  ]
}
```

The `specs` array is ordered by `product_spec_assignments.sort_order` so the label always renders consistently.

---

## Backend Implementation

### Models

- `SpecType` — `hasMany ProductSpecAssignment`, `hasMany ProductSpecValue`, `hasMany VariantSpecValue`
- `ProductSpecAssignment` — `belongsTo Product`, `belongsTo SpecType`
- `ProductSpecValue` — `belongsTo Product`, `belongsTo SpecType`
- `VariantSpecValue` — `belongsTo ProductVariant`, `belongsTo SpecType`
- `ProductVariant` — `hasMany VariantSpecValue`; remove `size` from `$fillable`

### Cartesian Product Generation

```
1. Load product's spec assignments ordered by sort_order
2. For each assignment, load its product_spec_values ordered by sort_order
3. Compute cartesian product of all value arrays
4. For each combination, create one ProductVariant (price=0, quantity=0, stock=out_of_stock)
5. For each variant, create VariantSpecValue rows (one per spec in the combination)
6. Auto-set is_default=true on the first variant (existing booted() logic handles this)
```

If a product has no spec assignments, generate one variant with no spec values.

### SpecType Delete Guard

In `AdminSpecTypeController::destroy()`, check if any `ProductSpecAssignment` references the spec type. If yes, return 422: `"This spec type is assigned to N products and cannot be deleted."`.

---

## Admin Frontend

### New Page: Spec Types (`/spec-types`)

Sidebar link under Products. Simple management page:
- Table: Name | Unit | Products using it | Actions (Edit inline, Delete)
- "Add Spec Type" button → inline form row: name input + unit input (optional)
- Delete blocked visually (disabled button + tooltip) if the spec type is in use

### Updated Page: Variants & Images (`/products/:id/variants`)

The page gains a new **"Specs"** section above the existing variants table, structured in two steps:

**Step 1 — Assign Specs**
- Multi-select dropdown populated from global spec types
- Selected specs appear as ordered chips; up/down arrows to reorder
- "Save Specs" button persists the assignment via `PUT /admin/products/{id}/specs`

**Step 2 — Define Values** (shown after specs are saved)
- For each assigned spec, a tag-input field where admin types values and presses Enter to add each one
- Values can be removed with ×
- A single "Save Values" button at the bottom of the section persists all changes via `PUT /admin/products/{id}/specs`

**Generate Variants button**
- Shows a preview: *"Will create 6 variants (3 × 2)"*
- If no existing variants: clicking generates immediately
- If variants exist: confirmation modal — *"This will permanently delete 4 existing variants and regenerate. Continue?"*
- After generation, the variants table below refreshes with the new rows

**Variants table** — updated columns:
- Replace "Size (ml)" column with a "Variant" column that renders the spec label (e.g. "30ml / Gold")
- If the product has no specs, show "Default" in that column
- All other columns (Price, Original, Qty, Status, Default) unchanged

**Edit variant modal** — remove the Size field. Show the spec label as read-only text at the top. Admin only edits price, original price, quantity, and low stock threshold.

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Delete spec type in use | 422 with message listing how many products use it |
| Generate with existing variants, no `?force` | 409 with `existing_count`; frontend shows confirmation modal |
| Generate with no spec values defined | 422: "Add at least one value per spec before generating" |
| Product has specs but admin adds a no-spec variant manually | Not supported — variant creation modal only appears after generation |

---

## Out of Scope

- Storefront UI changes to render spec labels (handled by existing `size` display — updating that is a separate task)
- Importing/exporting variant data
- Per-variant images tied to spec values
