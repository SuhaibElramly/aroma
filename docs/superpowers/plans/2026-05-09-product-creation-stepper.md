# Product Creation Stepper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the admin product creation modal + separate variants page with a single 3-step stepper page (Basic Info → Images → Variants), add per-variant image galleries, and update the storefront to show variant images when available.

**Architecture:** `ProductStepperView.vue` is the route-level shell that manages `currentStep`, `productId`, and `mode: 'create' | 'edit'`. It composes three step components (`StepBasicInfo`, `StepImages`, `StepVariants`) and a sticky header with step indicators. The old `ProductCreateView.vue`, `ProductVariantsView.vue`, and the create/edit modal in `ProductsView.vue` are all deleted.

**Tech Stack:** Vue 3 (Composition API, `<script setup>`), Vue Router 4, vue-i18n, Tailwind CSS, Lucide icons, Axios-based API client. Storefront: Next.js 14 App Router, React, TanStack Query.

---

## File Map

**Create:**
- `aroma-admin/src/views/ProductStepperView.vue` — stepper shell: header, step routing, shared state
- `aroma-admin/src/components/product/StepBasicInfo.vue` — step 1 fields & save
- `aroma-admin/src/components/product/StepImages.vue` — step 2 image upload (product-level)
- `aroma-admin/src/components/product/StepVariants.vue` — step 3 variant wizard + pricing table
- `aroma-admin/src/components/product/VariantImagePanel.vue` — inline per-variant image upload

**Modify:**
- `aroma-admin/src/api/admin.ts` — add `apiGetProduct`, 3 variant-image endpoints
- `aroma-admin/src/types/index.ts` — add `images?: ProductImage[]` to `ProductVariant`
- `aroma-admin/src/router/index.ts` — add `/products/:id/edit`, redirect `/products/:id/variants`
- `aroma-admin/src/views/ProductsView.vue` — remove modal, update action buttons
- `aroma-admin/src/locales/en.ts` — add stepper + variant-image i18n keys
- `aroma-admin/src/locales/ar.ts` — add same keys in Arabic
- `aroma/src/types/index.ts` — add `images?: { id: number; url: string }[]` to `StorefrontVariant`
- `aroma/src/features/product/ProductPageClient.tsx` — variant image display logic

**Delete (after stepper is wired up in Task 7):**
- `aroma-admin/src/views/ProductCreateView.vue`
- `aroma-admin/src/views/ProductVariantsView.vue`

---

## Task 1: API, Types & i18n foundations

**Files:**
- Modify: `aroma-admin/src/api/admin.ts`
- Modify: `aroma-admin/src/types/index.ts`
- Modify: `aroma/src/types/index.ts`
- Modify: `aroma-admin/src/locales/en.ts`
- Modify: `aroma-admin/src/locales/ar.ts`

- [x] **Step 1: Add `images` field to `ProductVariant` in admin types**

In `aroma-admin/src/types/index.ts`, update `ProductVariant`:

```ts
export interface ProductVariant {
  id:                 number
  productId:          number
  price:              string
  originalPrice:      string | null
  quantity:           number
  lowStockThreshold:  number
  stock:              StockStatus
  isDefault:          boolean
  specs:              VariantSpec[]
  images?:            ProductImage[]
}
```

- [x] **Step 2: Add `images` field to `StorefrontVariant` in storefront types**

In `aroma/src/types/index.ts`, update `StorefrontVariant`:

```ts
export interface StorefrontVariant {
  id: number
  size: string
  price: number
  originalPrice: number | null
  stock: StockStatus
  isDefault: boolean
  images?: { id: number; url: string }[]
}
```

- [x] **Step 3: Add `apiGetProduct` and variant-image functions to `aroma-admin/src/api/admin.ts`**

Add after `apiDeleteProduct`:

```ts
export const apiGetProduct = (id: number) =>
  client.get<AdminProduct>(`/admin/products/${id}`)
```

Add at the end of the products-images section (after `apiDeleteImage`):

```ts
// ── Variant Images ────────────────────────────────────────────────────
export const apiGetVariantImages = (productId: number, variantId: number) =>
  client.get<ProductImage[]>(`/admin/products/${productId}/variants/${variantId}/images`)

export const apiUploadVariantImages = (productId: number, variantId: number, files: File[]) => {
  const form = new FormData()
  files.forEach(f => form.append('images[]', f))
  return client.post<ProductImage[]>(`/admin/products/${productId}/variants/${variantId}/images`, form)
}

export const apiDeleteVariantImage = (productId: number, variantId: number, imageId: number) =>
  client.delete(`/admin/products/${productId}/variants/${variantId}/images/${imageId}`)
```

- [x] **Step 4: Add stepper and variant-image i18n keys to `aroma-admin/src/locales/en.ts`**

Add a new `stepper` section after `productCreate`. Find the line `productVariants: {` and insert before it:

```ts
  stepper: {
    newProduct:      'New Product',
    editProduct:     'Edit Product',
    stepBasicInfo:   'Basic Info',
    stepImages:      'Images',
    stepVariants:    'Variants',
    inProgress:      'In progress',
    locked:          'Locked',
    done:            'Done',
    clickToEdit:     'Click to edit',
    nextImages:      'Next: Images →',
    nextVariants:    'Next: Variants →',
    back:            '← Back',
    saveChanges:     'Save changes',
    imagesRequired:  'At least one product image is required',
    variantImages:   'Images',
    noVariantImages: 'None',
    addVariantImages: '+ Add',
    variantImagesTitle: 'Variant Images',
    variantImagesHint:  'Optional — only if this variant looks different from the product images.',
    uploadingVariantImages: 'Uploading…',
  },
```

- [x] **Step 5: Add same keys in Arabic to `aroma-admin/src/locales/ar.ts`**

Find the equivalent location in `ar.ts` (after `productCreate` block, before `productVariants`) and insert:

```ts
  stepper: {
    newProduct:      'منتج جديد',
    editProduct:     'تعديل المنتج',
    stepBasicInfo:   'المعلومات الأساسية',
    stepImages:      'الصور',
    stepVariants:    'الأنواع',
    inProgress:      'جارٍ',
    locked:          'مقفل',
    done:            'تم',
    clickToEdit:     'انقر للتعديل',
    nextImages:      'التالي: الصور ←',
    nextVariants:    'التالي: الأنواع ←',
    back:            '→ رجوع',
    saveChanges:     'حفظ التغييرات',
    imagesRequired:  'يجب إضافة صورة واحدة على الأقل',
    variantImages:   'الصور',
    noVariantImages: 'لا يوجد',
    addVariantImages: '+ إضافة',
    variantImagesTitle: 'صور النوع',
    variantImagesHint:  'اختياري — فقط إذا كان هذا النوع يختلف بصرياً عن الصور الرئيسية.',
    uploadingVariantImages: 'جارٍ الرفع…',
  },
```

- [x] **Step 6: Commit**

```bash
git add aroma-admin/src/api/admin.ts aroma-admin/src/types/index.ts \
        aroma/src/types/index.ts \
        aroma-admin/src/locales/en.ts aroma-admin/src/locales/ar.ts
git commit -m "feat: add variant image API, types and i18n foundations for product stepper"
```

---

## Task 2: VariantImagePanel.vue

Inline upload panel that sits below a variant row when expanded. Uploads and deletes immediately.

**Files:**
- Create: `aroma-admin/src/components/product/VariantImagePanel.vue`

- [x] **Step 1: Create the component**

```vue
<!-- aroma-admin/src/components/product/VariantImagePanel.vue -->
<template>
  <div class="mt-2 px-2 pb-3 border-t border-dash-border/50">
    <p class="text-2xs font-semibold text-dash-muted uppercase tracking-wider mt-2 mb-2">
      {{ t('stepper.variantImagesTitle') }}
    </p>
    <p class="text-2xs text-dash-muted mb-3">{{ t('stepper.variantImagesHint') }}</p>

    <!-- Image grid -->
    <div v-if="localImages.length" class="flex flex-wrap gap-2 mb-3">
      <div
        v-for="img in localImages"
        :key="img.id"
        class="relative group w-14 h-14 rounded-tag overflow-hidden border border-dash-border bg-dash-bg"
      >
        <img :src="img.url" class="h-full w-full object-cover" />
        <button
          type="button"
          @click="handleDelete(img)"
          class="absolute inset-0 flex items-center justify-center bg-dash-text/50 text-white
                 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X :size="12" />
        </button>
      </div>
    </div>

    <!-- Upload button -->
    <label class="inline-flex items-center gap-1.5 cursor-pointer rounded-btn border border-dashed
                  border-dash-border px-3 py-1.5 text-xs text-dash-muted hover:border-dash-primary
                  hover:text-dash-primary transition-all duration-150">
      <span v-if="uploading" class="inline-block h-3 w-3 animate-spin rounded-full
                                    border-[1.5px] border-current border-t-transparent" />
      <ImagePlus v-else :size="13" />
      {{ uploading ? t('stepper.uploadingVariantImages') : t('stepper.addVariantImages') }}
      <input
        type="file"
        accept="image/*"
        multiple
        class="sr-only"
        :disabled="uploading"
        @change="handleUpload"
      />
    </label>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { X, ImagePlus } from 'lucide-vue-next'
import { apiGetVariantImages, apiUploadVariantImages, apiDeleteVariantImage } from '../../api/admin'
import type { ProductImage } from '../../types'

const props = defineProps<{
  productId: number
  variantId: number
}>()

const emit = defineEmits<{
  'update:imageCount': [count: number]
}>()

const { t } = useI18n()
const localImages = ref<ProductImage[]>([])
const uploading   = ref(false)

async function load() {
  try {
    const { data } = await apiGetVariantImages(props.productId, props.variantId)
    localImages.value = data
    emit('update:imageCount', data.length)
  } catch { /* silent */ }
}

async function handleUpload(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  if (!files.length) return
  ;(e.target as HTMLInputElement).value = ''
  uploading.value = true
  try {
    const { data } = await apiUploadVariantImages(props.productId, props.variantId, files)
    localImages.value = data
    emit('update:imageCount', data.length)
  } catch { /* silent */ } finally {
    uploading.value = false
  }
}

async function handleDelete(img: ProductImage) {
  try {
    await apiDeleteVariantImage(props.productId, props.variantId, img.id)
    localImages.value = localImages.value.filter(i => i.id !== img.id)
    emit('update:imageCount', localImages.value.length)
  } catch { /* silent */ }
}

watch(() => props.variantId, load, { immediate: true })
</script>
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/components/product/VariantImagePanel.vue
git commit -m "feat: add VariantImagePanel component for per-variant image upload"
```

