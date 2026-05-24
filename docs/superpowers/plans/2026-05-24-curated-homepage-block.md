# Curated Homepage Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a `curated` homepage block type that lets the admin hand-pick and order specific products via a searchable product picker in the admin panel.

**Architecture:** `curated` is a new member of the existing `HomepageBlockType` union. Its config stores `product_ids: number[]`. The backend fetches those products by ID (preserving order) through `HomeService`. The admin UI gets a `ProductPicker` component (search + drag-reorder list) wired into the existing `BlockEditor` drawer. The storefront renders it as a standard 3-column product grid.

**Tech Stack:** Laravel 11 (PHP), Vue 3 + TypeScript (admin), Next.js 14 + React (storefront), vuedraggable@next (already installed).

---

## File Map

**Modified:**
- `aroma-api/app/Http/Controllers/Api/Admin/AdminProductController.php` — add `ids` param support to `index()`
- `aroma-api/app/Services/HomeService.php` — add `curated` match arm + `curatedProducts()` method
- `aroma-api/app/Http/Controllers/Api/Admin/AdminHomepageController.php` — add `curated` to validation allowlist
- `aroma-api/tests/Feature/HomeTest.php` — add curated block test
- `aroma-admin/src/types/index.ts` — add `'curated'` to `HomepageBlockType`, add `product_ids?` to config
- `aroma-admin/src/api/admin.ts` — add `ids?` param to `apiGetProducts`
- `aroma-admin/src/components/homepage/BlockEditor.vue` — wire `ProductPicker` for curated type
- `aroma/src/types/index.ts` — add `'curated'` to `HomeBlock['type']`
- `aroma/src/features/home/HomeSection.tsx` — add `CuratedSection` + switch case

**Created:**
- `aroma-admin/src/components/homepage/ProductPicker.vue`

---

## Task 1: Backend — `ids` param + `curated` block hydration + validation

**Files:**
- Modify: `aroma-api/app/Http/Controllers/Api/Admin/AdminProductController.php`
- Modify: `aroma-api/app/Services/HomeService.php`
- Modify: `aroma-api/app/Http/Controllers/Api/Admin/AdminHomepageController.php`
- Test: `aroma-api/tests/Feature/HomeTest.php`

- [x] **Step 1: Write the failing test**

Add this test to `aroma-api/tests/Feature/HomeTest.php` (inside the class, after the existing tests):

```php
public function test_home_hydrates_curated_block_in_order(): void
{
    Setting::set('homepage_hero', $this->heroDefaults());

    $p1 = Product::factory()->create(['name' => 'Alpha']);
    $p2 = Product::factory()->create(['name' => 'Beta']);
    $p3 = Product::factory()->create(['name' => 'Gamma']);

    HomepageBlock::create([
        'type'     => 'curated',
        'position' => 1,
        'enabled'  => true,
        'config'   => ['label' => 'Pick', 'title' => 'Special', 'product_ids' => [$p3->id, $p1->id, $p2->id]],
    ]);

    $response = $this->getJson('/api/home');

    $response->assertOk()
        ->assertJsonCount(3, 'blocks.0.data.products')
        ->assertJsonPath('blocks.0.data.products.0.id', $p3->id)
        ->assertJsonPath('blocks.0.data.products.1.id', $p1->id)
        ->assertJsonPath('blocks.0.data.products.2.id', $p2->id);
}
```

- [x] **Step 2: Run to verify it fails**

```bash
cd aroma-api && php artisan test tests/Feature/HomeTest.php::test_home_hydrates_curated_block_in_order
```

Expected: FAIL — `curated` is not handled by HomeService yet.

- [x] **Step 3: Add `curated` to HomeService**

In `aroma-api/app/Services/HomeService.php`, add the match arm and method:

```php
// In hydrateBlock(), add before `default`:
'curated' => ['products' => $this->curatedProducts($config['product_ids'] ?? [])],
```

So the full `hydrateBlock()` becomes:

```php
private function hydrateBlock(HomepageBlock $block): array
{
    $config = $block->config ?? [];

    return match ($block->type) {
        'bestsellers'    => ['products' => $this->products(['is_bestseller' => true], $config['limit'] ?? 3)],
        'new_arrivals'   => ['products' => $this->products(['is_new' => true],         $config['limit'] ?? 4)],
        'offers'         => ['products' => $this->products(['is_offer' => true],       $config['limit'] ?? 3)],
        'categories'     => ['categories' => Category::withCount('products')->get()->toArray()],
        'featured_brand' => $this->hydrateFeaturedBrand($config),
        'curated'        => ['products' => $this->curatedProducts($config['product_ids'] ?? [])],
        default          => [],
    };
}
```

