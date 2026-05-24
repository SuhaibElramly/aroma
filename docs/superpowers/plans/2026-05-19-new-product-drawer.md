# New Product Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the current 3-step full-page `ProductStepperView` create flow with a right-side drawer that matches the design — a single scrollable panel with live preview, basics, variants, and media sections.

**Architecture:** A `useNewProductDrawer` composable holds a module-level `isOpen` ref shared across `Topbar`, `ProductsView`, and `AppLayout`. `AppLayout` hosts `<NewProductDrawer />` at root level so it overlays the entire UI. On Publish: create product → save specs → generate variants → bulk-update prices → upload images → close + refresh.

**Tech Stack:** Vue 3 Composition API, vue-i18n, Tailwind CSS w/ existing design tokens (`dash-*`), lucide-vue-next icons, existing `admin.ts` API functions.

---

## Design Summary (from `Aroma Admin Redesign.html`)

The drawer is 720 px wide, slides in from the right. Structure:
1. **Sticky header**: eyebrow "Catalog · New", title "New product", subtitle, × close button
2. **Scrollable body**:
   - **Live preview tile**: category-colored block with first letter, name, brand/slug, price
   - **Basics section**: Name EN + Name AR (2-col), slug preview (auto from EN), Type pills (EDP/EDT/Parfum/EDC) + Brand + Category (3-col), Description, Flag chips (New / Bestseller / On offer)
   - **Variants section**: Single/Multi radio cards; single → 4-col (Cost, Selling price, Stock, Low at) + live profit; multi → spec selector + values + Generate → table (Variant / Cost / Price / Margin / Stock / Low / Set default)
   - **Media section**: upload slot + image previews
3. **Sticky footer**: "Required fields marked." + Cancel / Publish

---

## Files

| Action | Path |
|--------|------|
| Create | `aroma-admin/src/composables/useNewProductDrawer.ts` |
| Create | `aroma-admin/src/components/product/NewProductDrawer.vue` |
| Modify | `aroma-admin/src/components/layout/AppLayout.vue` |
| Modify | `aroma-admin/src/components/layout/Topbar.vue` |
| Modify | `aroma-admin/src/views/ProductsView.vue` |
| Modify | `aroma-admin/src/locales/en.ts` |
| Modify | `aroma-admin/src/locales/ar.ts` |

---

## Task 1: Add i18n strings

**Files:**
- Modify: `aroma-admin/src/locales/en.ts`
- Modify: `aroma-admin/src/locales/ar.ts`

- [x] **Step 1: Add English strings**

In `en.ts`, after the `stepper` block (around line 361), add a new `newProductDrawer` key:

```typescript
  newProductDrawer: {
    eyebrow:        'Catalog · New',
    title:          'New product',
    subtitle:       'Add a fragrance to your catalog.',
    basics:         'Basics',
    namEn:          'Name (EN)',
    nameAr:         'Name (AR)',
    slugPreview:    'URL slug',
    typePill:       'Type',
    brand:          'Brand',
    category:       'Category',
    description:    'Description',
    descriptionPh:  'Top notes, heart, base…',
    tags:           'Tags',
    flagNew:        'New arrival',
    flagBest:       'Bestseller',
    flagOffer:      'On offer',
    variants:       'Variants',
    variantsSub:    'Set up pricing for a single SKU or multiple.',
    single:         'Single price',
    singleDesc:     'One SKU, no specs.',
    multi:          'Multiple variants',
    multiDesc:      'Specs combine into SKUs.',
    cost:           'Cost',
    price:          'Selling price',
    stock:          'Stock',
    lowAt:          'Low at',
    profit:         'Profit per unit',
    margin:         'margin',
    chooseSpec:     'Choose a spec type…',
    addSpec:        'Add',
    noSpecsYet:     'No specs selected yet.',
    atLeastSpec:    'Add at least one spec to generate variants.',
    atLeastOnePerSpec: 'Add at least one value per spec.',
    atLeastOne:     'Needs at least one value',
    willGenerate:   'Will generate',
    generate:       'Generate variants',
    regenerate:     'Regenerate',
    addValuePh:     'Add a value for {name}…',
    variantCol:     'Variant',
    defaultMark:    'Default',
    setDefault:     'Set default',
    noVariantsYet:  'No variants yet',
    media:          'Media',
    upload:         'Upload image',
    uploadHint:     'JPG, PNG, WebP · up to 5 MB',
    required:       'Name, brand, category, and type are required.',
    cancel:         'Cancel',
    publish:        'Publish product',
    previewName:    'Untitled fragrance',
    variant:        'variant',
    variants2:      'variants',
    saveFailed:     'Failed to save product.',
  },
```

- [x] **Step 2: Add Arabic strings**

In `ar.ts`, add the matching Arabic block after the `stepper` section:

```typescript
  newProductDrawer: {
    eyebrow:        'كتالوج · جديد',
    title:          'منتج جديد',
    subtitle:       'أضف عطراً إلى الكتالوج.',
    basics:         'الأساسيات',
    namEn:          'الاسم (EN)',
    nameAr:         'الاسم (AR)',
    slugPreview:    'رابط URL',
    typePill:       'النوع',
    brand:          'العلامة',
    category:       'الفئة',
    description:    'الوصف',
    descriptionPh:  'النوتات العليا والوسطى والقاعدة…',
    tags:           'الوسوم',
    flagNew:        'جديد',
    flagBest:       'الأكثر مبيعاً',
    flagOffer:      'عرض',
    variants:       'الأصناف',
    variantsSub:    'سعر واحد أو عدة أصناف بمواصفات.',
    single:         'سعر واحد',
    singleDesc:     'صنف واحد بدون مواصفات.',
    multi:          'أصناف متعددة',
    multiDesc:      'تتولد من دمج المواصفات.',
    cost:           'سعر التكلفة',
    price:          'سعر البيع',
    stock:          'المخزون',
    lowAt:          'تنبيه عند',
    profit:         'الربح للوحدة',
    margin:         'هامش',
    chooseSpec:     'اختر نوع مواصفة…',
    addSpec:        'إضافة',
    noSpecsYet:     'لم تضف مواصفات بعد.',
    atLeastSpec:    'أضف مواصفة واحدة على الأقل.',
    atLeastOnePerSpec: 'أضف قيمة واحدة على الأقل لكل مواصفة.',
    atLeastOne:     'يحتاج قيمة واحدة على الأقل',
    willGenerate:   'سوف يولّد',
    generate:       'توليد الأصناف',
    regenerate:     'إعادة التوليد',
    addValuePh:     'أضف قيمة لـ {name}…',
    variantCol:     'الصنف',
    defaultMark:    'افتراضي',
    setDefault:     'اجعله افتراضي',
    noVariantsYet:  'لا توجد أصناف',
    media:          'الوسائط',
    upload:         'رفع صورة',
    uploadHint:     'JPG، PNG، WebP · حتى ٥ ميغابايت',
    required:       'الاسم والعلامة والفئة والنوع مطلوبة.',
    cancel:         'إلغاء',
    publish:        'نشر المنتج',
    previewName:    'عطر بدون اسم',
    variant:        'صنف',
    variants2:      'أصناف',
    saveFailed:     'فشل حفظ المنتج.',
  },
```

- [x] **Step 3: Commit**

```bash
git add aroma-admin/src/locales/en.ts aroma-admin/src/locales/ar.ts
git commit -m "feat(i18n): add newProductDrawer translation namespace"
```

---

## Task 2: Create `useNewProductDrawer` composable

**Files:**
- Create: `aroma-admin/src/composables/useNewProductDrawer.ts`

- [x] **Step 1: Write the composable**

Create `aroma-admin/src/composables/useNewProductDrawer.ts`:

```typescript
import { ref } from 'vue'

// Module-level singleton — shared across all consumers in the same app instance
const isOpen = ref(false)

export function useNewProductDrawer() {
  return {
    isOpen,
    open:  () => { isOpen.value = true },
    close: () => { isOpen.value = false },
  }
}
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/composables/useNewProductDrawer.ts
git commit -m "feat: add useNewProductDrawer composable"
```

---

## Task 3: Create `NewProductDrawer.vue`

**Files:**
- Create: `aroma-admin/src/components/product/NewProductDrawer.vue`

This is the main component. It renders a full-screen overlay with a 720 px panel that slides in from the right.

- [x] **Step 1: Write the complete component**

Create `aroma-admin/src/components/product/NewProductDrawer.vue` with the full content below:

```vue
<!-- aroma-admin/src/components/product/NewProductDrawer.vue -->
<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="fixed inset-0 z-50 flex justify-end" style="background:rgba(15,23,42,.30)" @click.self="close">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-x-full"
          enter-to-class="translate-x-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="translate-x-0"
          leave-to-class="translate-x-full"
        >
          <div v-if="isOpen"
            class="relative h-full w-full max-w-[720px] bg-dash-surface flex flex-col shadow-2xl"
            @click.stop
          >
            <!-- Sticky header -->
            <header class="shrink-0 px-6 py-4 border-b border-dash-border bg-dash-bg flex items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="text-[10px] font-semibold tracking-[.16em] uppercase text-dash-faint">{{ t('newProductDrawer.eyebrow') }}</p>
                <h2 class="text-xl font-bold text-dash-text mt-1 leading-tight">{{ t('newProductDrawer.title') }}</h2>
                <p class="text-xs text-dash-muted mt-0.5">{{ t('newProductDrawer.subtitle') }}</p>
              </div>
              <button @click="close"
                class="h-8 w-8 rounded-btn border border-dash-border bg-white flex items-center justify-center text-dash-muted hover:text-dash-text shrink-0 transition-colors">
                <X :size="14" />
              </button>
            </header>

            <!-- Scrollable body -->
            <div class="flex-1 overflow-y-auto">

              <!-- Live preview tile -->
              <div class="px-6 pt-5">
                <div class="bg-dash-bg border border-dash-border rounded-card p-4 flex items-center gap-4">
                  <div class="h-16 w-16 rounded-xl shrink-0 flex items-center justify-center text-lg font-bold border border-dash-border/50"
                       :style="previewTileStyle">
                    {{ previewInitial }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-[10px] font-medium tracking-widest uppercase text-dash-faint truncate">
                      {{ selectedCategory?.label || '—' }} · {{ form.type || '—' }}
                    </p>
                    <p class="text-sm font-bold text-dash-text mt-0.5 truncate">
                      {{ form.name || t('newProductDrawer.previewName') }}
                    </p>
                    <p class="text-xs text-dash-muted font-mono truncate">
                      {{ selectedBrand?.name || '—' }} · /p/{{ slug || '…' }}
                    </p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-base font-bold text-dash-text">
                      {{ previewPrice || '—' }}
                      <span v-if="previewPrice" class="text-xs font-normal text-dash-muted">LYD</span>
                    </p>
                    <p class="text-[10px] text-dash-faint">{{ previewSpecsLabel }}</p>
                  </div>
                </div>
              </div>

              <!-- ── Basics section ──────────────────────────── -->
              <section class="px-6 py-5 space-y-4">
                <p class="text-sm font-bold text-dash-text">{{ t('newProductDrawer.basics') }}</p>

                <!-- Name EN + AR -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="label-field">{{ t('newProductDrawer.namEn') }}</label>
                    <AInput v-model="form.nameEn" placeholder="Oud Royale" :error="errors.nameEn" @input="syncSlug" />
                    <p v-if="slug" class="mt-1 text-2xs text-dash-faint font-mono">
                      <span class="text-dash-muted">{{ t('newProductDrawer.slugPreview') }}:</span> /p/{{ slug }}
                    </p>
                  </div>
                  <div>
                    <label class="label-field">{{ t('newProductDrawer.nameAr') }}</label>
                    <AInput v-model="form.nameAr" placeholder="عود رويال" dir="rtl" :error="errors.nameAr" />
                  </div>
                </div>

                <!-- Type pills + Brand + Category -->
                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label class="label-field">{{ t('newProductDrawer.typePill') }}</label>
                    <div class="flex items-center p-1 rounded-btn border border-dash-border bg-dash-bg">
                      <button v-for="tp in productTypes" :key="tp"
                        type="button"
                        @click="form.type = tp"
                        class="flex-1 h-7 text-[11px] font-semibold rounded-md transition-colors"
                        :class="form.type === tp
                          ? 'bg-dash-text text-white'
                          : 'text-dash-muted hover:text-dash-text'">
                        {{ tp }}
                      </button>
                    </div>
                    <p v-if="errors.type" class="mt-1 text-2xs text-dash-danger">{{ errors.type }}</p>
                  </div>
                  <div>
                    <label class="label-field">{{ t('newProductDrawer.brand') }}</label>
                    <ASelect v-model="form.brandId" :options="brandOptions" :placeholder="t('productCreate.chooseBrand')" :error="errors.brandId" />
                  </div>
                  <div>
                    <label class="label-field">{{ t('newProductDrawer.category') }}</label>
                    <ASelect v-model="form.categoryId" :options="categoryOptions" :placeholder="t('productCreate.chooseCategory')" :error="errors.categoryId" />
                  </div>
                </div>

                <!-- Description -->
                <div>
                  <label class="label-field">{{ t('newProductDrawer.description') }}</label>
                  <ATextarea v-model="form.description" :placeholder="t('newProductDrawer.descriptionPh')" rows="3" />
                </div>

                <!-- Flag chips -->
                <div>
                  <label class="label-field">{{ t('newProductDrawer.tags') }}</label>
                  <div class="flex flex-wrap gap-2 mt-1">
                    <button v-for="flag in flags" :key="flag.key"
                      type="button"
                      @click="form[flag.key] = !form[flag.key]"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                      :class="form[flag.key]
                        ? 'border-dash-secondary bg-dash-secondary-lt text-dash-secondary'
                        : 'border-dash-border text-dash-muted hover:border-dash-muted'">
                      <span class="h-1.5 w-1.5 rounded-full transition-colors"
                            :class="form[flag.key] ? 'bg-dash-secondary' : 'bg-dash-border'" />
                      {{ t(flag.labelKey) }}
                    </button>
                  </div>
                </div>
              </section>

              <!-- ── Variants section ────────────────────────── -->
              <section class="px-6 py-5 border-t border-dash-border space-y-4">
                <div>
                  <p class="text-sm font-bold text-dash-text">{{ t('newProductDrawer.variants') }}</p>
                  <p class="text-xs text-dash-muted mt-0.5">{{ t('newProductDrawer.variantsSub') }}</p>
                </div>

                <!-- Single vs Multi radio cards -->
                <div class="grid grid-cols-2 gap-3">
                  <button v-for="opt in variantTypeOptions" :key="opt.value"
                    type="button"
                    @click="setProductType(opt.value)"
                    class="text-left p-3 rounded-xl border transition-all"
                    :class="productType === opt.value
                      ? 'border-dash-text bg-dash-bg'
                      : 'border-dash-border hover:border-dash-muted'">
                    <div class="flex items-center gap-2">
                      <span class="h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                            :class="productType === opt.value ? 'border-dash-text bg-dash-text' : 'border-dash-border'">
                        <span v-if="productType === opt.value" class="h-1.5 w-1.5 rounded-full bg-white" />
                      </span>
                      <p class="text-xs font-semibold text-dash-text">{{ t(opt.labelKey) }}</p>
                    </div>
                    <p class="text-[11px] text-dash-muted mt-1 ms-6">{{ t(opt.descKey) }}</p>
                  </button>
                </div>

                <!-- Single pricing -->
                <div v-if="productType === 'single'" class="bg-dash-bg rounded-card p-3 space-y-3">
                  <div class="grid grid-cols-4 gap-2">
                    <div>
                      <label class="label-field">{{ t('newProductDrawer.cost') }}</label>
                      <div class="flex items-center px-2.5 rounded-btn border border-dash-border h-9 bg-white">
                        <input v-model="singleRow.cost" type="number" min="0" step="0.01" placeholder="0"
                          class="bg-transparent text-xs outline-none flex-1 w-0" />
                        <span class="text-[10px] text-dash-faint shrink-0">LYD</span>
                      </div>
                    </div>
                    <div>
                      <label class="label-field">{{ t('newProductDrawer.price') }}</label>
                      <div class="flex items-center px-2.5 rounded-btn border border-dash-border h-9 bg-white">
                        <input v-model="singleRow.price" type="number" min="0" step="0.01" placeholder="0"
                          class="bg-transparent text-xs outline-none flex-1 w-0" />
                        <span class="text-[10px] text-dash-faint shrink-0">LYD</span>
                      </div>
                    </div>
                    <div>
                      <label class="label-field">{{ t('newProductDrawer.stock') }}</label>
                      <input v-model="singleRow.quantity" type="number" min="0"
                        class="w-full h-9 px-2.5 rounded-btn border border-dash-border bg-white text-xs outline-none" />
                    </div>
                    <div>
                      <label class="label-field">{{ t('newProductDrawer.lowAt') }}</label>
                      <input v-model="singleRow.lowStockThreshold" type="number" min="0"
                        class="w-full h-9 px-2.5 rounded-btn border border-dash-border bg-white text-xs outline-none" />
                    </div>
                  </div>
                  <!-- Profit calc -->
                  <div class="flex items-center justify-between pt-2 border-t border-dash-border text-xs">
                    <span class="text-dash-muted">{{ t('newProductDrawer.profit') }}</span>
                    <span v-if="singleProfitInfo" class="font-semibold"
                          :class="singleProfitInfo.profit >= 0 ? 'text-emerald-600' : 'text-dash-danger'">
                      {{ singleProfitInfo.profit.toFixed(2) }} LYD
                      <span class="font-normal text-dash-muted">· {{ singleProfitInfo.margin.toFixed(1) }}% {{ t('newProductDrawer.margin') }}</span>
                    </span>
                    <span v-else class="text-dash-faint">—</span>
                  </div>
                </div>

                <!-- Multi: spec selector -->
                <template v-else>
                  <div class="bg-dash-bg rounded-card p-3 space-y-3">
                    <!-- Add spec row -->
                    <div class="flex items-center gap-2">
                      <select v-model="specToAdd"
                        class="flex-1 h-9 px-3 rounded-btn border border-dash-border bg-white text-xs text-dash-text outline-none focus:border-dash-primary">
                        <option value="">{{ t('newProductDrawer.chooseSpec') }}</option>
                        <option v-for="s in availableSpecTypes" :key="s.id" :value="s.id">
                          {{ s.name }}{{ s.unit ? ` (${s.unit})` : '' }}
                        </option>
                      </select>
                      <AButton size="sm" variant="secondary" :disabled="!specToAdd" @click="addSpec">
                        {{ t('newProductDrawer.addSpec') }}
                      </AButton>
                    </div>

                    <!-- No specs yet -->
                    <p v-if="assignedSpecs.length === 0" class="text-xs text-center py-2 text-dash-muted">
                      {{ t('newProductDrawer.noSpecsYet') }}
                    </p>

                    <!-- Assigned specs -->
                    <div v-else class="space-y-2">
                      <div v-for="(spec, idx) in assignedSpecs" :key="spec.spec_type_id"
                        class="rounded-btn border border-dash-border bg-white p-3">
                        <div class="flex items-center gap-2 mb-2">
                          <span class="text-xs font-semibold text-dash-text flex-1">
                            {{ spec.name }}{{ spec.unit ? ` (${spec.unit})` : '' }}
                          </span>
                          <button :disabled="idx === 0" @click="moveSpec(idx, -1)"
                            class="h-5 w-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30">
                            <ChevronUp :size="12" />
                          </button>
                          <button :disabled="idx === assignedSpecs.length - 1" @click="moveSpec(idx, 1)"
                            class="h-5 w-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30">
                            <ChevronDown :size="12" />
                          </button>
                          <button @click="removeSpec(idx)"
                            class="h-5 w-5 flex items-center justify-center text-dash-muted hover:text-dash-danger">
                            <X :size="12" />
                          </button>
                        </div>
                        <!-- Value chips -->
                        <div class="flex flex-wrap gap-1.5 mb-2">
                          <span v-for="(val, vi) in spec.values" :key="vi"
                            class="inline-flex items-center gap-1 rounded-full border border-dash-border bg-dash-bg px-2.5 py-1 text-xs font-medium text-dash-text">
                            {{ val }}{{ spec.unit ? ` ${spec.unit}` : '' }}
                            <button @click="removeValue(spec, vi)" class="text-dash-faint hover:text-dash-danger ms-0.5">
                              <X :size="10" />
                            </button>
                          </span>
                          <span v-if="spec.values.length === 0" class="text-[11px] text-dash-danger">
                            {{ t('newProductDrawer.atLeastOne') }}
                          </span>
                        </div>
                        <!-- Add value input -->
                        <div class="flex gap-2">
                          <input v-model="valueInputs[spec.spec_type_id]"
                            :placeholder="t('newProductDrawer.addValuePh').replace('{name}', spec.name)"
                            class="flex-1 h-8 px-2.5 rounded-btn border border-dash-border bg-dash-bg text-xs text-dash-text outline-none focus:border-dash-primary"
                            @keydown.enter.prevent="addValue(spec)" />
                          <AButton size="sm" variant="secondary" @click="addValue(spec)">
                            {{ t('common.add') }}
                          </AButton>
                        </div>
                      </div>
                    </div>

                    <!-- Generate bar -->
                    <div class="flex items-center justify-between pt-2 border-t border-dash-border">
                      <p class="text-xs" :class="specsValid ? 'text-dash-muted' : 'text-dash-danger'">
                        <template v-if="assignedSpecs.length === 0">{{ t('newProductDrawer.atLeastSpec') }}</template>
                        <template v-else-if="!specsValid">{{ t('newProductDrawer.atLeastOnePerSpec') }}</template>
                        <template v-else>
                          {{ t('newProductDrawer.willGenerate') }}
                          <span class="font-semibold text-dash-text">{{ combinationCount }}</span>
                          {{ combinationCount === 1 ? t('newProductDrawer.variant') : t('newProductDrawer.variants2') }}
                        </template>
                      </p>
                      <AButton size="sm" :disabled="!specsValid" @click="generateVariants">
                        <Zap :size="13" />
                        {{ priceRows.length ? t('newProductDrawer.regenerate') : t('newProductDrawer.generate') }}
                      </AButton>
                    </div>
                  </div>

                  <!-- Generated variants table -->
                  <div v-if="priceRows.length > 0" class="rounded-card border border-dash-border overflow-hidden">
                    <div class="overflow-x-auto">
                      <table class="w-full text-xs border-collapse">
                        <thead>
                          <tr class="border-b border-dash-border bg-dash-bg">
                            <th class="text-start py-2 px-3 text-[10px] font-semibold text-dash-faint uppercase tracking-wider">{{ t('newProductDrawer.variantCol') }}</th>
                            <th class="text-start py-2 px-3 text-[10px] font-semibold text-dash-faint uppercase tracking-wider">{{ t('newProductDrawer.cost') }}</th>
                            <th class="text-start py-2 px-3 text-[10px] font-semibold text-dash-faint uppercase tracking-wider">{{ t('newProductDrawer.price') }}</th>
                            <th class="text-start py-2 px-3 text-[10px] font-semibold text-dash-faint uppercase tracking-wider">{{ t('newProductDrawer.margin') }}</th>
                            <th class="text-start py-2 px-3 text-[10px] font-semibold text-dash-faint uppercase tracking-wider">{{ t('newProductDrawer.stock') }}</th>
                            <th class="text-start py-2 px-3 text-[10px] font-semibold text-dash-faint uppercase tracking-wider">{{ t('newProductDrawer.lowAt') }}</th>
                            <th class="py-2 px-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="row in priceRows" :key="row.id"
                            class="border-b border-dash-border/50 last:border-0"
                            :class="row.id === defaultRowId ? 'bg-dash-primary-lt/20' : ''">
                            <td class="py-2 px-3 font-semibold text-dash-text whitespace-nowrap">{{ variantLabel(row) }}</td>
                            <td class="py-1.5 px-2">
                              <input v-model="row.cost" type="number" min="0" step="0.01" placeholder="0"
                                class="w-20 h-7 px-2 rounded-btn border border-dash-border bg-white text-xs outline-none focus:border-dash-primary" />
                            </td>
                            <td class="py-1.5 px-2">
                              <input v-model="row.price" type="number" min="0" step="0.01" placeholder="0"
                                class="w-20 h-7 px-2 rounded-btn border border-dash-border bg-white text-xs outline-none focus:border-dash-primary" />
                            </td>
                            <td class="py-1.5 px-3 whitespace-nowrap">
                              <span v-if="rowMargin(row) !== null" class="text-xs font-medium"
                                    :class="rowMargin(row)! >= 0 ? 'text-emerald-600' : 'text-dash-danger'">
                                {{ rowMargin(row)!.toFixed(0) }}%
                              </span>
                              <span v-else class="text-dash-faint">—</span>
                            </td>
                            <td class="py-1.5 px-2">
                              <input v-model="row.quantity" type="number" min="0"
                                class="w-14 h-7 px-2 rounded-btn border border-dash-border bg-white text-xs outline-none focus:border-dash-primary" />
                            </td>
                            <td class="py-1.5 px-2">
                              <input v-model="row.lowStockThreshold" type="number" min="0"
                                class="w-14 h-7 px-2 rounded-btn border border-dash-border bg-white text-xs outline-none focus:border-dash-primary" />
                            </td>
                            <td class="py-1.5 px-3">
                              <span v-if="row.id === defaultRowId"
                                class="text-[10px] font-semibold uppercase tracking-wider text-dash-primary whitespace-nowrap">
                                {{ t('newProductDrawer.defaultMark') }}
                              </span>
                              <button v-else @click="defaultRowId = row.id"
                                class="text-[10px] font-medium uppercase tracking-wider text-dash-muted hover:text-dash-primary whitespace-nowrap transition-colors">
                                {{ t('newProductDrawer.setDefault') }}
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </template>
              </section>

              <!-- ── Media section ───────────────────────────── -->
              <section class="px-6 py-5 border-t border-dash-border">
                <p class="text-sm font-bold text-dash-text mb-3">{{ t('newProductDrawer.media') }}</p>
                <div class="grid grid-cols-4 gap-2">
                  <!-- Upload slot -->
                  <label class="aspect-square rounded-xl border-2 border-dashed border-dash-border bg-dash-bg flex flex-col items-center justify-center cursor-pointer hover:border-dash-primary transition-colors group">
                    <Upload :size="20" class="text-dash-muted group-hover:text-dash-primary transition-colors" />
                    <p class="text-[10px] font-medium text-dash-muted mt-1.5 group-hover:text-dash-primary transition-colors">{{ t('newProductDrawer.upload') }}</p>
                    <input type="file" accept="image/*" multiple class="sr-only" @change="handleFileSelect" />
                  </label>
                  <!-- Image previews -->
                  <template v-if="selectedFiles.length > 0">
                    <div v-for="(f, i) in selectedFiles.slice(0, 3)" :key="i"
                      class="aspect-square rounded-xl border border-dash-border bg-dash-bg relative overflow-hidden">
                      <img :src="f.preview" class="w-full h-full object-cover" />
                      <button @click="removeFile(i)"
                        class="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70">
                        <X :size="10" />
                      </button>
                    </div>
                  </template>
                  <!-- Empty slots -->
                  <template v-else>
                    <div v-for="i in 3" :key="i"
                      class="aspect-square rounded-xl border border-dashed border-dash-border bg-dash-bg flex items-center justify-center">
                      <span class="text-[10px] text-dash-faint">Slot {{ i }}</span>
                    </div>
                  </template>
                </div>
                <p v-if="selectedFiles.length > 3" class="text-2xs text-dash-muted mt-2">
                  +{{ selectedFiles.length - 3 }} more file{{ selectedFiles.length - 3 > 1 ? 's' : '' }} selected
                </p>
              </section>

              <!-- Error summary -->
              <div v-if="generalError" class="mx-6 mb-4 rounded-card border border-dash-danger/20 bg-dash-danger-lt px-4 py-3 flex items-start gap-2">
                <AlertCircle :size="14" class="text-dash-danger shrink-0 mt-0.5" />
                <p class="text-xs text-dash-danger">{{ generalError }}</p>
              </div>

            </div><!-- /scrollable body -->

            <!-- Sticky footer -->
            <footer class="shrink-0 px-6 py-3 border-t border-dash-border bg-dash-bg flex items-center justify-between gap-3">
              <p class="text-xs text-dash-muted">{{ t('newProductDrawer.required') }}</p>
              <div class="flex items-center gap-2">
                <button @click="close"
                  class="h-9 px-3.5 rounded-btn border border-dash-border bg-white text-xs font-medium text-dash-text hover:bg-dash-bg transition-colors">
                  {{ t('newProductDrawer.cancel') }}
                </button>
                <AButton size="sm" :loading="saving" @click="handlePublish">
                  {{ t('newProductDrawer.publish') }}
                </AButton>
              </div>
            </footer>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { X, ChevronUp, ChevronDown, Zap, Upload, AlertCircle } from 'lucide-vue-next'
import { useNewProductDrawer } from '../../composables/useNewProductDrawer'
import {
  apiGetBrands, apiGetCategories, apiGetSpecTypes,
  apiCreateProduct, apiSaveProductSpecs, apiGenerateVariants,
  apiBulkUpdateVariants, apiUploadImages,
} from '../../api/admin'
import type { AdminBrand, AdminCategory, SpecType } from '../../types'
import AInput    from '../ui/AInput.vue'
import ATextarea from '../ui/ATextarea.vue'
import ASelect   from '../ui/ASelect.vue'
import AButton   from '../ui/AButton.vue'

const { isOpen, close } = useNewProductDrawer()
const router = useRouter()
const { t } = useI18n()

// ── Static options ────────────────────────────────────────────────────────────
const productTypes = ['EDP', 'EDT', 'Parfum', 'EDC'] as const

const variantTypeOptions = [
  { value: 'single', labelKey: 'newProductDrawer.single', descKey: 'newProductDrawer.singleDesc' },
  { value: 'multi',  labelKey: 'newProductDrawer.multi',  descKey: 'newProductDrawer.multiDesc' },
]

const flags = [
  { key: 'isNew'        as const, labelKey: 'newProductDrawer.flagNew' },
  { key: 'isBestseller' as const, labelKey: 'newProductDrawer.flagBest' },
  { key: 'isOffer'      as const, labelKey: 'newProductDrawer.flagOffer' },
]

// ── Remote data ───────────────────────────────────────────────────────────────
const brands       = ref<AdminBrand[]>([])
const categories   = ref<AdminCategory[]>([])
const allSpecTypes = ref<SpecType[]>([])

const brandOptions    = computed(() => brands.value.map(b => ({ value: b.id, label: b.name })))
const categoryOptions = computed(() => categories.value.map(c => ({ value: String(c.id), label: c.label })))

// ── Form state ────────────────────────────────────────────────────────────────
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
})

const form   = ref(emptyForm())
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const generalError = ref('')

// Slug derived from English name
function toSlug(s: string): string {
  return (s || '').toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 48)
}
const slug = computed(() => toSlug(form.value.nameEn))
function syncSlug() { /* slug is computed, no-op kept for @input hook */ }

// ── Computed helpers ──────────────────────────────────────────────────────────
const selectedBrand    = computed(() => brands.value.find(b => b.id === form.value.brandId))
const selectedCategory = computed(() => categories.value.find(c => String(c.id) === form.value.categoryId))

const previewInitial = computed(() => {
  const n = form.value.nameEn || form.value.nameAr
  return n ? n[0].toUpperCase() : '✱'
})

const previewTileStyle = computed(() => {
  const bg  = selectedCategory.value?.bg || '#F2E8E5'
  return { background: bg, color: darken(bg) }
})

function darken(hex: string): string {
  // Produce a readable text colour from the bg hex
  try {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return lum > 0.6 ? '#3d2c1e' : '#fff'
  } catch { return '#3d2c1e' }
}

// ── Variant / pricing state ───────────────────────────────────────────────────
const productType = ref<'single' | 'multi'>('single')

interface AssignedSpec { spec_type_id: number; name: string; unit: string | null; values: string[] }
const assignedSpecs = ref<AssignedSpec[]>([])
const specToAdd     = ref<number | ''>('')
const valueInputs   = ref<Record<number, string>>({})

const availableSpecTypes = computed(() =>
  allSpecTypes.value.filter(s => !assignedSpecs.value.some(a => a.spec_type_id === s.id))
)

const combinationCount = computed(() =>
  assignedSpecs.value.reduce((acc, s) => acc * Math.max(s.values.length, 1), 1)
)

const specsValid = computed(() =>
  assignedSpecs.value.length > 0 && assignedSpecs.value.every(s => s.values.length > 0)
)

// Single pricing row
const singleRow = ref({ cost: '', price: '', quantity: 0, lowStockThreshold: 5 })

const singleProfitInfo = computed(() => {
  const c = parseFloat(singleRow.value.cost)
  const p = parseFloat(singleRow.value.price)
  if (!p || p <= 0) return null
  const profit = p - (c || 0)
  return { profit, margin: (profit / p) * 100 }
})

// Multi pricing rows
interface PriceRow {
  id: number
  specs: { name: string; unit: string | null; value: string }[]
  cost: string; price: string; quantity: number; lowStockThreshold: number
}
const priceRows    = ref<PriceRow[]>([])
const defaultRowId = ref<number | null>(null)

function cartesian<T>(arrays: T[][]): T[][] {
  if (!arrays.length) return [[]] as unknown as T[][]
  return arrays.reduce<T[][]>((acc, curr) => acc.flatMap(a => curr.map(c => [...a, c])), [[]])
}

function generateVariants() {
  if (!specsValid.value) return
  const combos = cartesian(assignedSpecs.value.map(s => s.values.map(v => ({ name: s.name, unit: s.unit, value: v }))))
  const rows: PriceRow[] = combos.map((specs, i) => ({
    id: Date.now() + i, specs, cost: '', price: '', quantity: 0, lowStockThreshold: 5,
  }))
  priceRows.value    = rows
  defaultRowId.value = rows[0]?.id ?? null
}

function variantLabel(row: PriceRow): string {
  return row.specs.map(s => `${s.value}${s.unit || ''}`).join(' / ') || 'Default'
}

function rowMargin(row: PriceRow): number | null {
  const c = parseFloat(row.cost), p = parseFloat(row.price)
  if (!p || p <= 0) return null
  return ((p - (c || 0)) / p) * 100
}

const previewPrice = computed(() => {
  if (productType.value === 'single') return singleRow.value.price || null
  return priceRows.value.find(r => r.id === defaultRowId.value)?.price || null
})

const previewSpecsLabel = computed(() => {
  if (productType.value === 'single') return 'Single variant'
  if (!priceRows.value.length) return t('newProductDrawer.noVariantsYet')
  const n = priceRows.value.length
  return `${n} ${n === 1 ? t('newProductDrawer.variant') : t('newProductDrawer.variants2')}`
})

// ── Spec helpers ──────────────────────────────────────────────────────────────
function addSpec() {
  const id = Number(specToAdd.value)
  const st = allSpecTypes.value.find(s => s.id === id)
  if (!st) return
  assignedSpecs.value.push({ spec_type_id: st.id, name: st.name, unit: st.unit, values: [] })
  specToAdd.value = ''
}

function removeSpec(idx: number) { assignedSpecs.value.splice(idx, 1) }

function moveSpec(idx: number, dir: -1 | 1) {
  const ni = idx + dir
  if (ni < 0 || ni >= assignedSpecs.value.length) return
  const arr = [...assignedSpecs.value];
  [arr[idx], arr[ni]] = [arr[ni], arr[idx]]
  assignedSpecs.value = arr
}

function addValue(spec: AssignedSpec) {
  const v = (valueInputs.value[spec.spec_type_id] || '').trim()
  if (!v || spec.values.includes(v)) return
  spec.values.push(v)
  valueInputs.value[spec.spec_type_id] = ''
}

function removeValue(spec: AssignedSpec, vi: number) { spec.values.splice(vi, 1) }

function setProductType(type: 'single' | 'multi') {
  productType.value = type
  if (type === 'single') { priceRows.value = []; assignedSpecs.value = [] }
}

// ── Media ─────────────────────────────────────────────────────────────────────
interface FileEntry { file: File; preview: string }
const selectedFiles = ref<FileEntry[]>([])

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  for (const file of Array.from(input.files)) {
    selectedFiles.value.push({ file, preview: URL.createObjectURL(file) })
  }
  input.value = ''
}

function removeFile(idx: number) {
  URL.revokeObjectURL(selectedFiles.value[idx].preview)
  selectedFiles.value.splice(idx, 1)
}

// ── Publish ───────────────────────────────────────────────────────────────────
async function handlePublish() {
  errors.value = {}
  generalError.value = ''

  if (!form.value.nameEn) { errors.value.nameEn = t('productCreate.englishNameRequired'); return }
  if (!form.value.nameAr) { errors.value.nameAr = t('productCreate.arabicNameRequired'); return }
  if (!form.value.type)   { errors.value.type    = t('productCreate.selectTypeRequired'); return }
  if (!form.value.brandId) { errors.value.brandId = t('productCreate.selectBrandRequired'); return }
  if (!form.value.categoryId) { errors.value.categoryId = t('productCreate.selectCategoryRequired'); return }

  saving.value = true
  try {
    // 1. Create product
    const { data: product } = await apiCreateProduct({
      name:         form.value.nameAr,
      name_en:      form.value.nameEn,
      slug:         slug.value,
      brand_id:     form.value.brandId,
      category_id:  form.value.categoryId,
      type:         form.value.type,
      description:  form.value.description || undefined,
      is_new:       form.value.isNew,
      is_bestseller: form.value.isBestseller,
      is_offer:     form.value.isOffer,
    })
    const productId: number = product.id

    // 2. Handle variants
    if (productType.value === 'multi' && specsValid.value) {
      await apiSaveProductSpecs(productId,
        assignedSpecs.value.map(s => ({ spec_type_id: s.spec_type_id, values: s.values }))
      )
      await apiGenerateVariants(productId, false)
      // Bulk update prices from priceRows — we don't have API variant IDs here
      // so we reload variants then update them
      const { data: variants } = await (await import('../../api/admin')).apiGetVariants(productId) as any
      if (priceRows.value.length > 0 && variants.length > 0) {
        await apiBulkUpdateVariants(productId, variants.map((v: any, i: number) => ({
          id:                  v.id,
          price:               Number(priceRows.value[i]?.price) || 1,
          cost_price:          priceRows.value[i]?.cost ? Number(priceRows.value[i].cost) : null,
          original_price:      null,
          quantity:            Number(priceRows.value[i]?.quantity) || 0,
          low_stock_threshold: Number(priceRows.value[i]?.lowStockThreshold) || 0,
        })))
      }
    } else {
      // Single: generate one default variant
      await apiGenerateVariants(productId, false)
      const { data: variants } = await (await import('../../api/admin')).apiGetVariants(productId) as any
      if (variants.length > 0) {
        await apiBulkUpdateVariants(productId, [{
          id:                  variants[0].id,
          price:               Number(singleRow.value.price) || 1,
          cost_price:          singleRow.value.cost ? Number(singleRow.value.cost) : null,
          original_price:      null,
          quantity:            Number(singleRow.value.quantity) || 0,
          low_stock_threshold: Number(singleRow.value.lowStockThreshold) || 0,
        }])
      }
    }

    // 3. Upload images (if any)
    if (selectedFiles.value.length > 0) {
      await apiUploadImages(productId, selectedFiles.value.map(f => f.file))
    }

    // 4. Done
    resetForm()
    close()
    router.push(`/products/${productId}`)
  } catch (e: unknown) {
    generalError.value = (e as any)?.response?.data?.message ?? t('newProductDrawer.saveFailed')
  } finally {
    saving.value = false
  }
}

function resetForm() {
  form.value         = emptyForm()
  errors.value       = {}
  generalError.value = ''
  productType.value  = 'single'
  singleRow.value    = { cost: '', price: '', quantity: 0, lowStockThreshold: 5 }
  assignedSpecs.value = []
  specToAdd.value    = ''
  priceRows.value    = []
  defaultRowId.value = null
  selectedFiles.value.forEach(f => URL.revokeObjectURL(f.preview))
  selectedFiles.value = []
}

// Body scroll lock + Esc
watch(isOpen, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', handler)
    // Store handler for cleanup — use a simple flag approach
    ;(window as any).__npDrawerEsc = handler
  } else {
    document.body.style.overflow = ''
    document.removeEventListener('keydown', (window as any).__npDrawerEsc)
  }
})

// Load reference data on mount
onMounted(async () => {
  try {
    const [b, c, st] = await Promise.all([apiGetBrands(), apiGetCategories(), apiGetSpecTypes()])
    brands.value       = b.data
    categories.value   = c.data
    allSpecTypes.value = st.data
  } catch { /* silently fail — dropdowns stay empty */ }
})
</script>

<style scoped>
.label-field {
  display: block;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-dash-faint, #9ca3af);
  margin-bottom: 6px;
}
</style>
```