---

## Task 3: StepBasicInfo.vue

Step 1 of the stepper. On create it calls `apiCreateProduct`; on edit it calls `apiUpdateProduct`.

**Files:**
- Create: `aroma-admin/src/components/product/StepBasicInfo.vue`

- [x] **Step 1: Create the component**

```vue
<!-- aroma-admin/src/components/product/StepBasicInfo.vue -->
<template>
  <div class="space-y-4">
    <!-- Names + slug -->
    <section class="bg-dash-surface rounded-card shadow-card p-5">
      <h2 class="text-xs font-semibold text-dash-text mb-4">{{ t('productCreate.basicInfo') }}</h2>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <AInput
              v-model="form.name"
              :label="t('productCreate.arabicName')"
              :error="errors.name"
              dir="rtl"
              placeholder="أدخل اسم المنتج"
            />
            <p class="mt-1.5 text-2xs text-dash-muted">{{ t('productCreate.arabicNameHint') }}</p>
          </div>
          <div>
            <AInput
              v-model="form.name_en"
              :label="t('productCreate.englishName')"
              placeholder="e.g. Oud Royale"
              @input="syncSlug"
            />
            <p class="mt-1.5 text-2xs text-dash-muted">{{ t('productCreate.englishNameHint') }}</p>
          </div>
        </div>
        <!-- Slug preview -->
        <div
          v-if="form.slug"
          class="flex items-center gap-2 rounded-btn bg-dash-bg border border-dash-border px-3 py-2"
        >
          <Link2 :size="12" class="text-dash-faint shrink-0" />
          <span class="text-2xs text-dash-muted">aromashop.ly/products/</span>
          <span class="text-2xs font-medium text-dash-text font-mono">{{ form.slug }}</span>
          <span class="ml-auto text-2xs text-dash-faint">{{ t('productCreate.slugAutoGenerated') }}</span>
        </div>
        <div
          v-else
          class="flex items-center gap-2 rounded-btn bg-dash-bg border border-dashed border-dash-border px-3 py-2"
        >
          <Link2 :size="12" class="text-dash-faint shrink-0" />
          <span class="text-2xs text-dash-faint">{{ t('productCreate.slugHint') }}</span>
        </div>
      </div>
    </section>

    <!-- Description -->
    <section class="bg-dash-surface rounded-card shadow-card p-5">
      <h2 class="text-xs font-semibold text-dash-text mb-4">{{ t('productCreate.description') }}</h2>
      <ATextarea v-model="form.description" :placeholder="t('productCreate.descriptionHint')" rows="4" />
    </section>

    <!-- Two-column sidebar layout -->
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_272px] gap-4">
      <div class="space-y-4">
        <!-- Status flags -->
        <section class="bg-dash-surface rounded-card shadow-card p-5">
          <h2 class="text-xs font-semibold text-dash-text mb-3">{{ t('productCreate.status') }}</h2>
          <div class="space-y-1">
            <label
              v-for="flag in flags"
              :key="flag.key"
              class="flex items-center gap-3 px-3 py-2.5 rounded-btn cursor-pointer
                     hover:bg-dash-bg transition-colors duration-150 group"
            >
              <div
                class="w-4 h-4 rounded border-[1.5px] flex items-center justify-center shrink-0 transition-all duration-150"
                :class="form[flag.key]
                  ? 'bg-dash-secondary border-dash-secondary'
                  : 'border-dash-border group-hover:border-dash-muted'"
              >
                <Check v-if="form[flag.key]" :size="10" class="text-white" stroke-width="2.5" />
              </div>
              <input type="checkbox" v-model="form[flag.key]" class="sr-only" />
              <div>
                <p class="text-xs font-medium text-dash-text">{{ t(flag.labelKey) }}</p>
                <p class="text-2xs text-dash-muted">{{ t(flag.hintKey) }}</p>
              </div>
            </label>
          </div>
        </section>
      </div>

      <div class="space-y-4">
        <!-- Organize -->
        <section class="bg-dash-surface rounded-card shadow-card p-5">
          <h2 class="text-xs font-semibold text-dash-text mb-4">{{ t('productCreate.organize') }}</h2>
          <div class="space-y-3">
            <ASelect v-model="form.brand_id"    :label="t('productCreate.brandLabel')"    :options="brandOptions"    :placeholder="t('productCreate.chooseBrand')"    :error="errors.brand_id" />
            <ASelect v-model="form.category_id" :label="t('productCreate.categoryLabel')" :options="categoryOptions" :placeholder="t('productCreate.chooseCategory')" :error="errors.category_id" />
            <ASelect v-model="form.type"         :label="t('products.typeLabel')"           :options="typeOptions"     :placeholder="t('productCreate.chooseType')"     :error="errors.type" />
          </div>
        </section>

        <!-- Card color -->
        <section class="bg-dash-surface rounded-card shadow-card p-5">
          <h2 class="text-xs font-semibold text-dash-text mb-4">{{ t('productCreate.cardColor') }}</h2>
          <div class="space-y-3">
            <div>
              <p class="text-2xs text-dash-muted mb-1.5">{{ t('productCreate.colorBackground') }}</p>
              <div class="flex items-center gap-2">
                <div class="relative w-8 h-8 rounded-btn overflow-hidden border border-dash-border shrink-0">
                  <input type="color" v-model="form.placeholder_bg" class="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
                  <div class="w-full h-full" :style="{ backgroundColor: form.placeholder_bg }" />
                </div>
                <input type="text" v-model="form.placeholder_bg" maxlength="7"
                  class="flex-1 min-w-0 rounded-btn border border-dash-border bg-dash-bg px-2.5 py-1.5
                         text-xs font-mono text-dash-text focus:outline-none focus:border-dash-primary" />
              </div>
            </div>
            <div>
              <p class="text-2xs text-dash-muted mb-1.5">{{ t('productCreate.colorAccent') }}</p>
              <div class="flex items-center gap-2">
                <div class="relative w-8 h-8 rounded-btn overflow-hidden border border-dash-border shrink-0">
                  <input type="color" v-model="form.placeholder_dot" class="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
                  <div class="w-full h-full" :style="{ backgroundColor: form.placeholder_dot }" />
                </div>
                <input type="text" v-model="form.placeholder_dot" maxlength="7"
                  class="flex-1 min-w-0 rounded-btn border border-dash-border bg-dash-bg px-2.5 py-1.5
                         text-xs font-mono text-dash-text focus:outline-none focus:border-dash-primary" />
              </div>
            </div>
            <div class="rounded-btn h-10 flex items-center justify-center gap-2"
                 :style="{ backgroundColor: form.placeholder_bg }">
              <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: form.placeholder_dot }" />
              <span class="text-2xs font-medium" :style="{ color: form.placeholder_dot }">{{ t('productCreate.colorPreview') }}</span>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Error summary -->
    <div v-if="errors.general" class="rounded-card border border-dash-danger/20 bg-dash-danger-lt px-4 py-3 flex items-start gap-2">
      <AlertCircle :size="14" class="text-dash-danger shrink-0 mt-0.5" />
      <p class="text-xs text-dash-danger">{{ errors.general }}</p>
    </div>

    <!-- Nav -->
    <div class="flex justify-end pt-2">
      <AButton size="sm" :loading="saving" @click="handleNext">
        {{ t('stepper.nextImages') }}
      </AButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Link2, Check, AlertCircle } from 'lucide-vue-next'
import { apiGetBrands, apiGetCategories, apiCreateProduct, apiUpdateProduct } from '../../api/admin'
import type { AdminBrand, AdminCategory, AdminProduct } from '../../types'
import AInput    from '../ui/AInput.vue'
import ATextarea from '../ui/ATextarea.vue'
import ASelect   from '../ui/ASelect.vue'
import AButton   from '../ui/AButton.vue'

const props = defineProps<{
  productId: number | null
  initialData?: AdminProduct | null
}>()

const emit = defineEmits<{
  saved: [productId: number]
}>()

const { t } = useI18n()

const brands = ref<AdminBrand[]>([])
const cats   = ref<AdminCategory[]>([])
const saving = ref(false)
const errors = ref<Record<string, string>>({})

const typeOptions     = ['EDP', 'EDT', 'Parfum', 'EDC'].map(v => ({ value: v, label: v }))
const brandOptions    = computed(() => brands.value.map(b => ({ value: String(b.id), label: b.name })))
const categoryOptions = computed(() => cats.value.map(c => ({ value: String(c.id), label: c.label })))

const flags = [
  { key: 'is_new'        as const, labelKey: 'productCreate.newArrivalLabel', hintKey: 'productCreate.newArrivalHint' },
  { key: 'is_bestseller' as const, labelKey: 'productCreate.bestsellerLabel', hintKey: 'productCreate.bestsellerHint' },
  { key: 'is_offer'      as const, labelKey: 'productCreate.onOfferLabel',    hintKey: 'productCreate.onOfferHint' },
]

const emptyForm = () => ({
  name:            '',
  name_en:         '',
  slug:            '',
  brand_id:        '',
  category_id:     '',
  type:            '',
  description:     '',
  is_new:          false as boolean,
  is_bestseller:   false as boolean,
  is_offer:        false as boolean,
  placeholder_bg:  '#F2E8E5',
  placeholder_dot: '#C9A0A0',
})

const form = ref(emptyForm())

function toSlug(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function syncSlug() {
  form.value.slug = toSlug(form.value.name_en)
}

async function handleNext() {
  errors.value = {}
  if (!form.value.name)        { errors.value.name        = t('productCreate.arabicNameRequired');    return }
  if (!form.value.slug)        { errors.value.name_en     = t('productCreate.englishNameRequired');   return }
  if (!form.value.brand_id)    { errors.value.brand_id    = t('productCreate.selectBrandRequired');   return }
  if (!form.value.category_id) { errors.value.category_id = t('productCreate.selectCategoryRequired'); return }
  if (!form.value.type)        { errors.value.type        = t('productCreate.selectTypeRequired');     return }

  saving.value = true
  try {
    const payload = {
      name:            form.value.name,
      name_en:         form.value.name_en     || undefined,
      slug:            form.value.slug,
      brand_id:        form.value.brand_id,
      category_id:     form.value.category_id,
      type:            form.value.type,
      description:     form.value.description || undefined,
      placeholder_bg:  form.value.placeholder_bg,
      placeholder_dot: form.value.placeholder_dot,
      is_new:          form.value.is_new,
      is_bestseller:   form.value.is_bestseller,
      is_offer:        form.value.is_offer,
    }
    if (props.productId) {
      await apiUpdateProduct(props.productId, payload)
      emit('saved', props.productId)
    } else {
      const { data } = await apiCreateProduct(payload)
      emit('saved', data.id)
    }
  } catch (e: unknown) {
    errors.value.general = (e as any)?.response?.data?.message ?? t('common.saveFailed')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const [b, c] = await Promise.all([apiGetBrands(), apiGetCategories()])
    brands.value = b.data
    cats.value   = c.data
  } catch { /* dropdowns stay empty */ }

  if (props.initialData) {
    const p = props.initialData
    form.value = {
      name:            p.name,
      name_en:         p.nameEn ?? '',
      slug:            p.slug,
      brand_id:        p.brandId,
      category_id:     p.categoryId,
      type:            p.type,
      description:     '',
      is_new:          p.isNew,
      is_bestseller:   p.isBestseller,
      is_offer:        p.isOffer,
      placeholder_bg:  p.placeholderBg  || '#F2E8E5',
      placeholder_dot: p.placeholderDot || '#C9A0A0',
    }
  }
})
</script>
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/components/product/StepBasicInfo.vue
git commit -m "feat: add StepBasicInfo component (stepper step 1)"
```