Add this new private method after the existing `hydrateFeaturedBrand()` method:

```php
private function curatedProducts(array $ids): array
{
    if (empty($ids)) return [];

    $byId = Product::whereIn('id', $ids)
        ->with(['brand', 'category', 'variants.specValues.specType', 'notes', 'tags', 'images'])
        ->get()
        ->keyBy('id');

    $ordered = collect($ids)
        ->map(fn ($id) => $byId->get($id))
        ->filter()
        ->values();

    return ProductResource::collection($ordered)->resolve();
}
```

- [x] **Step 4: Run test to verify it passes**

```bash
cd aroma-api && php artisan test tests/Feature/HomeTest.php::test_home_hydrates_curated_block_in_order
```

Expected: PASS.

- [x] **Step 5: Add `curated` to validation allowlist in AdminHomepageController**

In `aroma-api/app/Http/Controllers/Api/Admin/AdminHomepageController.php`, change line 43:

```php
// Before:
'type' => 'required|in:bestsellers,new_arrivals,offers,categories,featured_brand',

// After:
'type' => 'required|in:bestsellers,new_arrivals,offers,categories,featured_brand,curated',
```

- [x] **Step 6: Add `ids` param support to AdminProductController**

In `aroma-api/app/Http/Controllers/Api/Admin/AdminProductController.php`, add this block after the `price_min/price_max` block and before `$products = $query->paginate(20);`:

```php
if ($request->filled('ids')) {
    $ids = array_filter(array_map('intval', explode(',', $request->ids)));
    if (!empty($ids)) {
        $query->whereIn('id', $ids);
    }
}
```

- [x] **Step 7: Run full backend test suite**

```bash
cd aroma-api && php artisan test tests/Feature/HomeTest.php tests/Feature/AdminHomepageTest.php
```

Expected: All 13 tests pass.

- [x] **Step 8: Commit**

```bash
git add aroma-api/app/Services/HomeService.php \
        aroma-api/app/Http/Controllers/Api/Admin/AdminHomepageController.php \
        aroma-api/app/Http/Controllers/Api/Admin/AdminProductController.php \
        aroma-api/tests/Feature/HomeTest.php
git commit -m "feat: add curated block type — backend hydration, validation, ids param"
```

---

## Task 2: Admin — Types + API

**Files:**
- Modify: `aroma-admin/src/types/index.ts`
- Modify: `aroma-admin/src/api/admin.ts`

- [x] **Step 1: Add `curated` to `HomepageBlockType`**

In `aroma-admin/src/types/index.ts`, find:

```ts
export type HomepageBlockType =
  | 'bestsellers'
  | 'new_arrivals'
  | 'offers'
  | 'categories'
  | 'featured_brand'
```

Replace with:

```ts
export type HomepageBlockType =
  | 'bestsellers'
  | 'new_arrivals'
  | 'offers'
  | 'categories'
  | 'featured_brand'
  | 'curated'
```

- [x] **Step 2: Add `product_ids` to config type**

In `aroma-admin/src/types/index.ts`, find the `HomepageBlock` interface config shape:

```ts
  config: {
    label?: string
    title?: string
    limit?: number
    product_limit?: number
    brand_id?: string
  }
```

Replace with:

```ts
  config: {
    label?: string
    title?: string
    limit?: number
    product_limit?: number
    brand_id?: string
    product_ids?: number[]
  }
```

- [x] **Step 3: Add `ids` param to `apiGetProducts`**

In `aroma-admin/src/api/admin.ts`, find:

```ts
export const apiGetProducts = (params: {
  search?:      string
  brand_id?:    string
  category_id?: string
  type?:        ProductType
  price_min?:   number
  price_max?:   number
  page?:        number
}) =>
  client.get<{ data: AdminProduct[]; meta: PageMeta }>('/admin/products', { params })
```

Replace with:

```ts
export const apiGetProducts = (params: {
  search?:      string
  brand_id?:    string
  category_id?: string
  type?:        ProductType
  price_min?:   number
  price_max?:   number
  page?:        number
  ids?:         string   // comma-separated: "1,2,3"
}) =>
  client.get<{ data: AdminProduct[]; meta: PageMeta }>('/admin/products', { params })
```

