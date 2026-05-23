# Product Card Background Colour Picker

## Problem

`NewProductDrawer.vue` hardcodes `placeholder_bg` from the selected category colour at publish time — the admin has no way to set a custom card background. `ProductDetailView.vue` has a product edit modal that also omits the field entirely, so existing products can never have their background colour updated.

The stepper create flow (`StepBasicInfo.vue`) already has a working colour picker pattern; we replicate it in the two missing places.

## Scope

Two files changed, no new components:

1. **`aroma-admin/src/components/product/NewProductDrawer.vue`** — add product drawer
2. **`aroma-admin/src/views/ProductDetailView.vue`** — edit product modal

Only `placeholder_bg` is exposed (dot/accent colour is out of scope).

## UI Pattern (reuse from StepBasicInfo)

A small colour swatch (8×8 rounded square, clicking opens the native browser colour picker) alongside a hex text input. Both bound to the same value via `v-model`.

```html
<div class="flex items-center gap-2">
  <div class="relative w-8 h-8 rounded-btn overflow-hidden border border-dash-border shrink-0">
    <input type="color" v-model="form.placeholderBg"
           class="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
    <div class="w-full h-full" :style="{ backgroundColor: form.placeholderBg }" />
  </div>
  <input type="text" v-model="form.placeholderBg" maxlength="7"
         class="w-28 rounded-btn border border-dash-border bg-dash-bg px-2.5 py-1.5
                text-xs font-mono text-dash-text focus:outline-none focus:border-dash-primary" />
</div>
```

## NewProductDrawer changes

- Add `placeholderBg` to `emptyForm()`, defaulting to `selectedCategory.value?.bg || '#F2E8E5'`.
- Place a "Card colour" label + picker row in the Basics section, between the description field and the flag chips.
- In `handlePublish`, replace the hardcoded `placeholder_bg: selectedCategory.value?.bg || '#F2E8E5'` with `placeholder_bg: form.value.placeholderBg`.
- `placeholder_dot` remains hardcoded as `'#C9A0A0'` (out of scope).

## ProductDetailView changes

- Add `placeholder_bg` to `productForm` ref, initialised from `product.value.placeholderBg || '#F2E8E5'` in `populateForm`.
- Add the picker row to the edit modal's `<div class="space-y-4">`, after the description textarea and before the flag checkboxes.
- Include `placeholder_bg: productForm.value.placeholder_bg` in the `saveProduct` API payload.

## No API changes

The API already accepts and stores `placeholder_bg` on both create and update endpoints. Nothing to change server-side.