---

## Task 4: StepImages.vue

Step 2 of the stepper. Required: at least one image before the user can proceed.

**Files:**
- Create: `aroma-admin/src/components/product/StepImages.vue`

- [x] **Step 1: Create the component**

```vue
<!-- aroma-admin/src/components/product/StepImages.vue -->
<template>
  <div class="space-y-4">
    <section class="bg-dash-surface rounded-card shadow-card p-5">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h2 class="text-xs font-semibold text-dash-text">{{ t('productCreate.images') }}</h2>
          <p class="text-2xs text-dash-muted mt-0.5">{{ t('productCreate.imagesHint') }}</p>
        </div>
        <label
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-medium
                 bg-dash-surface border border-dash-border text-dash-muted
                 hover:bg-dash-bg hover:text-dash-text transition-all duration-150 cursor-pointer"
        >
          <ImagePlus :size="13" />
          {{ t('productCreate.addImages') }}
          <input type="file" accept="image/*" multiple class="sr-only" @change="handleFileInput" />
        </label>
      </div>

      <!-- Drop zone (empty state) -->
      <div
        v-if="committed.length === 0 && pending.length === 0"
        class="relative rounded-card border-2 border-dashed border-dash-border bg-dash-bg
               flex flex-col items-center justify-center gap-2 py-10 px-6 text-center transition-all"
        :class="dragging ? 'border-dash-primary bg-dash-primary-lt/40' : ''"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="handleDrop"
      >
        <div class="w-10 h-10 rounded-full bg-dash-border flex items-center justify-center">
          <ImagePlus :size="18" class="text-dash-muted" />
        </div>
        <div>
          <p class="text-xs font-medium text-dash-text">{{ t('productCreate.dropImages') }}</p>
          <p class="text-2xs text-dash-muted mt-0.5">{{ t('productCreate.dropImagesHint') }}</p>
        </div>
      </div>

      <!-- Image grid -->
      <div
        v-else
        class="rounded-card border-2 border-dashed border-dash-border bg-dash-bg p-3 transition-all"
        :class="dragging ? 'border-dash-primary bg-dash-primary-lt/40' : ''"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="handleDrop"
      >
        <div class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
          <!-- Already-uploaded images (edit mode) -->
          <div
            v-for="img in committed"
            :key="`c-${img.id}`"
            class="relative group aspect-square rounded-tag overflow-hidden bg-dash-border cursor-pointer border-2 transition-all"
            :class="img.isThumbnail ? 'border-dash-primary' : 'border-transparent hover:border-dash-primary/40'"
            @click="setThumbnail(img)"
          >
            <img :src="img.url" class="h-full w-full object-cover" />
            <div v-if="img.isThumbnail"
              class="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium
                     bg-dash-primary/80 text-white backdrop-blur-sm leading-none">
              {{ t('productCreate.cover') }}
            </div>
            <button type="button" @click.stop="deleteCommitted(img)"
              class="absolute top-1 right-1 w-5 h-5 rounded-full bg-dash-text/60 text-white
                     flex items-center justify-center opacity-0 group-hover:opacity-100
                     transition-opacity hover:bg-dash-danger">
              <X :size="10" />
            </button>
          </div>

          <!-- Pending (not yet uploaded) images -->
          <div
            v-for="(img, idx) in pending"
            :key="`p-${idx}`"
            class="relative group aspect-square rounded-tag overflow-hidden bg-dash-border border-2 border-transparent"
          >
            <img :src="img.preview" class="h-full w-full object-cover" />
            <div v-if="committed.length === 0 && idx === 0"
              class="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium
                     bg-dash-text/70 text-white backdrop-blur-sm leading-none">
              {{ t('productCreate.cover') }}
            </div>
            <button type="button" @click="removePending(idx)"
              class="absolute top-1 right-1 w-5 h-5 rounded-full bg-dash-text/60 text-white
                     flex items-center justify-center opacity-0 group-hover:opacity-100
                     transition-opacity hover:bg-dash-danger">
              <X :size="10" />
            </button>
          </div>
        </div>
        <p class="text-2xs text-dash-faint mt-2 text-center">
          {{ committed.length + pending.length }} image{{ committed.length + pending.length !== 1 ? 's' : '' }}
          {{ pending.length > 0 ? `· ${pending.length} pending upload` : '' }}
        </p>
      </div>

      <!-- Required error -->
      <p v-if="showRequired" class="mt-2 text-2xs text-dash-danger">{{ t('stepper.imagesRequired') }}</p>
    </section>

    <!-- Nav -->
    <div class="flex items-center justify-between pt-2">
      <AButton size="sm" variant="secondary" @click="emit('back')">{{ t('stepper.back') }}</AButton>
      <AButton size="sm" :loading="uploading" @click="handleNext">{{ t('stepper.nextVariants') }}</AButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { X, ImagePlus } from 'lucide-vue-next'
import { apiGetImages, apiUploadImages, apiSetThumbnail, apiDeleteImage } from '../../api/admin'
import type { ProductImage } from '../../types'
import AButton from '../ui/AButton.vue'

const props = defineProps<{ productId: number }>()
const emit  = defineEmits<{ next: []; back: [] }>()

const { t } = useI18n()

interface Pending { file: File; preview: string }
const committed    = ref<ProductImage[]>([])
const pending      = ref<Pending[]>([])
const uploading    = ref(false)
const dragging     = ref(false)
const showRequired = ref(false)

function addFiles(files: File[]) {
  const images    = files.filter(f => f.type.startsWith('image/'))
  const remaining = 10 - committed.value.length - pending.value.length
  images.slice(0, remaining).forEach(f =>
    pending.value.push({ file: f, preview: URL.createObjectURL(f) })
  )
}

function handleFileInput(e: Event) {
  addFiles(Array.from((e.target as HTMLInputElement).files ?? []))
  ;(e.target as HTMLInputElement).value = ''
}

function handleDrop(e: DragEvent) {
  dragging.value = false
  addFiles(Array.from(e.dataTransfer?.files ?? []))
}

function removePending(idx: number) {
  URL.revokeObjectURL(pending.value[idx].preview)
  pending.value.splice(idx, 1)
}

async function setThumbnail(img: ProductImage) {
  if (img.isThumbnail) return
  try {
    await apiSetThumbnail(props.productId, img.id)
    committed.value.forEach(i => { i.isThumbnail = i.id === img.id })
  } catch { /* silent */ }
}

async function deleteCommitted(img: ProductImage) {
  try {
    await apiDeleteImage(props.productId, img.id)
    committed.value = committed.value.filter(i => i.id !== img.id)
  } catch { /* silent */ }
}

async function handleNext() {
  if (committed.value.length === 0 && pending.value.length === 0) {
    showRequired.value = true
    return
  }
  showRequired.value = false
  if (pending.value.length > 0) {
    uploading.value = true
    try {
      const { data } = await apiUploadImages(props.productId, pending.value.map(p => p.file))
      pending.value.forEach(p => URL.revokeObjectURL(p.preview))
      pending.value = []
      committed.value = [...committed.value, ...data]
    } catch { /* silent */ } finally {
      uploading.value = false
    }
  }
  emit('next')
}

onMounted(async () => {
  try {
    const { data } = await apiGetImages(props.productId)
    committed.value = data
  } catch { /* silent */ }
})

onBeforeUnmount(() => {
  pending.value.forEach(p => URL.revokeObjectURL(p.preview))
})
</script>
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/components/product/StepImages.vue
git commit -m "feat: add StepImages component (stepper step 2)"
```