- [x] **Step 2: Verify the component compiles (no import errors)**

```bash
cd aroma-admin && npx vue-tsc --noEmit 2>&1 | grep "NewProductDrawer" | head -20
```

Expected: no errors mentioning `NewProductDrawer.vue`.

- [x] **Step 3: Commit**

```bash
git add aroma-admin/src/components/product/NewProductDrawer.vue aroma-admin/src/composables/useNewProductDrawer.ts
git commit -m "feat: add NewProductDrawer component and composable"
```

---

## Task 4: Wire AppLayout to host the drawer

**Files:**
- Modify: `aroma-admin/src/components/layout/AppLayout.vue`

- [x] **Step 1: Add NewProductDrawer to AppLayout**

Replace the contents of `AppLayout.vue`:

```vue
<template>
  <div class="flex h-screen overflow-hidden bg-dash-bg">
    <Sidebar />
    <div class="flex flex-1 flex-col overflow-hidden">
      <Topbar />
      <main class="flex-1 overflow-y-auto p-6">
        <div class="animate-fade-up">
          <RouterView />
        </div>
      </main>
    </div>
    <NewProductDrawer />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import Sidebar          from './Sidebar.vue'
import Topbar           from './Topbar.vue'
import NewProductDrawer from '../product/NewProductDrawer.vue'
</script>
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/components/layout/AppLayout.vue
git commit -m "feat: mount NewProductDrawer in AppLayout"
```