- [x] **Step 4: Verify TypeScript compiles**

```bash
cd aroma-admin && npx vue-tsc --noEmit 2>&1 | grep "types/index\|api/admin" | head -10
```

Expected: No errors in those files.

- [x] **Step 5: Commit**

```bash
git add aroma-admin/src/types/index.ts aroma-admin/src/api/admin.ts
git commit -m "feat: add curated type and product_ids config to admin types"
```

---

## Task 3: Admin — `ProductPicker.vue`

**Files:**
- Create: `aroma-admin/src/components/homepage/ProductPicker.vue`

- [x] **Step 1: Create the component**

```vue
<!-- aroma-admin/src/components/homepage/ProductPicker.vue -->
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import draggable from 'vuedraggable'
import { apiGetProducts } from '../../api/admin'
import { GripVertical, X } from 'lucide-vue-next'
import type { AdminProduct } from '../../types'

interface PickedProduct {
  id: number
  name: string
  brand: string
  thumbnailUrl: string | null
}

const props = defineProps<{ modelValue: number[] }>()
const emit  = defineEmits<{ 'update:modelValue': [number[]] }>()

const query       = ref('')
const results     = ref<AdminProduct[]>([])
const selected    = ref<PickedProduct[]>([])
const showResults = ref(false)
let debounce: ReturnType<typeof setTimeout>

// Pre-populate selected list when editing an existing curated block
onMounted(async () => {
  if (props.modelValue.length === 0) return
  try {
    const res = await apiGetProducts({ ids: props.modelValue.join(',') })
    const byId = Object.fromEntries(res.data.data.map(p => [p.id, p]))
    selected.value = props.modelValue
      .map(id => byId[id])
      .filter(Boolean)
      .map(p => ({ id: p.id, name: p.name, brand: p.brand, thumbnailUrl: p.thumbnailUrl }))
  } catch { /* leave empty — IDs still saved correctly on submit */ }
})

function onInput() {
  clearTimeout(debounce)
  if (!query.value.trim()) {
    results.value  = []
    showResults.value = false
    return
  }
  debounce = setTimeout(async () => {
    try {
      const res = await apiGetProducts({ search: query.value })
      results.value = res.data.data.filter(
        p => !selected.value.some(s => s.id === p.id)
      )
      showResults.value = true
    } catch { results.value = [] }
  }, 300)
}

function pick(product: AdminProduct) {
  selected.value.push({
    id:          product.id,
    name:        product.name,
    brand:       product.brand,
    thumbnailUrl: product.thumbnailUrl,
  })
  query.value       = ''
  results.value     = []
  showResults.value = false
  emit('update:modelValue', selected.value.map(p => p.id))
}

function remove(id: number) {
  selected.value = selected.value.filter(p => p.id !== id)
  emit('update:modelValue', selected.value.map(p => p.id))
}

function onDragEnd() {
  emit('update:modelValue', selected.value.map(p => p.id))
}
</script>

<template>
  <div class="space-y-2">
    <label class="block text-[11px] font-medium text-dash-muted uppercase tracking-wide">
      Products
    </label>

    <!-- Search input -->
    <div class="relative">
      <input
        v-model="query"
        type="text"
        placeholder="Search products…"
        @input="onInput"
        @blur="setTimeout(() => { showResults = false }, 150)"
        @focus="showResults = results.length > 0"
        class="w-full rounded border border-dash-border bg-dash-paper-2 px-3 py-2 text-[13px]
               text-dash-text placeholder:text-dash-faint focus:outline-none focus:border-dash-primary"
      />

      <!-- Dropdown results -->
      <div
        v-if="showResults && results.length > 0"
        class="absolute z-10 top-full mt-1 w-full bg-dash-paper border border-dash-border
               rounded shadow-lg max-h-52 overflow-y-auto"
      >
        <button
          v-for="p in results"
          :key="p.id"
          type="button"
          @mousedown.prevent="pick(p)"
          class="w-full text-left px-3 py-2 hover:bg-dash-bg flex items-center gap-2.5"
        >
          <img
            v-if="p.thumbnailUrl"
            :src="p.thumbnailUrl"
            class="w-8 h-8 object-contain rounded shrink-0 bg-dash-bg"
            alt=""
          />
          <div v-else class="w-8 h-8 rounded bg-dash-bg shrink-0" />
          <div class="min-w-0">
            <p class="text-[13px] text-dash-text truncate">{{ p.name }}</p>
            <p class="text-[11px] text-dash-faint">{{ p.brand }}</p>
          </div>
        </button>
      </div>
    </div>

    <!-- Selected list -->
    <draggable
      v-model="selected"
      item-key="id"
      handle=".pick-handle"
      @end="onDragEnd"
      class="space-y-1.5"
    >
      <template #item="{ element: p }">
        <div class="flex items-center gap-2 rounded border border-dash-border bg-dash-bg px-2 py-1.5">
          <GripVertical :size="14" class="pick-handle cursor-grab text-dash-faint shrink-0" />
          <img
            v-if="p.thumbnailUrl"
            :src="p.thumbnailUrl"
            class="w-7 h-7 object-contain rounded shrink-0"
            alt=""
          />
          <div v-else class="w-7 h-7 rounded bg-dash-border shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-[12px] text-dash-text truncate">{{ p.name }}</p>
            <p class="text-[11px] text-dash-faint">{{ p.brand }}</p>
          </div>
          <button
            type="button"
            @click="remove(p.id)"
            class="p-0.5 text-dash-faint hover:text-dash-danger transition-colors shrink-0"
          >
            <X :size="13" />
          </button>
        </div>
      </template>
    </draggable>

    <p v-if="selected.length === 0" class="text-[11px] text-dash-faint italic">
      No products selected. Search above to add.
    </p>
  </div>
</template>
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/components/homepage/ProductPicker.vue
git commit -m "feat: add ProductPicker component with search and drag reorder"
```

