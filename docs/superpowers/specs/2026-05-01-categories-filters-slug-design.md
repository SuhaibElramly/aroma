# Categories Admin — Filters & Auto-slug Design

**Date:** 2026-05-01

## Overview

Two improvements to the admin Categories page:

1. **Filters** — mirror the BrandsView filter bar (label search + min/max product count).
2. **Auto-slug** — remove the manual ID/slug field from the create modal; derive the slug server-side from the label.

---

## Backend — `AdminCategoryController`

### `index()` — filtering

Accept three optional query parameters and apply them to the query:

| Param | Type | Behaviour |
|---|---|---|
| `label` | string | `LIKE %value%` on `categories.label` |
| `min_products` | int | `HAVING products_count >= value` |
| `max_products` | int | `HAVING products_count <= value` |

The base query stays the same (`withCount('products')->orderBy('label')`). Filters are only applied when the param is present and non-empty.

### `store()` — auto-slug

Remove `slug` from the validated fields. Derive it from `label`:

```
slug = strtolower(label)
     → replace spaces with '-'
     → strip anything not [a-z0-9-]
     → trim leading/trailing '-'
```

Enforce uniqueness: if the derived slug already exists, append `-2`, `-3`, etc. until unique.

Validation changes:
- Remove `slug` rule
- Keep `label` (required) and `bg` (required)

---

## Frontend — `CategoriesView.vue`

### Filter bar

Mirror BrandsView layout exactly:

```
Row 1 (full-width, 1-col): [ Label input ]
Row 2 (2-col):             [ Min Products ] [ Max Products ]
```

- `filterLabel`, `filterMinProducts`, `filterMaxProducts` refs
- All three debounced via `debouncedLoad` (same debounce pattern as BrandsView)
- On each change, call `loadCats()`

### Create modal

- Remove `<AInput v-if="!editing" v-model="form.id" label="ID (slug, e.g. women)" />` 
- Remove `id` from `emptyForm()` and the form ref shape
- Remove the `if (!editing.value && !form.value.id)` validation guard in `handleSave`

### `apiGetCategories` signature

Add optional filter params:

```ts
apiGetCategories(params?: {
  label?: string
  min_products?: number
  max_products?: number
})
```

Pass params as query string in the GET request.

---

## Type changes

No changes to `AdminCategory` interface — `slug` is already present but was just not shown in the table.

---

## Out of scope

- No pagination (categories list is short)
- No slug editing after creation
- No table column for `bg` colour swatch (existing behaviour unchanged)
