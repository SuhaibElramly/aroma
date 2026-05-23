# Product Card Background Colour Picker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a background colour picker field to both the "Add Product" drawer and the "Edit Product" modal so admins can set `placeholder_bg` instead of it being hardcoded.

**Architecture:** Two self-contained Vue component edits. No new components needed — the picker pattern (native `<input type="color">` overlaid with a colour swatch + a hex text input) already exists in `StepBasicInfo.vue` and is copied inline into each place.

**Tech Stack:** Vue 3 (Composition API), TypeScript, Tailwind CSS, vue-i18n

---

### Task 1: Add colour picker to NewProductDrawer

**Files:**
- Modify: `aroma-admin/src/components/product/NewProductDrawer.vue`

The drawer currently hardcodes `placeholder_bg` at publish time. This task:
1. Adds `placeholderBg` to the form state, defaulting to the selected category's colour.
2. Inserts the picker UI in the Basics section between the description field and the flag chips.
3. Wires the form value into the publish payload.

- [ ] **Step 1: Add `placeholderBg` to `emptyForm()`**

In `NewProductDrawer.vue`, find `emptyForm()` (~line 464) and add the new field:

```ts
const emptyForm = () => ({
  nameEn:       '',
  nameAr:       '',
  type:         'EDP' as string,
  brandId:      '',
  categoryId:   '',
  description:  '',
  isNew:        false,
  isBestseller: false,
  isOffer:      false,
  placeholderBg: '#F2E8E5',
})
```

- [ ] **Step 2: Seed the default from the selected category when it changes**