---

## Task 4: Admin — Wire `ProductPicker` into `BlockEditor`

**Files:**
- Modify: `aroma-admin/src/components/homepage/BlockEditor.vue`

- [x] **Step 1: Add `curated` to BLOCK_TYPES, import ProductPicker, add state**

In `aroma-admin/src/components/homepage/BlockEditor.vue`, make these changes:

**Add import** (in the `<script setup>` block, after the ASelect import):

```ts
import ProductPicker from './ProductPicker.vue'
```

**Add `curated` to BLOCK_TYPES array:**

```ts
const BLOCK_TYPES: { value: HomepageBlockType; label: string }[] = [
  { value: 'bestsellers',    label: 'Bestsellers' },
  { value: 'new_arrivals',   label: 'New Arrivals' },
  { value: 'offers',         label: 'Offers' },
  { value: 'categories',     label: 'Categories' },
  { value: 'featured_brand', label: 'Featured Brand' },
  { value: 'curated',        label: 'Curated (manual pick)' },
]
```

**Add `productIds` ref** after the `enabled` ref:

```ts
const productIds = ref<number[]>([])
```

**Update the watch** to populate `productIds` from `b.config.product_ids`:

```ts
watch(() => props.block, (b) => {
  if (b) {
    type.value         = b.type
    label.value        = b.config.label  ?? ''
    title.value        = b.config.title  ?? ''
    limit.value        = b.config.limit  ?? 3
    brandId.value      = b.config.brand_id      ?? ''
    productLimit.value = b.config.product_limit ?? 2
    productIds.value   = b.config.product_ids   ?? []
    enabled.value      = b.enabled
  } else {
    type.value = 'bestsellers'
    label.value = title.value = brandId.value = ''
    limit.value = 3
    productLimit.value = 2
    productIds.value   = []
    enabled.value = true
  }
}, { immediate: true })
```

**Update `submit()`** to include `product_ids` for curated blocks:

```ts
function submit() {
  const config: HomepageBlock['config'] = { label: label.value, title: title.value }

  if (['bestsellers', 'new_arrivals', 'offers'].includes(type.value)) {
    config.limit = limit.value
  }

  if (type.value === 'featured_brand') {
    config.brand_id      = brandId.value
    config.product_limit = productLimit.value
  }

  if (type.value === 'curated') {
    config.product_ids = productIds.value
  }

  if (isNew.value) {
    emit('save', { type: type.value, config, enabled: enabled.value } as NewBlockPayload)
  } else {
    emit('save', { config, enabled: enabled.value })
  }
}
```

- [x] **Step 2: Add `ProductPicker` to the template**

In the `<!-- Body -->` section, after the `<!-- Featured brand fields -->` template block and before the `<!-- Enabled toggle -->` div, add:

```html
<!-- Curated fields -->
<ProductPicker
  v-if="type === 'curated'"
  v-model="productIds"
/>
```

- [x] **Step 3: Verify the admin builds without new TypeScript errors**