---

## Task 5: StepVariants.vue

Step 3 of the stepper. Ports the wizard + editing logic from `ProductVariantsView.vue`, removes the images section (now in step 2), and adds the variant-images column.

**Files:**
- Create: `aroma-admin/src/components/product/StepVariants.vue`

- [x] **Step 1: Create the component**

This is a large component. It combines the wizard logic (no-variants mode) and edit mode from `ProductVariantsView.vue`, minus the product-images section, plus the Images column using `VariantImagePanel`.

```vue
<!-- aroma-admin/src/components/product/StepVariants.vue -->
<template>
  <div class="space-y-4">

    <!-- Page-level error -->
    <div v-if="pageError" class="rounded-card bg-dash-danger-lt border border-dash-danger/20 px-4 py-3 text-xs text-dash-danger">
      {{ pageError }}
    </div>

    <!-- ══════════════════════════════
         WIZARD MODE — no variants yet
    ══════════════════════════════ -->
    <template v-if="!hasVariants">

      <!-- Step indicators (inner wizard) -->
      <div class="flex items-stretch gap-2">
        <div v-for="s in [1,2,3]" :key="s"
          :class="['flex items-center gap-2 px-4 py-2.5 rounded-card border flex-1 transition-all', wizardStepClass(s)]">
          <div :class="['w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0', wizardNumClass(s)]">
            <Check v-if="currentWizardStep > s" :size="10" />
            <span v-else>{{ s }}</span>
          </div>
          <div class="text-xs font-medium leading-tight">
            <span v-if="s === 1 && currentWizardStep > 1">
              <span v-if="productType === 'single'" class="text-emerald-400">{{ t('productVariants.singlePriceDone') }}</span>
              <span v-else class="text-emerald-400">{{ t('productVariants.multiVariantsDone') }}</span>
            </span>
            <span v-else-if="s === 2 && currentWizardStep > 2" class="text-emerald-400">{{ combinationCount }} variant{{ combinationCount !== 1 ? 's' : '' }} generated</span>
            <span v-else-if="s === 1">{{ t('productVariants.productType') }}</span>
            <span v-else-if="s === 2">{{ t('productVariants.step2') }}</span>
            <span v-else>{{ t('productVariants.setPrices') }}</span>
          </div>
        </div>
      </div>

      <!-- Wizard Step 1: single vs multi -->
      <div v-if="currentWizardStep === 1" class="bg-dash-surface rounded-card shadow-card p-5">
        <h2 class="text-sm font-semibold text-dash-text mb-1">{{ t('productVariants.step1Title') }}</h2>
        <p class="text-2xs text-dash-muted mb-4">{{ t('productVariants.howDoesItWork') }}</p>
        <div class="space-y-3">
          <label
            v-for="opt in [{ val: 'single', labelKey: 'productVariants.singlePrice', descKey: 'productVariants.singlePriceDesc' }, { val: 'multi', labelKey: 'productVariants.multipleVariants', descKey: 'productVariants.multipleVariantsDesc' }]"
            :key="opt.val"
            class="flex items-start gap-3 p-3 rounded-card border cursor-pointer transition-all"
            :class="productType === opt.val ? 'border-dash-primary bg-dash-primary-lt/30' : 'border-dash-border hover:border-dash-muted'"
          >
            <div class="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
              :class="productType === opt.val ? 'border-dash-primary bg-dash-primary' : 'border-dash-border'">
              <div v-if="productType === opt.val" class="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <input type="radio" v-model="productType" :value="opt.val" class="sr-only" />
            <div>
              <p class="text-xs font-semibold text-dash-text">{{ t(opt.labelKey) }}</p>
              <p class="text-2xs text-dash-muted mt-0.5">{{ t(opt.descKey) }}</p>
            </div>
          </label>
        </div>
        <div class="flex justify-end mt-5">
          <AButton size="sm" :disabled="!productType" :loading="generatingSingle" @click="handleWizardStep1">
            {{ t('productVariants.continueBtn') }}
          </AButton>
        </div>
      </div>

      <!-- Wizard Step 2: define specs (multi only) -->
      <div v-if="currentWizardStep === 2" class="bg-dash-surface rounded-card shadow-card p-5 space-y-5">
        <div>
          <h2 class="text-sm font-semibold text-dash-text">{{ t('productVariants.step2Title') }}</h2>
          <p class="text-2xs text-dash-muted mt-0.5">{{ t('productVariants.step2Desc') }}</p>
        </div>
        <div>
          <p class="text-xs font-medium text-dash-text mb-2">{{ t('productVariants.specTypes') }}</p>
          <div class="flex gap-2">
            <select v-model="specToAdd"
              class="flex-1 rounded-btn border border-dash-border bg-dash-bg px-3 py-1.5 text-xs text-dash-text focus:outline-none focus:border-dash-primary">
              <option value="">{{ t('productVariants.addSpecType') }}</option>
              <option v-for="s in availableSpecTypes" :key="s.id" :value="s.id">
                {{ s.name }}{{ s.unit ? ` (${s.unit})` : '' }}
              </option>
            </select>
            <AButton size="sm" variant="secondary" :disabled="!specToAdd" @click="addSpec">{{ t('common.add') }}</AButton>
          </div>
          <div v-if="assignedSpecs.length" class="mt-3 space-y-2">
            <div v-for="(spec, idx) in assignedSpecs" :key="spec.spec_type_id"
              class="px-3 py-2.5 rounded-btn border border-dash-border bg-dash-bg">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-semibold text-dash-text flex-1">
                  {{ spec.name }}{{ spec.unit ? ` (${spec.unit})` : '' }}
                </span>
                <button :disabled="idx === 0" class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30" @click="moveSpec(idx, -1)"><ChevronUp :size="12" /></button>
                <button :disabled="idx === assignedSpecs.length - 1" class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30" @click="moveSpec(idx, 1)"><ChevronDown :size="12" /></button>
                <button class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-danger" @click="removeSpec(idx)"><X :size="12" /></button>
              </div>
              <div class="flex flex-wrap gap-1.5 mb-2">
                <span v-for="(val, vi) in spec.values" :key="vi"
                  class="inline-flex items-center gap-1 rounded-full border border-dash-border bg-dash-surface px-2.5 py-1 text-xs font-medium text-dash-text">
                  {{ val }}{{ spec.unit ?? '' }}
                  <button @click="removeValue(spec, vi)" class="text-dash-faint hover:text-dash-danger ml-0.5"><X :size="10" /></button>
                </span>
              </div>
              <div class="flex gap-2">
                <input v-model="valueInputs[spec.spec_type_id]" type="text"
                  :placeholder="`Add ${spec.name} value…`"
                  :class="['flex-1 rounded-btn border bg-dash-bg px-3 py-1.5 text-xs text-dash-text focus:outline-none transition-colors',
                    spec.values.length === 0 ? 'border-dash-danger/60 focus:border-dash-danger' : 'border-dash-border focus:border-dash-primary']"
                  @keydown.enter.prevent="addValue(spec)" />
                <AButton size="sm" variant="secondary" @click="addValue(spec)">{{ t('common.add') }}</AButton>
              </div>
              <p v-if="spec.values.length === 0" class="mt-1 text-2xs text-dash-danger">{{ t('productVariants.atLeastOneValue') }}</p>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-between pt-1 border-t border-dash-border">
          <p v-if="assignedSpecs.length && specsValid" class="text-xs text-dash-muted">
            {{ t('productVariants.willGenerate') }} <span class="font-semibold text-dash-text">{{ combinationCount }} variant{{ combinationCount !== 1 ? 's' : '' }}</span>
          </p>
          <p v-else-if="assignedSpecs.length" class="text-xs text-dash-danger">{{ t('productVariants.addAtLeastOneValuePerSpec') }}</p>
          <p v-else class="text-xs text-dash-muted">{{ t('productVariants.addAtLeastOneSpec') }}</p>
          <AButton size="sm" :loading="generating" :disabled="!specsValid || !assignedSpecs.length" @click="handleGenerate()">
            <Zap :size="13" /> {{ t('productVariants.generateVariants') }}
          </AButton>
        </div>
      </div>

      <!-- Wizard Step 3: prices -->
      <div v-if="currentWizardStep === 3" class="bg-dash-surface rounded-card shadow-card p-5">
        <h2 class="text-sm font-semibold text-dash-text mb-1">
          {{ productType === 'single' ? t('productVariants.step3TitleSingle') : t('productVariants.step3TitleMulti') }}
        </h2>
        <p class="text-2xs text-dash-muted mb-4">
          {{ productType === 'single' ? t('productVariants.step3DescSingle') : t('productVariants.step3DescMulti') }}
        </p>
        <!-- Single -->
        <div v-if="productType === 'single'" class="grid grid-cols-2 gap-3 mb-4">
          <AInput v-model="priceRows[0].price"             :label="t('productVariants.priceLyd')" type="number" step="0.01" :error="priceRowErrors[0]?.price" />
          <AInput v-model="priceRows[0].originalPrice"     :label="t('productVariants.originalPrice') + ' (LYD)'" type="number" step="0.01" />
          <AInput v-model="priceRows[0].quantity"          :label="t('productVariants.qty')" type="number" min="0" />
          <AInput v-model="priceRows[0].lowStockThreshold" :label="t('productVariants.lowAt')" type="number" min="0" />
        </div>
        <!-- Multi table -->
        <div v-else class="overflow-x-auto mb-4">
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr class="border-b border-dash-border">
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.variantCol') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.priceLyd') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.originalPrice') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.qty') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.lowAt') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('stepper.variantImages') }}</th>
                <th class="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(row, ri) in priceRows" :key="row.id">
                <tr class="border-b border-dash-border/50" :class="expandedVariantImages === row.id ? '' : 'last:border-0'">
                  <td class="py-2 px-2 font-semibold text-dash-text whitespace-nowrap">{{ variantLabel(row.id) }}</td>
                  <td class="py-1.5 px-1">
                    <input v-model="row.price" type="number" step="0.01" min="0"
                      :class="['w-24 px-2 py-1 rounded-btn border text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary',
                        priceRowErrors[ri]?.price ? 'border-dash-danger' : 'border-dash-border']" />
                    <p v-if="priceRowErrors[ri]?.price" class="text-2xs text-dash-danger mt-0.5">{{ t('common.fieldRequired') }}</p>
                  </td>
                  <td class="py-1.5 px-1">
                    <input v-model="row.originalPrice" type="number" step="0.01" min="0" placeholder="—"
                      class="w-24 px-2 py-1 rounded-btn border border-dash-border/50 text-xs bg-dash-bg text-dash-faint focus:outline-none focus:border-dash-border" />
                  </td>
                  <td class="py-1.5 px-1">
                    <input v-model="row.quantity" type="number" min="0"
                      class="w-16 px-2 py-1 rounded-btn border border-dash-border text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary" />
                  </td>
                  <td class="py-1.5 px-1">
                    <input v-model="row.lowStockThreshold" type="number" min="0"
                      class="w-16 px-2 py-1 rounded-btn border border-dash-border text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary" />
                  </td>
                  <td class="py-1.5 px-2">
                    <button class="text-2xs text-dash-muted hover:text-dash-primary transition-colors whitespace-nowrap"
                      @click="expandedVariantImages = expandedVariantImages === row.id ? null : row.id">
                      <span v-if="variantImageCounts[row.id]">{{ variantImageCounts[row.id] }} img</span>
                      <span v-else>{{ t('stepper.addVariantImages') }}</span>
                    </button>
                  </td>
                  <td class="py-1.5 px-2">
                    <button v-if="!variants.find(v => v.id === row.id)?.isDefault"
                      class="text-2xs text-dash-muted hover:text-dash-primary transition-colors whitespace-nowrap"
                      @click="setDefault(row.id)">{{ t('productVariants.setDefault') }}</button>
                    <span v-else class="text-2xs font-semibold text-dash-primary whitespace-nowrap">{{ t('productVariants.defaultMark') }}</span>
                  </td>
                </tr>
                <!-- Expanded variant image panel -->
                <tr v-if="expandedVariantImages === row.id" :key="`img-${row.id}`" class="border-b border-dash-border/50">
                  <td colspan="7" class="px-2 pb-1">
                    <VariantImagePanel
                      :productId="productId"
                      :variantId="row.id"
                      @update:imageCount="(n) => variantImageCounts[row.id] = n"
                    />
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <!-- Single variant image panel -->
        <div v-if="productType === 'single' && priceRows.length > 0" class="mb-4">
          <VariantImagePanel
            :productId="productId"
            :variantId="priceRows[0].id"
            @update:imageCount="(n) => variantImageCounts[priceRows[0].id] = n"
          />
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-dash-border">
          <div class="flex items-center gap-2 text-2xs text-dash-muted">
            <span>{{ t('productVariants.overallStock') }}</span>
            <ABadge :status="overallStockPreview" />
          </div>
          <AButton size="sm" :loading="savingPrices" @click="savePrices">
            {{ productType === 'multi' ? t('productVariants.savePricesBtn') : t('productVariants.saveSingleBtn') }}
          </AButton>
        </div>
      </div>
    </template>

    <!-- ══════════════════════════════
         EDITING MODE — variants exist
    ══════════════════════════════ -->
    <template v-else>
      <!-- Specs summary (multi-variant) -->
      <div v-if="variants.length > 1" class="bg-dash-surface rounded-card shadow-card">
        <div class="flex items-center justify-between px-5 py-3">
          <div>
            <h2 class="text-sm font-semibold text-dash-text">{{ t('productVariants.specsSection') }}
              <span class="font-normal text-dash-muted text-xs">· {{ variants.length }} combinations</span>
            </h2>
          </div>
          <AButton size="sm" variant="secondary" @click="editSpecsExpanded = !editSpecsExpanded">
            {{ editSpecsExpanded ? t('productVariants.collapse') : t('productVariants.editSpecs') }}
          </AButton>
        </div>
        <div v-if="editSpecsExpanded" class="px-5 pb-5 space-y-5">
          <!-- same spec definition UI as wizard step 2 -->
          <div>
            <div class="flex gap-2">
              <select v-model="specToAdd"
                class="flex-1 rounded-btn border border-dash-border bg-dash-bg px-3 py-1.5 text-xs text-dash-text focus:outline-none focus:border-dash-primary">
                <option value="">{{ t('productVariants.addSpecType') }}</option>
                <option v-for="s in availableSpecTypes" :key="s.id" :value="s.id">
                  {{ s.name }}{{ s.unit ? ` (${s.unit})` : '' }}
                </option>
              </select>
              <AButton size="sm" variant="secondary" :disabled="!specToAdd" @click="addSpec">{{ t('common.add') }}</AButton>
            </div>
            <div v-if="assignedSpecs.length" class="mt-3 space-y-2">
              <div v-for="(spec, idx) in assignedSpecs" :key="spec.spec_type_id"
                class="px-3 py-2.5 rounded-btn border border-dash-border bg-dash-bg">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-xs font-semibold text-dash-text flex-1">{{ spec.name }}{{ spec.unit ? ` (${spec.unit})` : '' }}</span>
                  <button :disabled="idx === 0" class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30" @click="moveSpec(idx, -1)"><ChevronUp :size="12" /></button>
                  <button :disabled="idx === assignedSpecs.length - 1" class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30" @click="moveSpec(idx, 1)"><ChevronDown :size="12" /></button>
                  <button class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-danger" @click="removeSpec(idx)"><X :size="12" /></button>
                </div>
                <div class="flex flex-wrap gap-1.5 mb-2">
                  <span v-for="(val, vi) in spec.values" :key="vi"
                    class="inline-flex items-center gap-1 rounded-full border border-dash-border bg-dash-surface px-2.5 py-1 text-xs font-medium text-dash-text">
                    {{ val }}{{ spec.unit ?? '' }}
                    <button @click="removeValue(spec, vi)" class="text-dash-faint hover:text-dash-danger ml-0.5"><X :size="10" /></button>
                  </span>
                </div>
                <div class="flex gap-2">
                  <input v-model="valueInputs[spec.spec_type_id]" type="text"
                    :placeholder="`Add ${spec.name} value…`"
                    class="flex-1 rounded-btn border border-dash-border bg-dash-bg px-3 py-1.5 text-xs text-dash-text focus:outline-none focus:border-dash-primary"
                    @keydown.enter.prevent="addValue(spec)" />
                  <AButton size="sm" variant="secondary" @click="addValue(spec)">{{ t('common.add') }}</AButton>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between pt-3 mt-3 border-t border-dash-border">
              <p v-if="assignedSpecs.length && specsValid" class="text-xs text-dash-muted">
                {{ t('productVariants.willGenerate') }} <span class="font-semibold text-dash-text">{{ combinationCount }} variant{{ combinationCount !== 1 ? 's' : '' }}</span>
              </p>
              <p v-else class="text-xs text-dash-danger">{{ t('productVariants.addAtLeastOneValuePerSpec') }}</p>
              <AButton size="sm" variant="danger" :loading="generating" :disabled="!specsValid || !assignedSpecs.length" @click="handleGenerate(true)">
                <Zap :size="13" /> {{ t('productVariants.regenerateVariants') }}
              </AButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Pricing table (edit mode) -->
      <div class="bg-dash-surface rounded-card shadow-card p-5">
        <h2 class="text-sm font-semibold text-dash-text mb-4">{{ t('productVariants.pricesAndStock') }}</h2>
        <!-- Single edit -->
        <div v-if="variants.length === 1" class="grid grid-cols-2 gap-3 mb-4">
          <AInput v-model="priceRows[0].price"             :label="t('productVariants.priceLyd')" type="number" step="0.01" :error="priceRowErrors[0]?.price" />
          <AInput v-model="priceRows[0].originalPrice"     :label="t('productVariants.originalPrice') + ' (LYD)'" type="number" step="0.01" />
          <AInput v-model="priceRows[0].quantity"          :label="t('productVariants.qty')" type="number" min="0" />
          <AInput v-model="priceRows[0].lowStockThreshold" :label="t('productVariants.lowAt')" type="number" min="0" />
        </div>
        <div v-if="variants.length === 1" class="mb-4">
          <VariantImagePanel :productId="productId" :variantId="priceRows[0].id"
            @update:imageCount="(n) => variantImageCounts[priceRows[0].id] = n" />
        </div>
        <!-- Multi edit table -->
        <div v-else class="overflow-x-auto mb-4">
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr class="border-b border-dash-border">
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.variantCol') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.priceLyd') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.originalPrice') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.qty') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.lowAt') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('stepper.variantImages') }}</th>
                <th class="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(row, ri) in priceRows" :key="row.id">
                <tr class="border-b border-dash-border/50">
                  <td class="py-2 px-2 font-semibold text-dash-text whitespace-nowrap">{{ variantLabel(row.id) }}</td>
                  <td class="py-1.5 px-1">
                    <input v-model="row.price" type="number" step="0.01" min="0"
                      :class="['w-24 px-2 py-1 rounded-btn border text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary',
                        priceRowErrors[ri]?.price ? 'border-dash-danger' : 'border-dash-border']" />
                  </td>
                  <td class="py-1.5 px-1">
                    <input v-model="row.originalPrice" type="number" step="0.01" min="0" placeholder="—"
                      class="w-24 px-2 py-1 rounded-btn border border-dash-border/50 text-xs bg-dash-bg text-dash-faint focus:outline-none" />
                  </td>
                  <td class="py-1.5 px-1">
                    <input v-model="row.quantity" type="number" min="0"
                      class="w-16 px-2 py-1 rounded-btn border border-dash-border text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary" />
                  </td>
                  <td class="py-1.5 px-1">
                    <input v-model="row.lowStockThreshold" type="number" min="0"
                      class="w-16 px-2 py-1 rounded-btn border border-dash-border text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary" />
                  </td>
                  <td class="py-1.5 px-2">
                    <button class="text-2xs text-dash-muted hover:text-dash-primary transition-colors"
                      @click="expandedVariantImages = expandedVariantImages === row.id ? null : row.id">
                      <span v-if="variantImageCounts[row.id]">{{ variantImageCounts[row.id] }} img</span>
                      <span v-else>{{ t('stepper.addVariantImages') }}</span>
                    </button>
                  </td>
                  <td class="py-1.5 px-2">
                    <button v-if="!variants.find(v => v.id === row.id)?.isDefault"
                      class="text-2xs text-dash-muted hover:text-dash-primary transition-colors whitespace-nowrap"
                      @click="setDefault(row.id)">{{ t('productVariants.setDefault') }}</button>
                    <span v-else class="text-2xs font-semibold text-dash-primary whitespace-nowrap">{{ t('productVariants.defaultMark') }}</span>
                  </td>
                </tr>
                <tr v-if="expandedVariantImages === row.id" :key="`img-${row.id}`" class="border-b border-dash-border/50">
                  <td colspan="7" class="px-2 pb-1">
                    <VariantImagePanel :productId="productId" :variantId="row.id"
                      @update:imageCount="(n) => variantImageCounts[row.id] = n" />
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-dash-border">
          <div class="flex items-center gap-2 text-2xs text-dash-muted">
            <span>{{ t('productVariants.overallStock') }}</span>
            <ABadge :status="overallStockPreview" />
          </div>
          <AButton size="sm" :loading="savingPrices" @click="savePrices">{{ t('productVariants.savePricesBtn') }}</AButton>
        </div>
      </div>

      <!-- Regenerate confirm dialog -->
      <AConfirmDialog
        :open="showRegenerateConfirm"
        :title="t('productVariants.regenerateConfirmTitle')"
        :message="t('productVariants.regenerateConfirmMessage', variants.length)"
        :loading="generating"
        @confirm="doGenerate(true)"
        @cancel="showRegenerateConfirm = false"
      />
    </template>

    <!-- Bottom nav -->
    <div class="flex items-center justify-between pt-2">
      <AButton size="sm" variant="secondary" @click="emit('back')">{{ t('stepper.back') }}</AButton>
      <AButton size="sm" @click="emit('done')">{{ t('stepper.saveChanges') }}</AButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, X, ChevronUp, ChevronDown, Zap } from 'lucide-vue-next'
import {
  apiGetVariants, apiBulkUpdateVariants, apiSetDefaultVariant,
  apiGetProductSpecs, apiSaveProductSpecs, apiGenerateVariants, apiGetSpecTypes,
} from '../../api/admin'
import type { ProductVariant, SpecType, ProductSpec } from '../../types'
import AButton        from '../ui/AButton.vue'
import AInput         from '../ui/AInput.vue'
import ABadge         from '../ui/ABadge.vue'
import AConfirmDialog from '../ui/AConfirmDialog.vue'
import VariantImagePanel from './VariantImagePanel.vue'

const props = defineProps<{ productId: number }>()
const emit  = defineEmits<{ back: []; done: [] }>()

const { t } = useI18n()

// ── Variants ─────────────────────────────────────────────────────────────────
const variants    = ref<ProductVariant[]>([])
const pageError   = ref('')
const hasVariants = computed(() => variants.value.length > 0)

// ── Wizard state ──────────────────────────────────────────────────────────────
const currentWizardStep  = ref(1)
const productType        = ref<'single' | 'multi' | ''>('')
const generatingSingle   = ref(false)

// ── Spec state ────────────────────────────────────────────────────────────────
interface AssignedSpec { spec_type_id: number; name: string; unit: string | null; values: string[] }
const allSpecTypes    = ref<SpecType[]>([])
const assignedSpecs   = ref<AssignedSpec[]>([])
const specToAdd       = ref<number | ''>('')
const valueInputs     = ref<Record<number, string>>({})
const generating      = ref(false)
const editSpecsExpanded      = ref(false)
const showRegenerateConfirm  = ref(false)

const availableSpecTypes = computed(() =>
  allSpecTypes.value.filter(s => !assignedSpecs.value.some(a => a.spec_type_id === s.id))
)

const combinationCount = computed(() =>
  assignedSpecs.value.reduce((acc, s) => acc * Math.max(s.values.length, 1), 1)
)

const specsValid = computed(() =>
  assignedSpecs.value.length > 0 && assignedSpecs.value.every(s => s.values.length > 0)
)

function addSpec() {
  const id = Number(specToAdd.value)
  const st = allSpecTypes.value.find(s => s.id === id)
  if (!st) return
  assignedSpecs.value.push({ spec_type_id: st.id, name: st.name, unit: st.unit, values: [] })
  specToAdd.value = ''
}

function removeSpec(idx: number) { assignedSpecs.value.splice(idx, 1) }

function moveSpec(idx: number, dir: -1 | 1) {
  const arr = assignedSpecs.value
  const ni = idx + dir
  if (ni < 0 || ni >= arr.length) return
  ;[arr[idx], arr[ni]] = [arr[ni], arr[idx]]
}

function addValue(spec: AssignedSpec) {
  const v = (valueInputs.value[spec.spec_type_id] ?? '').trim()
  if (!v || spec.values.includes(v)) return
  spec.values.push(v)
  valueInputs.value[spec.spec_type_id] = ''
}

function removeValue(spec: AssignedSpec, vi: number) { spec.values.splice(vi, 1) }

async function handleGenerate(force = false) {
  if (!force && hasVariants.value) { showRegenerateConfirm.value = true; return }
  await doGenerate(force)
}

async function doGenerate(force: boolean) {
  showRegenerateConfirm.value = false
  generating.value = true
  try {
    await apiSaveProductSpecs(props.productId,
      assignedSpecs.value.map(s => ({ spec_type_id: s.spec_type_id, values: s.values }))
    )
    const { data } = await apiGenerateVariants(props.productId, force)
    variants.value      = data
    currentWizardStep.value = 3
    initPriceRows(data)
  } catch { pageError.value = 'Failed to generate variants.' } finally {
    generating.value = false
  }
}

// ── Price rows ────────────────────────────────────────────────────────────────
interface PriceRow { id: number; price: string; originalPrice: string; quantity: string; lowStockThreshold: string }
const priceRows      = ref<PriceRow[]>([])
const priceRowErrors = ref<Record<number, { price?: string }>>({})
const savingPrices   = ref(false)

const expandedVariantImages  = ref<number | null>(null)
const variantImageCounts     = ref<Record<number, number>>({})

function initPriceRows(vs: ProductVariant[]) {
  priceRows.value = vs.map(v => ({
    id:               v.id,
    price:            v.price,
    originalPrice:    v.originalPrice ?? '',
    quantity:         String(v.quantity),
    lowStockThreshold: String(v.lowStockThreshold),
  }))
}

function variantLabel(id: number): string {
  const v = variants.value.find(v => v.id === id)
  if (!v) return String(id)
  return v.specs.map(s => `${s.value}${s.unit ?? ''}`).join(' / ') || 'Default'
}

const overallStockPreview = computed(() => {
  const total = priceRows.value.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
  const low   = priceRows.value.some(r => {
    const q = Number(r.quantity) || 0
    const t = Number(r.lowStockThreshold) || 0
    return q > 0 && q <= t
  })
  if (total === 0) return 'out_of_stock'
  if (low) return 'low_stock'
  return 'in_stock'
})

async function savePrices() {
  priceRowErrors.value = {}
  let valid = true
  priceRows.value.forEach((r, i) => {
    if (!r.price || Number(r.price) <= 0) { priceRowErrors.value[i] = { price: t('common.fieldRequired') }; valid = false }
  })
  if (!valid) return
  savingPrices.value = true
  try {
    await apiBulkUpdateVariants(props.productId, priceRows.value.map(r => ({
      id:                  r.id,
      price:               Number(r.price),
      original_price:      r.originalPrice ? Number(r.originalPrice) : null,
      quantity:            Number(r.quantity) || 0,
      low_stock_threshold: Number(r.lowStockThreshold) || 0,
    })))
    emit('done')
  } catch { pageError.value = 'Failed to save. Please try again.' } finally {
    savingPrices.value = false
  }
}

async function setDefault(variantId: number) {
  try {
    await apiSetDefaultVariant(props.productId, variantId)
    variants.value.forEach(v => { v.isDefault = v.id === variantId })
  } catch { /* silent */ }
}

// ── Wizard step 1 ─────────────────────────────────────────────────────────────
async function handleWizardStep1() {
  if (productType.value === 'single') {
    generatingSingle.value = true
    try {
      const { data } = await apiGenerateVariants(props.productId, false)
      variants.value = data
      initPriceRows(data)
      currentWizardStep.value = 3
    } catch { pageError.value = 'Failed to create variant.' } finally {
      generatingSingle.value = false
    }
  } else {
    currentWizardStep.value = 2
  }
}

function wizardStepClass(s: number) {
  if (currentWizardStep.value > s) return 'border-emerald-500/30 bg-emerald-500/5'
  if (currentWizardStep.value === s) return 'border-dash-primary/30 bg-dash-primary-lt/20'
  return 'border-dash-border opacity-50'
}

function wizardNumClass(s: number) {
  if (currentWizardStep.value > s) return 'bg-emerald-500 text-white'
  if (currentWizardStep.value === s) return 'bg-dash-primary text-white'
  return 'bg-dash-border text-dash-muted'
}

// ── Mount ──────────────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const [vs, st, ps] = await Promise.all([
      apiGetVariants(props.productId),
      apiGetSpecTypes(),
      apiGetProductSpecs(props.productId),
    ])
    variants.value    = vs.data
    allSpecTypes.value = st.data
    if (vs.data.length > 0) {
      initPriceRows(vs.data)
      // pre-populate assignedSpecs from existing specs
      assignedSpecs.value = ps.data.specs.map((sp: ProductSpec) => ({
        spec_type_id: sp.spec_type_id,
        name:         sp.name,
        unit:         sp.unit,
        values:       sp.values.map((v: { value: string }) => v.value),
      }))
    }
  } catch { pageError.value = 'Failed to load variants.' }
})
</script>
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/components/product/StepVariants.vue
git commit -m "feat: add StepVariants component (stepper step 3) with per-variant image panels"
```