---

## Task 5: Wire Topbar "New product" button

**Files:**
- Modify: `aroma-admin/src/components/layout/Topbar.vue`

- [x] **Step 1: Replace router.push with composable**

Find the line in `Topbar.vue` that reads:
```typescript
@click="router.push('/products/new')"
```

Change it to call the composable instead. Add the import at the top of the `<script setup>`:

```typescript
import { useNewProductDrawer } from '../../composables/useNewProductDrawer'
const { open: openNewProductDrawer } = useNewProductDrawer()
```

Then replace the click handler on the "New product" button (currently at line ~225):

```html
@click="openNewProductDrawer"
```

Also remove the `router.push('/products/new')` call (and the `useRouter` import if it's no longer used for anything else — check first with `grep -n "router\." Topbar.vue`).

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/components/layout/Topbar.vue
git commit -m "feat: wire topbar New product button to NewProductDrawer"
```

---

## Task 6: Wire ProductsView "New product" links

**Files:**
- Modify: `aroma-admin/src/views/ProductsView.vue`

- [x] **Step 1: Replace RouterLinks with button**

In `ProductsView.vue`, there are three `<RouterLink to="/products/new">` occurrences (lines ~79, ~197, ~255). Replace all three with buttons that open the drawer.

Add the import at the top of `<script setup>`:

```typescript
import { useNewProductDrawer } from '../composables/useNewProductDrawer'
const { open: openNewProductDrawer } = useNewProductDrawer()
```

Replace each occurrence of:
```html
<RouterLink to="/products/new">
  <!-- button content -->
</RouterLink>
```

With:
```html
<button type="button" @click="openNewProductDrawer">
  <!-- same button content as before -->
</button>
```

Keep the button's existing classes and inner content exactly the same — only the wrapper element and click handler change.

- [x] **Step 2: Remove unused RouterLink import** (only if `RouterLink` is no longer used for any other links in the file — check first):

```bash
grep -c "RouterLink" aroma-admin/src/views/ProductsView.vue
```

If count is 3 (only the three we just replaced), also remove `RouterLink` from the `vue-router` import line. If other RouterLinks remain (e.g., for product detail rows), leave it.

- [x] **Step 3: Commit**

```bash
git add aroma-admin/src/views/ProductsView.vue
git commit -m "feat: replace New product RouterLinks with drawer trigger in ProductsView"
```

---

## Self-Review

**Spec coverage check:**
- [x] Right-side drawer (720px, slides from right) — yes, in `NewProductDrawer.vue`
- [x] Live preview tile — yes
- [x] Basics: name EN/AR, slug preview, type pills, brand, category, description, flags — yes
- [x] Variants: single/multi radio, single pricing + profit, multi specs + generate + table — yes
- [x] Media: upload slot + file previews — yes
- [x] Footer: Cancel / Publish — yes
- [x] Esc to close — yes (via watch on `isOpen`)
- [x] Body scroll lock — yes
- [x] API flow: create → specs → generate → bulk update → upload → redirect — yes
- [x] i18n: EN + AR — yes
- [x] Topbar button wired — yes
- [x] ProductsView buttons wired — yes

**Gaps:**
- The `apiGetVariants` import in the publish handler uses a dynamic import. To avoid this, simply add `apiGetVariants` to the static imports at the top of `NewProductDrawer.vue`.

**Fix**: In the `<script setup>` imports section, add `apiGetVariants` to the existing import line:

```typescript
import {
  apiGetBrands, apiGetCategories, apiGetSpecTypes,
  apiCreateProduct, apiSaveProductSpecs, apiGenerateVariants,
  apiBulkUpdateVariants, apiUploadImages, apiGetVariants,
} from '../../api/admin'
```

And in `handlePublish`, replace both dynamic import occurrences:
```typescript
const { data: variants } = await (await import('../../api/admin')).apiGetVariants(productId) as any
```
with:
```typescript
const { data: variants } = await apiGetVariants(productId)
```

This fix should be applied in Task 3 before committing.