```bash
cd aroma-admin && npm run build 2>&1 | grep "BlockEditor\|ProductPicker" | head -10
```

Expected: No errors on those files.

- [x] **Step 4: Commit**

```bash
git add aroma-admin/src/components/homepage/BlockEditor.vue
git commit -m "feat: wire ProductPicker into BlockEditor for curated block type"
```

---

## Task 5: Storefront — `curated` type + `CuratedSection`

**Files:**
- Modify: `aroma/src/types/index.ts`
- Modify: `aroma/src/features/home/HomeSection.tsx`

- [x] **Step 1: Add `curated` to `HomeBlock` type**

In `aroma/src/types/index.ts`, find the `HomeBlock` interface:

```ts
export interface HomeBlock {
  id: number
  type: 'bestsellers' | 'new_arrivals' | 'offers' | 'categories' | 'featured_brand'
  config: {
    label?: string
    title?: string
    limit?: number
    product_limit?: number
    brand_id?: string
  }
  data: {
    products?: Product[]
    categories?: Category[]
    brand?: Brand
  }
}
```

Replace with:

```ts
export interface HomeBlock {
  id: number
  type: 'bestsellers' | 'new_arrivals' | 'offers' | 'categories' | 'featured_brand' | 'curated'
  config: {
    label?: string
    title?: string
    limit?: number
    product_limit?: number
    brand_id?: string
    product_ids?: number[]
  }
  data: {
    products?: Product[]
    categories?: Category[]
    brand?: Brand
  }
}
```

- [x] **Step 2: Add `CuratedSection` to HomeSection.tsx**

In `aroma/src/features/home/HomeSection.tsx`, add this component after the `OffersSection` function (before the `HomeSections` function):

```tsx
// ── Curated ───────────────────────────────────────────────────────────
export function CuratedSection({ products, config }: { products: Product[]; config?: { label?: string; title?: string } }) {
  return (
    <RevealSection className="px-6 md:px-12 py-16 md:py-[72px]">
      <SectionHeader
        label={config?.label ?? 'مختارات خاصة'}
        title={config?.title ?? 'مختارات المحرر'}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-7">
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </RevealSection>
  )
}
```

- [x] **Step 3: Add `case 'curated'` to `HomeSections` switch**

In the `HomeSections` function's switch statement, add before `default`:

```tsx
case 'curated':
  return <CuratedSection key={block.id} products={block.data.products ?? []} config={block.config} />
```

So the full switch becomes:

```tsx
switch (block.type) {
  case 'bestsellers':
    return <BestsellersSection key={block.id} products={block.data.products ?? []} config={block.config} />
  case 'new_arrivals':
    return <NewArrivalsSection key={block.id} products={block.data.products ?? []} config={block.config} />
  case 'offers':
    return <OffersSection key={block.id} products={block.data.products ?? []} config={block.config} />
  case 'categories':
    return <CategoriesStrip key={block.id} categories={block.data.categories ?? []} config={block.config} />
  case 'featured_brand':
    return block.data.brand
      ? <FeaturedBrandBanner key={block.id} brand={block.data.brand} products={block.data.products ?? []} config={block.config} />
      : null
  case 'curated':
    return <CuratedSection key={block.id} products={block.data.products ?? []} config={block.config} />
  default:
    return null
}
```

- [x] **Step 4: Verify TypeScript**

```bash
cd aroma && npx tsc --noEmit 2>&1 | grep "HomeSection\|types/index" | head -10
```

Expected: No errors.

- [x] **Step 5: Commit**

```bash
git add aroma/src/types/index.ts aroma/src/features/home/HomeSection.tsx
git commit -m "feat: add CuratedSection to storefront homepage"
```

---

## Task 6: End-to-End Verification + Merge

- [x] **Step 1: Run all backend tests**

```bash
cd aroma-api && php artisan test tests/Feature/HomeTest.php tests/Feature/AdminHomepageTest.php
```

Expected: All 13 tests pass.

- [x] **Step 2: Verify admin build**

```bash
cd aroma-admin && npm run build 2>&1 | grep "homepage\|ProductPicker\|BlockEditor\|curated" | head -10
```

Expected: No errors in the new files.

- [x] **Step 3: Verify storefront TypeScript**

```bash
cd aroma && npx tsc --noEmit 2>&1 | head -10
```

Expected: No errors.

- [x] **Step 4: Merge to master**

```bash
git checkout master
git merge feature/curated-homepage-block --no-ff -m "feat: curated homepage block — manual product picker"
```