---

## Task 6: ProductStepperView.vue

The route-level shell. Manages step state, loads product data in edit mode, composes the three step components.

**Files:**
- Create: `aroma-admin/src/views/ProductStepperView.vue`

- [x] **Step 1: Create the view**

```vue
<!-- aroma-admin/src/views/ProductStepperView.vue -->
<template>
  <div class="min-h-full animate-fade-up">

    <!-- Sticky header -->
    <div class="sticky top-0 z-10 bg-dash-bg border-b border-dash-border -mx-6 px-6 py-3 mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <RouterLink
          to="/products"
          class="flex items-center justify-center w-7 h-7 rounded-btn text-dash-muted hover:text-dash-text hover:bg-dash-surface border border-dash-border transition-all duration-150"
        >
          <ChevronLeft :size="14" />
        </RouterLink>
        <div>
          <p class="text-2xs text-dash-muted leading-none mb-0.5">{{ t('nav.products') }}</p>
          <h1 class="text-sm font-semibold text-dash-text leading-none">
            {{ mode === 'create' ? t('stepper.newProduct') : (productName || t('stepper.editProduct')) }}
          </h1>
        </div>
      </div>
      <!-- Edit mode: Done button in header -->
      <div v-if="mode === 'edit'" class="flex items-center gap-2">
        <RouterLink to="/products">
          <AButton variant="secondary" size="sm">{{ t('common.cancel') }}</AButton>
        </RouterLink>
      </div>
    </div>

    <!-- Loading state (edit mode initial load) -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <div class="h-6 w-6 animate-spin rounded-full border-2 border-dash-primary border-t-transparent" />
    </div>

    <template v-else>
      <!-- Step indicators -->
      <div class="flex items-center gap-0 mb-8 px-1">
        <template v-for="(step, idx) in steps" :key="step.key">
          <!-- Step -->
          <button
            type="button"
            class="flex items-center gap-2.5 flex-1 transition-opacity"
            :class="[
              canJumpTo(idx) ? 'cursor-pointer' : 'cursor-default',
              currentStep === idx ? 'opacity-100' : 'opacity-70 hover:opacity-90',
            ]"
            :disabled="!canJumpTo(idx)"
            @click="canJumpTo(idx) && (currentStep = idx)"
          >
            <!-- Circle -->
            <div
              class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all"
              :class="stepCircleClass(idx)"
            >
              <Check v-if="isComplete(idx)" :size="10" />
              <span v-else>{{ idx + 1 }}</span>
            </div>
            <div class="text-left">
              <div class="text-xs font-semibold" :class="currentStep === idx ? 'text-dash-text' : 'text-dash-muted'">
                {{ t(step.labelKey) }}
              </div>
              <div class="text-2xs" :class="stepSubLabel(idx) === t('stepper.inProgress') ? 'text-dash-primary' : 'text-dash-faint'">
                {{ stepSubLabel(idx) }}
              </div>
            </div>
          </button>
          <!-- Connector line -->
          <div
            v-if="idx < steps.length - 1"
            class="flex-1 h-px mx-2 transition-colors"
            :class="isComplete(idx) ? 'bg-emerald-500' : 'bg-dash-border'"
          />
        </template>
      </div>

      <!-- Step content -->
      <StepBasicInfo
        v-if="currentStep === 0"
        :productId="productId"
        :initialData="initialProduct"
        @saved="onBasicInfoSaved"
      />
      <StepImages
        v-else-if="currentStep === 1"
        :productId="productId!"
        @next="onImagesNext"
        @back="currentStep = 0"
      />
      <StepVariants
        v-else-if="currentStep === 2"
        :productId="productId!"
        @back="currentStep = 1"
        @done="handleDone"
      />
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, Check } from 'lucide-vue-next'
import { apiGetProduct } from '../api/admin'
import type { AdminProduct } from '../types'
import AButton       from '../components/ui/AButton.vue'
import StepBasicInfo from '../components/product/StepBasicInfo.vue'
import StepImages    from '../components/product/StepImages.vue'
import StepVariants  from '../components/product/StepVariants.vue'

const route  = useRoute()
const router = useRouter()
const { t }  = useI18n()

const mode           = computed<'create' | 'edit'>(() => route.name === 'product-edit' ? 'edit' : 'create')
const productId      = ref<number | null>(null)
const productName    = ref('')
const initialProduct = ref<AdminProduct | null>(null)
const loading        = ref(false)

// 0=BasicInfo  1=Images  2=Variants
const currentStep = ref(0)
// In create mode, tracks the highest step reached (determines which steps are unlocked)
const highestStep = ref(0)

const steps = [
  { key: 'basicInfo', labelKey: 'stepper.stepBasicInfo' },
  { key: 'images',    labelKey: 'stepper.stepImages' },
  { key: 'variants',  labelKey: 'stepper.stepVariants' },
]

function isComplete(idx: number): boolean {
  if (mode.value === 'edit') return idx < currentStep.value || idx <= highestStep.value
  return idx < highestStep.value
}

function canJumpTo(idx: number): boolean {
  if (mode.value === 'edit') return true
  return idx <= highestStep.value
}

function stepCircleClass(idx: number): string {
  if (isComplete(idx)) return 'bg-emerald-500 text-white'
  if (currentStep.value === idx) return 'bg-dash-primary text-white ring-2 ring-dash-primary/30'
  return 'bg-dash-border text-dash-muted'
}

function stepSubLabel(idx: number): string {
  if (isComplete(idx) && currentStep.value !== idx) return t('stepper.done')
  if (currentStep.value === idx) return t('stepper.inProgress')
  if (mode.value === 'create' && idx > highestStep.value) return t('stepper.locked')
  return t('stepper.clickToEdit')
}

function onBasicInfoSaved(id: number) {
  productId.value = id
  currentStep.value = 1
  if (highestStep.value < 1) highestStep.value = 1
}

function onImagesNext() {
  currentStep.value = 2
  if (highestStep.value < 2) highestStep.value = 2
}

function handleDone() {
  router.push('/products')
}

onMounted(async () => {
  if (mode.value === 'edit') {
    const id = Number(route.params.id)
    productId.value  = id
    highestStep.value = 2  // all steps accessible in edit mode
    loading.value    = true
    try {
      const { data } = await apiGetProduct(id)
      initialProduct.value = data
      productName.value    = data.name
    } catch { /* handle gracefully */ } finally {
      loading.value = false
    }
  }
})
</script>
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/views/ProductStepperView.vue
git commit -m "feat: add ProductStepperView — unified 3-step product stepper"
```