After the `selectedCategory` computed (~line 490), add a watcher so switching category pre-fills the colour (only if user hasn't deviated from the default):

```ts
watch(selectedCategory, (cat) => {
  if (cat?.bg) form.value.placeholderBg = cat.bg
})
```

- [ ] **Step 3: Add the picker UI to the Basics section**

Find the description `<div>` block in the template (~line 115–119):

```html
<!-- Description -->
<div>
  <label class="label-field">{{ t('newProductDrawer.description') }}</label>
  <ATextarea v-model="form.description" :placeholder="t('newProductDrawer.descriptionPh')" rows="3" />
</div>
```

Add the colour picker block immediately after it, before the flag chips `<div>`:

```html
<!-- Card colour -->
<div>
  <label class="label-field">{{ t('newProductDrawer.cardColour') }}</label>
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
</div>
```

- [ ] **Step 4: Add the i18n key**

In `aroma-admin/src/locales/en.ts`, find the `newProductDrawer` block and add:

```ts
cardColour: 'Card Colour',
```

In `aroma-admin/src/locales/ar.ts`, find the `newProductDrawer` block and add:

```ts
cardColour: 'لون البطاقة',
```

- [ ] **Step 5: Wire form value into the publish payload**

In `handlePublish` (~line 666), replace:

```ts
placeholder_bg:  selectedCategory.value?.bg || '#F2E8E5',
```

with:

```ts
placeholder_bg:  form.value.placeholderBg,
```

Leave `placeholder_dot: '#C9A0A0'` unchanged.

- [ ] **Step 6: Commit**

```bash
git add aroma-admin/src/components/product/NewProductDrawer.vue \
        aroma-admin/src/locales/en.ts \
        aroma-admin/src/locales/ar.ts
git commit -m "feat: add bg colour picker to new product drawer"
```

---

### Task 2: Add colour picker to ProductDetailView edit modal

**Files:**
- Modify: `aroma-admin/src/views/ProductDetailView.vue`

The edit modal has no colour field. This task adds `placeholder_bg` to the form state, populates it from the loaded product, shows the picker in the modal, and includes it in the save payload.

- [ ] **Step 1: Add `placeholder_bg` to `productForm` ref**

Find the `productForm` ref (~line 26):

```ts
const productForm = ref({ name: '', name_en: '', type: '', description: '', brand_id: '', category_id: '', is_new: false, is_bestseller: false, is_offer: false })
```

Add the new field:

```ts
const productForm = ref({ name: '', name_en: '', type: '', description: '', brand_id: '', category_id: '', is_new: false, is_bestseller: false, is_offer: false, placeholder_bg: '#F2E8E5' })
```

- [ ] **Step 2: Populate `placeholder_bg` when loading the product**

Find the block that sets `productForm.value` (~line 134). After `is_offer`:

```ts
is_offer:      product.value.isOffer ?? false,
```

Add:

```ts
placeholder_bg: product.value.placeholderBg || '#F2E8E5',
```

- [ ] **Step 3: Add the picker UI to the edit modal**

Find the description textarea block in the modal (~line 871–874):

```html
<div>
  <label class="block text-[11px] font-semibold uppercase tracking-[.14em] text-dash-faint mb-1.5">{{ t('productDetail.descriptionLabel') }}</label>
  <textarea v-model="productForm.description" rows="3" class="w-full px-3 py-2 rounded-btn border border-dash-border-lt text-[13px] outline-none bg-dash-bg text-dash-text focus:border-dash-primary transition-colors resize-none leading-relaxed" />
</div>
```

Add the colour picker block immediately after it, before the flag checkboxes `<div>`:

```html
<div>
  <label class="block text-[11px] font-semibold uppercase tracking-[.14em] text-dash-faint mb-1.5">{{ t('productDetail.cardColourLabel') }}</label>
  <div class="flex items-center gap-2">
    <div class="relative w-8 h-8 rounded-btn overflow-hidden border border-dash-border-lt shrink-0">
      <input type="color" v-model="productForm.placeholder_bg"
             class="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
      <div class="w-full h-full" :style="{ backgroundColor: productForm.placeholder_bg }" />
    </div>
    <input type="text" v-model="productForm.placeholder_bg" maxlength="7"
           class="w-28 rounded-btn border border-dash-border-lt bg-dash-bg px-2.5 py-1.5
                  text-[12.5px] font-mono text-dash-text focus:outline-none focus:border-dash-primary" />
  </div>
</div>
```

- [ ] **Step 4: Add the i18n key**

In `aroma-admin/src/locales/en.ts`, find the `productDetail` block and add:

```ts
cardColourLabel: 'Card Colour',
```

In `aroma-admin/src/locales/ar.ts`, find the `productDetail` block and add:

```ts
cardColourLabel: 'لون البطاقة',
```

- [ ] **Step 5: Include `placeholder_bg` in the save payload**

In `saveProduct` (~line 153), after `is_offer: productForm.value.is_offer,` add:

```ts
placeholder_bg: productForm.value.placeholder_bg,
```

- [ ] **Step 6: Commit**

```bash
git add aroma-admin/src/views/ProductDetailView.vue \
        aroma-admin/src/locales/en.ts \
        aroma-admin/src/locales/ar.ts
git commit -m "feat: add bg colour picker to product edit modal"
```

---

### Task 3: Manual verification

- [ ] **Step 1: Start the admin dev server**

```bash
cd aroma-admin && npm run dev
```

- [ ] **Step 2: Verify the Add Product drawer**

Open the admin, click "Add Product". Confirm:
- "Card Colour" label appears between the Description field and the flag chips
- The colour swatch shows the selected category's default colour
- Clicking the swatch opens the native colour picker
- Typing a hex value in the text input updates the swatch immediately
- Changing category updates the swatch to the new category's colour
- Publishing the product and opening it in the storefront shows the correct card background

- [ ] **Step 3: Verify the Edit Product modal**

Open any product's detail page, click Edit. Confirm:
- "Card Colour" label appears between Description and the flag checkboxes
- The swatch shows the product's current `placeholder_bg` value
- Picking a new colour and saving updates the card background on the storefront

- [ ] **Step 4: Verify RTL/Arabic locale**

Switch the admin to Arabic. Confirm the "لون البطاقة" label appears in both the drawer and the edit modal.