---

## Task 7: Router + ProductsView.vue

Wire the new view into the router and clean up `ProductsView.vue`.

**Files:**
- Modify: `aroma-admin/src/router/index.ts`
- Modify: `aroma-admin/src/views/ProductsView.vue`

- [x] **Step 1: Update `router/index.ts`**

Replace the `products/new` and `products/:id/variants` entries:

```ts
{ path: 'products/new',      name: 'product-create', component: () => import('../views/ProductStepperView.vue') },
{ path: 'products/:id/edit', name: 'product-edit',   component: () => import('../views/ProductStepperView.vue'), props: true },
{ path: 'products/:id/variants', redirect: (to) => ({ name: 'product-edit', params: { id: to.params.id } }) },
```

Remove the old entries:
```ts
// DELETE these two lines:
{ path: 'products/new',          name: 'product-create',   component: () => import('../views/ProductCreateView.vue') },
{ path: 'products/:id/variants', name: 'product-variants', component: () => import('../views/ProductVariantsView.vue'), props: true },
```

- [x] **Step 2: Clean up `ProductsView.vue` — remove modal and update buttons**

**2a.** In the `<template>`, replace the "Add Product" button (the `<AButton @click="openCreate">` near the top) with a RouterLink:

```html
<RouterLink to="/products/new">
  <AButton size="sm" class="shrink-0 self-end">
    <Plus :size="14" /> {{ t('products.addProduct') }}
  </AButton>
</RouterLink>
```

**2b.** In the `<template>`, find the "Variants" action button in the table's action slot and replace it with:

```html
<RouterLink :to="`/products/${(row as AdminProduct).id}/edit`">
  <AButton size="sm" variant="ghost">{{ t('products.editBtn') }}</AButton>
</RouterLink>
```

**2c.** Delete the entire `<!-- Create / Edit modal -->` block (the `<AModal>...</AModal>` block, lines ~69–184).

**2d.** In `<script setup>`, remove all modal-related state and functions:
- Remove: `modalOpen`, `editing`, `saving`, `formErrors`, `emptyForm`, `form`, `flags`, `typeOptions` (the non-filter one), `openCreate`, `openEdit`, `handleSave`
- Remove import: `AModal`, `ATextarea` (if no longer used), `apiCreateProduct` (already gone after modal removal), `apiUpdateProduct` (keep if still used for inline edits — but it's only used in `handleSave` which is removed, so remove it)
- Keep: `brandOptions`, `categoryOptions`, `typeFilterOptions`, pagination state, `confirmDelete`, `handleDelete`

**2e.** Add `'products.editBtn': 'Edit'` to `en.ts` and `'تعديل'` to `ar.ts` under the `products` section.

- [x] **Step 3: Verify in browser**

```bash
cd aroma-admin && npm run dev
```

1. Open `http://localhost:5173/products`
2. Click "Add Product" — should navigate to `/products/new` (stepper, step 1)
3. Fill in all required fields, click "Next: Images →" — should advance to step 2
4. Upload at least one image, click "Next: Variants →" — should advance to step 3
5. Choose single/multi, set prices, click Save — should return to `/products`
6. Click "Edit" on any product — should navigate to `/products/:id/edit` with all fields pre-populated and all steps clickable
7. Navigate directly to `/products/123/variants` — should redirect to `/products/123/edit`

- [x] **Step 4: Commit**

```bash
git add aroma-admin/src/router/index.ts aroma-admin/src/views/ProductsView.vue \
        aroma-admin/src/locales/en.ts aroma-admin/src/locales/ar.ts
git commit -m "feat: wire ProductStepperView into router, remove modal from ProductsView"
```

---

## Task 8: Delete old views

Only do this after Task 7 verification passes.

**Files:**
- Delete: `aroma-admin/src/views/ProductCreateView.vue`
- Delete: `aroma-admin/src/views/ProductVariantsView.vue`

- [x] **Step 1: Delete the files**

```bash
git rm aroma-admin/src/views/ProductCreateView.vue
git rm aroma-admin/src/views/ProductVariantsView.vue
```

- [x] **Step 2: Verify build still passes**

```bash
cd aroma-admin && npm run build
```

Expected: build completes with no errors. If TypeScript errors appear, fix them before committing.

- [x] **Step 3: Commit**

```bash
git commit -m "chore: remove ProductCreateView and ProductVariantsView (replaced by ProductStepperView)"
```

---

## Task 9: Storefront — variant image display

**Files:**
- Modify: `aroma/src/features/product/ProductPageClient.tsx`

- [x] **Step 1: Update `ProductPageClient.tsx` to use variant images when available**

Replace the gallery section (lines 53–156). The key changes are:

1. Derive `displayImages` from the active variant's images if it has any:

```tsx
const images       = product.images ?? []
const variantImgs  = activeVariant?.images ?? []
const displayImages = variantImgs.length > 0 ? variantImgs : images

// Reset activeImg to null whenever the active variant changes so the first
// image of the new set is shown automatically.
// (Add this inside the component, replacing the existing activeImg state lines)
const [activeImg, setActiveImg] = useState<string | null>(null)
const prevVariantId = useRef<number | undefined>(undefined)
if (activeVariant?.id !== prevVariantId.current) {
  prevVariantId.current = activeVariant?.id
  // Don't call setActiveImg here — this would cause a render loop.
  // Instead gate displayImg on whether activeImg belongs to the current set.
}

const displayImg = (activeImg && displayImages.some(i => i.url === activeImg))
  ? activeImg
  : displayImages[0]?.url ?? product.thumbnailUrl ?? null
```

2. Replace `images` with `displayImages` throughout the gallery section:

```tsx
{/* Main image */}
<div
  className="rounded-lg overflow-hidden mb-4 relative"
  style={{ height: 480, backgroundColor: product.placeholder.bg }}
>
  {displayImg ? (
    <Image
      src={displayImg}
      alt={product.nameEn || product.name}
      fill
      sizes="(max-width: 768px) 100vw, 480px"
      className="object-contain p-6"
      priority
    />
  ) : (
    <ProductPlaceholder product={product} height={480} />
  )}
</div>
{/* Thumbnails — only shown when displayImages has more than 1 */}
{displayImages.length > 1 && (
  <div className="flex gap-3">
    {displayImages.map(img => (
      <div
        key={img.id}
        onClick={() => setActiveImg(img.url)}
        className="flex-1 rounded overflow-hidden cursor-pointer relative"
        style={{
          height: 90,
          backgroundColor: product.placeholder.bg,
          border: displayImg === img.url
            ? '2px solid #1C1917'
            : '2px solid transparent',
        }}
      >
        <Image src={img.url} alt="" fill sizes="100px" className="object-contain p-1.5" />
      </div>
    ))}
  </div>
)}
{/* Fallback when no images at all */}
{displayImages.length === 0 && (
  <div className="flex gap-3">
    {[0, 1, 2].map(i => (
      <div key={i} className="flex-1 rounded overflow-hidden"
        style={{ border: i === 0 ? '2px solid #1C1917' : '2px solid transparent' }}>
        <ProductPlaceholder product={product} height={90} />
      </div>
    ))}
  </div>
)}
```

3. Add `useRef` to the React import:

```tsx
import { useState, useRef } from 'react'
```

- [x] **Step 2: Verify in browser**

```bash
cd aroma && npm run dev
```

1. Open a product page that has variants.
2. If a variant has images uploaded (via admin), selecting it should replace the gallery with variant images.
3. Switching to a variant without images should show the product gallery again.
4. Products with no variant images should behave exactly as before.

- [x] **Step 3: Commit**

```bash
git add aroma/src/features/product/ProductPageClient.tsx
git commit -m "feat: show variant images on storefront when selected variant has images"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered in task |
|---|---|
| Remove dialog + variants page, replace with stepper | Task 6, 7, 8 |
| 3 steps: Basic Info → Images → Variants | Tasks 3, 4, 5 |
| Create mode: linear step unlock | Task 6 (`highestStep` logic) |
| Edit mode: all steps clickable | Task 6 (`mode === 'edit'` sets `highestStep = 2`) |
| Image required at product level | Task 4 (`showRequired` validation) |
| Per-variant image gallery (optional) | Task 2, 5 |
| Storefront: show variant images when available, else fallback | Task 9 |
| `GET/POST/DELETE /admin/.../variants/:id/images` endpoints | Task 1 |
| `ProductVariant.images?` type | Task 1 |
| `/products/:id/variants` redirects to `/products/:id/edit` | Task 7 |
| Delete `ProductCreateView.vue` + `ProductVariantsView.vue` | Task 8 |

All spec requirements are covered.

**Placeholder scan:** No TBD or TODO blocks.

**Type consistency check:**
- `apiGetVariantImages` / `apiUploadVariantImages` / `apiDeleteVariantImage` — defined in Task 1, used in Task 2 (`VariantImagePanel`) ✓
- `apiGetProduct` — defined in Task 1, used in Task 6 (`ProductStepperView`) ✓
- `ProductImage` type — used in `VariantImagePanel` and `StepImages`, defined in `types/index.ts` ✓
- `emit('saved', productId)` in `StepBasicInfo` → `onBasicInfoSaved(id: number)` in `ProductStepperView` ✓
- `emit('done')` in `StepVariants` → `handleDone()` in `ProductStepperView` ✓
- `emit('next')` / `emit('back')` in `StepImages` → handlers in `ProductStepperView` ✓
