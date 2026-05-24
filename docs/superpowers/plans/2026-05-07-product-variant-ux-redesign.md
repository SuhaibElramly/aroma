# Product & Variant UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the fragmented, multi-button product/variant creation flow with a guided 3-step wizard that handles both single-price and multi-variant products cleanly, and lets admins set all prices at once after variant generation.

**Architecture:** One new Laravel endpoint (`PUT /variants/bulk`) handles bulk price saves. The admin `ProductCreateView.vue` loses its orphaned Specifications section. `ProductVariantsView.vue` is rewritten from scratch as a state-machine-driven wizard: step 1 (product type) → step 2 (spec editor + generate, multi only) → step 3 (inline price grid). When variants already exist the page skips the wizard and goes straight to the price grid.

**Tech Stack:** Laravel 11, PHPUnit (backend); Vue 3 Composition API + TypeScript, Tailwind, Lucide icons (frontend).

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `aroma-api/app/Http/Controllers/Api/Admin/AdminProductVariantController.php` | Modify | Add `bulkUpdate` method |
| `aroma-api/routes/api.php` | Modify | Register `PUT /variants/bulk` route (before `{variantId}` route) |
| `aroma-api/tests/Feature/AdminProductVariantBulkTest.php` | Create | Tests for bulk endpoint |
| `aroma-admin/src/api/admin.ts` | Modify | Add `apiBulkUpdateVariants`; remove `apiCreateVariant` export |
| `aroma-admin/src/views/ProductCreateView.vue` | Modify | Remove Specifications section + spec state/logic |
| `aroma-admin/src/views/ProductVariantsView.vue` | Rewrite | Full 3-step wizard + editing mode |

---

## Task 1: Backend — Bulk Variant Update Endpoint

**Files:**
- Create: `aroma-api/tests/Feature/AdminProductVariantBulkTest.php`
- Modify: `aroma-api/app/Http/Controllers/Api/Admin/AdminProductVariantController.php`
- Modify: `aroma-api/routes/api.php`

- [x] **Step 1: Write the failing tests**

Create `aroma-api/tests/Feature/AdminProductVariantBulkTest.php`:

```php
<?php
namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductSpecAssignment;
use App\Models\ProductSpecValue;
use App\Models\ProductVariant;
use App\Models\SpecType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminProductVariantBulkTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['is_admin' => true]);
    }

    private function asAdmin(): static
    {
        return $this->actingAs($this->admin, 'sanctum');
    }

    public function test_bulk_update_returns_updated_variants(): void
    {
        $product  = Product::factory()->create();
        $variantA = ProductVariant::factory()->create(['product_id' => $product->id, 'price' => 0, 'quantity' => 0]);
        $variantB = ProductVariant::factory()->create(['product_id' => $product->id, 'price' => 0, 'quantity' => 0]);

        $response = $this->asAdmin()->putJson("/api/admin/products/{$product->id}/variants/bulk", [
            'variants' => [
                ['id' => $variantA->id, 'price' => 89.00, 'original_price' => null,   'quantity' => 50, 'low_stock_threshold' => 5],
                ['id' => $variantB->id, 'price' => 149.00, 'original_price' => 199.00, 'quantity' => 30, 'low_stock_threshold' => 3],
            ],
        ]);

        $response->assertOk();
        $data = $response->json();
        $this->assertCount(2, $data);

        $this->assertEquals('89.00',  $data[0]['price']);
        $this->assertEquals(50,        $data[0]['quantity']);
        $this->assertNull(             $data[0]['originalPrice']);

        $this->assertEquals('149.00', $data[1]['price']);
        $this->assertEquals('199.00', $data[1]['originalPrice']);
        $this->assertEquals(3,         $data[1]['lowStockThreshold']);
    }

    public function test_bulk_update_persists_to_database(): void
    {
        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->create(['product_id' => $product->id, 'price' => 0, 'quantity' => 0]);

        $this->asAdmin()->putJson("/api/admin/products/{$product->id}/variants/bulk", [
            'variants' => [
                ['id' => $variant->id, 'price' => 75.50, 'original_price' => null, 'quantity' => 10, 'low_stock_threshold' => 2],
            ],
        ])->assertOk();

        $this->assertDatabaseHas('product_variants', [
            'id'       => $variant->id,
            'price'    => 75.50,
            'quantity' => 10,
        ]);
    }

    public function test_bulk_update_rejects_variant_from_another_product(): void
    {
        $product      = Product::factory()->create();
        $otherProduct = Product::factory()->create();
        $otherVariant = ProductVariant::factory()->create(['product_id' => $otherProduct->id]);

        $this->asAdmin()->putJson("/api/admin/products/{$product->id}/variants/bulk", [
            'variants' => [
                ['id' => $otherVariant->id, 'price' => 50, 'original_price' => null, 'quantity' => 5, 'low_stock_threshold' => 1],
            ],
        ])->assertNotFound();
    }

    public function test_bulk_update_requires_price_and_quantity(): void
    {
        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->create(['product_id' => $product->id]);

        $this->asAdmin()->putJson("/api/admin/products/{$product->id}/variants/bulk", [
            'variants' => [
                ['id' => $variant->id, 'original_price' => null],
            ],
        ])->assertUnprocessable();
    }

    public function test_bulk_update_requires_admin(): void
    {
        $user    = User::factory()->create(['is_admin' => false]);
        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->create(['product_id' => $product->id]);

        $this->actingAs($user, 'sanctum')
            ->putJson("/api/admin/products/{$product->id}/variants/bulk", [
                'variants' => [['id' => $variant->id, 'price' => 50, 'original_price' => null, 'quantity' => 5, 'low_stock_threshold' => 1]],
            ])->assertForbidden();
    }
}
```

- [x] **Step 2: Run tests to confirm they fail**

```bash
cd aroma-api && php artisan test --filter AdminProductVariantBulkTest
```

Expected: All 5 tests fail (route not found / method not found).

- [x] **Step 3: Register the bulk route**

Open `aroma-api/routes/api.php`. Add the bulk route **before** the existing `PUT /products/{productId}/variants/{variantId}` line:

```php
Route::put('/products/{productId}/variants/bulk',            [AdminProductVariantController::class, 'bulkUpdate']);
Route::put('/products/{productId}/variants/{variantId}',     [AdminProductVariantController::class, 'update']);
```

The bulk route must come first so Laravel doesn't capture "bulk" as `{variantId}`.

- [x] **Step 4: Add `bulkUpdate` to the controller**

In `aroma-api/app/Http/Controllers/Api/Admin/AdminProductVariantController.php`, add this method after `update()`:

```php
public function bulkUpdate(Request $request, int $productId)
{
    Product::findOrFail($productId);

    $data = $request->validate([
        'variants'                       => 'required|array|min:1',
        'variants.*.id'                  => 'required|integer',
        'variants.*.price'               => 'required|numeric|min:0',
        'variants.*.original_price'      => 'nullable|numeric|min:0',
        'variants.*.quantity'            => 'required|integer|min:0',
        'variants.*.low_stock_threshold' => 'sometimes|integer|min:0',
    ]);

    $specOrder = $this->getSpecOrder($productId);

    $updated = DB::transaction(function () use ($data, $productId, $specOrder) {
        return collect($data['variants'])->map(function (array $item) use ($productId, $specOrder) {
            $variant = ProductVariant::where('product_id', $productId)->findOrFail($item['id']);
            $variant->update([
                'price'               => $item['price'],
                'original_price'      => $item['original_price'] ?? null,
                'quantity'            => $item['quantity'],
                'low_stock_threshold' => $item['low_stock_threshold'] ?? $variant->low_stock_threshold,
            ]);
            return $this->fmt($variant->fresh()->load('specValues.specType'), $specOrder);
        })->values()->toArray();
    });

    return response()->json($updated);
}
```

- [x] **Step 5: Run tests to confirm they pass**

```bash
cd aroma-api && php artisan test --filter AdminProductVariantBulkTest
```

Expected: All 5 tests pass.

- [x] **Step 6: Commit**

```bash
cd aroma-api
git add app/Http/Controllers/Api/Admin/AdminProductVariantController.php routes/api.php tests/Feature/AdminProductVariantBulkTest.php
git commit -m "feat: add bulk variant update endpoint"
```

---

## Task 2: Frontend — API Function

**Files:**
- Modify: `aroma-admin/src/api/admin.ts`

- [x] **Step 1: Add `apiBulkUpdateVariants` and remove `apiCreateVariant`**

In `aroma-admin/src/api/admin.ts`:

Remove the `apiCreateVariant` export (it will no longer be used from the UI):
```typescript
// DELETE this function:
export const apiCreateVariant = (productId: number, data: Record<string, unknown>) =>
  client.post<ProductVariant>(`/admin/products/${productId}/variants`, data)
```

Add the bulk update function in its place:
```typescript
export const apiBulkUpdateVariants = (
  productId: number,
  variants: Array<{
    id:                  number
    price:               number
    original_price:      number | null
    quantity:            number
    low_stock_threshold: number
  }>
) =>
  client.put<ProductVariant[]>(`/admin/products/${productId}/variants/bulk`, { variants })
```

- [x] **Step 2: Verify TypeScript compiles**

```bash
cd aroma-admin && npx tsc --noEmit
```

Expected: No errors.

- [x] **Step 3: Commit**

```bash
cd aroma-admin
git add src/api/admin.ts
git commit -m "feat: add apiBulkUpdateVariants; remove apiCreateVariant from UI layer"
```

---

## Task 3: Clean Up ProductCreateView

**Files:**
- Modify: `aroma-admin/src/views/ProductCreateView.vue`

- [x] **Step 1: Remove the Specifications section from the template**

In `aroma-admin/src/views/ProductCreateView.vue`, delete the entire `<section>` block for Specifications (lines ~184–263 — the block starts with `<!-- Specs -->` and contains the "Assign Spec Types" and "Define Values" subsections). The section to remove looks like:

```html
<!-- Specs -->
<section class="bg-dash-surface rounded-card shadow-card p-5 space-y-4">
  ...
</section>
```

Delete from the opening `<!-- Specs -->` comment through the closing `</section>` tag of that block.

- [x] **Step 2: Remove spec state and logic from `<script setup>`**

Remove the following from the script section:

```typescript
// Delete these imports from the api import line:
apiGetSpecTypes, apiSaveProductSpecs,

// Delete these type imports:
SpecType  // from '../types'

// Delete these icon imports:
ChevronUp, ChevronDown  // from lucide-vue-next (only if unused elsewhere)

// Delete all spec-related state and functions:
const allSpecTypes  = ref<SpecType[]>([])
const assignedSpecs = ref<...>([])
const specToAdd     = ref<number | ''>('')
const valueInputs   = ref<Record<number, string>>({})
const availableSpecTypes = computed(...)
function addSpec() { ... }
function removeSpec(...) { ... }
function moveSpec(...) { ... }
function addValue(...) { ... }
function removeValue(...) { ... }
```

- [x] **Step 3: Remove spec logic from `handleSave` and `onMounted`**

In `handleSave`, remove:
```typescript
const specsWithValues = assignedSpecs.value.filter(s => s.values.length > 0)
if (specsWithValues.length > 0) {
  await apiSaveProductSpecs(
    data.id,
    specsWithValues.map(s => ({ spec_type_id: s.spec_type_id, values: s.values }))
  )
}
```

In `onMounted`, change:
```typescript
// From:
const [b, c, s] = await Promise.all([apiGetBrands(), apiGetCategories(), apiGetSpecTypes()])
brands.value       = b.data
cats.value         = c.data
allSpecTypes.value = s.data

// To:
const [b, c] = await Promise.all([apiGetBrands(), apiGetCategories()])
brands.value = b.data
cats.value   = c.data
```

- [x] **Step 4: Verify TypeScript compiles**

```bash
cd aroma-admin && npx tsc --noEmit
```

Expected: No errors.

- [x] **Step 5: Start dev server and verify the create page has no Specifications section**

```bash
cd aroma-admin && npm run dev
```

Navigate to `/products/new`. Confirm the page shows: Product Name, Description, Images, and the right sidebar (Organize, Status, Card Color). No Specifications section should be visible.

- [x] **Step 6: Commit**

```bash
cd aroma-admin
git add src/views/ProductCreateView.vue
git commit -m "feat: remove specs section from product create page"
```

---

## Task 4: Rewrite ProductVariantsView

**Files:**
- Rewrite: `aroma-admin/src/views/ProductVariantsView.vue`

This task replaces the entire file. The new view implements:
- Wizard mode (no variants exist): steps 1 → 2 → 3
- Editing mode (variants exist): collapsed summary cards + price grid directly

- [x] **Step 1: Replace the entire file**

Write the following as the complete new content of `aroma-admin/src/views/ProductVariantsView.vue`:

```vue
<template>
  <div class="space-y-4 max-w-4xl">

    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-xs">
      <RouterLink to="/products" class="text-dash-faint hover:text-dash-text transition-colors">Products</RouterLink>
      <span class="text-dash-border">/</span>
      <span class="text-dash-text font-medium">Variants &amp; Images</span>
    </div>

    <!-- Page-level error banner -->
    <div v-if="pageError" class="rounded-card bg-dash-danger-lt border border-dash-danger/20 px-4 py-3 text-xs text-dash-danger">
      {{ pageError }}
    </div>

    <!-- ── Images card (always shown, collapsible) ── -->
    <div class="bg-dash-surface rounded-card shadow-card">
      <!-- Collapsed header -->
      <div class="flex items-center justify-between px-5 py-3">
        <div>
          <h2 class="text-sm font-semibold text-dash-text">Images</h2>
          <p class="text-2xs text-dash-muted mt-0.5">
            {{ imagesExpanded ? 'Click any image to set as thumbnail' : `${images.length} image${images.length !== 1 ? 's' : ''} uploaded` }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <label v-if="imagesExpanded" class="cursor-pointer">
            <input type="file" accept="image/*" multiple class="sr-only" @change="handleUpload" :disabled="uploading" />
            <span :class="['inline-flex items-center gap-1.5 rounded-btn px-3 py-1.5 text-xs font-medium transition-all duration-200',
              uploading ? 'bg-dash-border text-dash-faint cursor-not-allowed' : 'bg-dash-secondary text-white hover:bg-dash-secondary-dk shadow-sm cursor-pointer']">
              <span v-if="uploading" class="inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
              <ImagePlus v-else :size="14" />
              Upload
            </span>
          </label>
          <AButton size="sm" variant="ghost" @click="imagesExpanded = !imagesExpanded">
            {{ imagesExpanded ? 'Collapse' : 'Manage' }}
          </AButton>
        </div>
      </div>

      <!-- Expanded image grid -->
      <div v-if="imagesExpanded" class="px-5 pb-5">
        <div v-if="imagesLoading" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          <div v-for="i in 4" :key="i" class="aspect-square rounded-xl bg-dash-border animate-pulse" />
        </div>
        <div v-else-if="images.length" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          <div v-for="img in images" :key="img.id"
            class="group relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer"
            :class="img.isThumbnail ? 'border-dash-primary shadow-card' : 'border-dash-border hover:border-dash-primary/40'"
            @click="setThumbnail(img)">
            <img :src="img.url" :alt="img.originalName ?? 'Product image'" class="h-full w-full object-cover" />
            <div v-if="img.isThumbnail" class="absolute top-1.5 left-1.5 bg-dash-primary text-white text-2xs font-semibold rounded-md px-1.5 py-0.5 flex items-center gap-1">
              <Star :size="9" /> Thumbnail
            </div>
            <button class="absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center rounded-lg bg-dash-text/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-dash-danger"
              @click.stop="deleteImage(img)">
              <X :size="11" />
            </button>
          </div>
        </div>
        <div v-else class="flex flex-col items-center justify-center py-8 text-center">
          <div class="h-10 w-10 rounded-2xl bg-dash-border flex items-center justify-center text-dash-faint mb-3">
            <ImageOff :size="20" />
          </div>
          <p class="text-sm font-medium text-dash-text">No images yet</p>
          <p class="text-2xs text-dash-faint mt-1">Upload images using the button above</p>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════
         WIZARD MODE — no variants exist yet
    ══════════════════════════════════════════════ -->
    <template v-if="!hasVariants">

      <!-- Step indicators -->
      <div class="flex items-stretch gap-2">
        <!-- Step 1 -->
        <div :class="['flex items-center gap-2 px-4 py-2.5 rounded-card border flex-1 transition-all', stepClass(1)]">
          <div :class="['w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0', stepNumClass(1)]">
            <Check v-if="currentStep > 1" :size="10" />
            <span v-else>1</span>
          </div>
          <div class="text-xs font-medium leading-tight">
            <span v-if="currentStep > 1 && productType === 'single'" class="text-emerald-400">Single price</span>
            <span v-else-if="currentStep > 1 && productType === 'multi'" class="text-emerald-400">Multiple variants</span>
            <span v-else>Product type</span>
          </div>
        </div>
        <!-- Step 2 (multi only) -->
        <div :class="['flex items-center gap-2 px-4 py-2.5 rounded-card border flex-1 transition-all', stepClass(2)]">
          <div :class="['w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0', stepNumClass(2)]">
            <Check v-if="currentStep > 2" :size="10" />
            <span v-else>2</span>
          </div>
          <div class="text-xs font-medium leading-tight">
            <span v-if="currentStep > 2">{{ combinationCount }} variant{{ combinationCount !== 1 ? 's' : '' }} generated</span>
            <span v-else>Define variants</span>
          </div>
        </div>
        <!-- Step 3 -->
        <div :class="['flex items-center gap-2 px-4 py-2.5 rounded-card border flex-1 transition-all', stepClass(3)]">
          <div :class="['w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0', stepNumClass(3)]">
            <span>3</span>
          </div>
          <div class="text-xs font-medium leading-tight">Set prices</div>
        </div>
      </div>

      <!-- ── Step 1: Product type ── -->
      <div v-if="currentStep === 1" class="bg-dash-surface rounded-card shadow-card p-5">
        <h2 class="text-sm font-semibold text-dash-text mb-1">Step 1 — Product type</h2>
        <p class="text-2xs text-dash-muted mb-4">How does this product work in your store?</p>

        <div class="space-y-3">
          <label class="flex items-start gap-3 p-3 rounded-card border cursor-pointer transition-all"
            :class="productType === 'single' ? 'border-dash-primary bg-dash-primary-lt/30' : 'border-dash-border hover:border-dash-muted'">
            <div class="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
              :class="productType === 'single' ? 'border-dash-primary bg-dash-primary' : 'border-dash-border'">
              <div v-if="productType === 'single'" class="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <input type="radio" v-model="productType" value="single" class="sr-only" />
            <div>
              <p class="text-xs font-semibold text-dash-text">Single price &amp; stock</p>
              <p class="text-2xs text-dash-muted mt-0.5">One price, one quantity — good for a product sold in one size only.</p>
            </div>
          </label>

          <label class="flex items-start gap-3 p-3 rounded-card border cursor-pointer transition-all"
            :class="productType === 'multi' ? 'border-dash-primary bg-dash-primary-lt/30' : 'border-dash-border hover:border-dash-muted'">
            <div class="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
              :class="productType === 'multi' ? 'border-dash-primary bg-dash-primary' : 'border-dash-border'">
              <div v-if="productType === 'multi'" class="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <input type="radio" v-model="productType" value="multi" class="sr-only" />
            <div>
              <p class="text-xs font-semibold text-dash-text">Multiple variants</p>
              <p class="text-2xs text-dash-muted mt-0.5">Different sizes, colors, or combinations — each with its own price and stock.</p>
            </div>
          </label>
        </div>

        <div class="flex justify-end mt-5">
          <AButton size="sm" :disabled="!productType" :loading="generatingSingle" @click="handleStep1Continue">
            Continue →
          </AButton>
        </div>
      </div>

      <!-- ── Step 2: Define variants (multi only) ── -->
      <div v-if="currentStep === 2" class="bg-dash-surface rounded-card shadow-card p-5 space-y-5">
        <div>
          <h2 class="text-sm font-semibold text-dash-text">Step 2 — Define variants</h2>
          <p class="text-2xs text-dash-muted mt-0.5">Assign spec types and add all values for each one.</p>
        </div>

        <!-- Spec type selector -->
        <div>
          <p class="text-xs font-medium text-dash-text mb-2">Spec types</p>
          <div class="flex gap-2">
            <select v-model="specToAdd"
              class="flex-1 rounded-btn border border-dash-border bg-dash-bg px-3 py-1.5 text-xs text-dash-text focus:outline-none focus:border-dash-primary">
              <option value="">Add a spec type…</option>
              <option v-for="s in availableSpecTypes" :key="s.id" :value="s.id">
                {{ s.name }}{{ s.unit ? ` (${s.unit})` : '' }}
              </option>
            </select>
            <AButton size="sm" variant="secondary" :disabled="!specToAdd" @click="addSpec">Add</AButton>
          </div>

          <div v-if="assignedSpecs.length" class="mt-3 space-y-2">
            <div v-for="(spec, idx) in assignedSpecs" :key="spec.spec_type_id"
              class="px-3 py-2.5 rounded-btn border border-dash-border bg-dash-bg">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-semibold text-dash-text flex-1">
                  {{ spec.name }}{{ spec.unit ? ` (${spec.unit})` : '' }}
                </span>
                <button :disabled="idx === 0" class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30" @click="moveSpec(idx, -1)">
                  <ChevronUp :size="12" />
                </button>
                <button :disabled="idx === assignedSpecs.length - 1" class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30" @click="moveSpec(idx, 1)">
                  <ChevronDown :size="12" />
                </button>
                <button class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-danger" @click="removeSpec(idx)">
                  <X :size="12" />
                </button>
              </div>
              <!-- Value chips -->
              <div class="flex flex-wrap gap-1.5 mb-2">
                <span v-for="(val, vi) in spec.values" :key="vi"
                  class="inline-flex items-center gap-1 rounded-full border border-dash-border bg-dash-surface px-2.5 py-1 text-xs font-medium text-dash-text">
                  {{ val }}{{ spec.unit ?? '' }}
                  <button @click="removeValue(spec, vi)" class="text-dash-faint hover:text-dash-danger ml-0.5">
                    <X :size="10" />
                  </button>
                </span>
              </div>
              <!-- Value input -->
              <div class="flex gap-2">
                <input v-model="valueInputs[spec.spec_type_id]" type="text"
                  :placeholder="`Add ${spec.name} value…`"
                  :class="['flex-1 rounded-btn border bg-dash-bg px-3 py-1.5 text-xs text-dash-text focus:outline-none transition-colors',
                    spec.values.length === 0 ? 'border-dash-danger/60 focus:border-dash-danger' : 'border-dash-border focus:border-dash-primary']"
                  @keydown.enter.prevent="addValue(spec)" />
                <AButton size="sm" variant="secondary" @click="addValue(spec)">Add</AButton>
              </div>
              <p v-if="spec.values.length === 0" class="mt-1 text-2xs text-dash-danger">At least one value is required.</p>
            </div>
          </div>
        </div>

        <!-- Generate bar -->
        <div class="flex items-center justify-between pt-1 border-t border-dash-border">
          <p v-if="assignedSpecs.length && specsValid" class="text-xs text-dash-muted">
            Will generate <span class="font-semibold text-dash-text">{{ combinationCount }} variant{{ combinationCount !== 1 ? 's' : '' }}</span>
            <span v-if="assignedSpecs.length > 1"> ({{ assignedSpecs.map(s => s.values.length).join(' × ') }})</span>
          </p>
          <p v-else-if="assignedSpecs.length" class="text-xs text-dash-danger">Add at least one value per spec to generate.</p>
          <p v-else class="text-xs text-dash-muted">Add at least one spec type above.</p>
          <AButton size="sm" :loading="generating" :disabled="!specsValid || !assignedSpecs.length"
            :title="!specsValid ? 'Add at least one value for each spec' : undefined"
            @click="handleGenerate(false)">
            <Zap :size="13" /> Generate Variants
          </AButton>
        </div>
      </div>

      <!-- ── Step 3: Set prices ── -->
      <div v-if="currentStep === 3" class="bg-dash-surface rounded-card shadow-card p-5">
        <h2 class="text-sm font-semibold text-dash-text mb-1">
          {{ productType === 'single' ? 'Price &amp; Stock' : 'Step 3 — Set prices &amp; stock' }}
        </h2>
        <p class="text-2xs text-dash-muted mb-4">
          {{ productType === 'single' ? 'This product has one price.' : 'Fill in every variant. You can update these anytime.' }}
        </p>

        <!-- Single: simple 2×2 grid -->
        <div v-if="productType === 'single'" class="grid grid-cols-2 gap-3 mb-4">
          <AInput v-model="priceRows[0].price"             label="Price (LYD)" type="number" step="0.01" :error="priceRowErrors[0]?.price" />
          <AInput v-model="priceRows[0].originalPrice"     label="Original price (LYD)" type="number" step="0.01" />
          <AInput v-model="priceRows[0].quantity"          label="Quantity in stock" type="number" min="0" />
          <AInput v-model="priceRows[0].lowStockThreshold" label="Low stock alert at" type="number" min="0" />
        </div>

        <!-- Multi: inline table -->
        <div v-else class="overflow-x-auto mb-4">
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr class="border-b border-dash-border">
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">Variant</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">Price (LYD)</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">Original</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">Qty</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">Low at</th>
                <th class="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, ri) in priceRows" :key="row.id" class="border-b border-dash-border/50 last:border-0">
                <td class="py-2 px-2 font-semibold text-dash-text whitespace-nowrap">{{ variantLabel(row.id) }}</td>
                <td class="py-1.5 px-1">
                  <input v-model="row.price" type="number" step="0.01" min="0"
                    :class="['w-24 px-2 py-1 rounded-btn border text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary',
                      priceRowErrors[ri]?.price ? 'border-dash-danger' : 'border-dash-border']" />
                  <p v-if="priceRowErrors[ri]?.price" class="text-2xs text-dash-danger mt-0.5">Required</p>
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
                  <button v-if="!variants.find(v => v.id === row.id)?.isDefault"
                    class="text-2xs text-dash-muted hover:text-dash-primary transition-colors whitespace-nowrap"
                    @click="setDefault(row.id)">Set default</button>
                  <span v-else class="text-2xs font-semibold text-dash-primary whitespace-nowrap">★ Default</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Save row -->
        <div class="flex items-center justify-between pt-2 border-t border-dash-border">
          <div class="flex items-center gap-2 text-2xs text-dash-muted">
            <span>Overall stock:</span>
            <ABadge :status="overallStockPreview" />
          </div>
          <AButton size="sm" :loading="savingPrices" @click="savePrices">
            Save{{ productType === 'multi' ? ' Prices &amp; Stock' : '' }}
          </AButton>
        </div>
        <p v-if="saveError" class="mt-2 text-xs text-dash-danger">{{ saveError }}</p>
      </div>

    </template>

    <!-- ══════════════════════════════════════════════
         EDITING MODE — variants already exist
    ══════════════════════════════════════════════ -->
    <template v-else>

      <!-- Specs summary card (multi-variant products only) -->
      <div v-if="hasSpecs" class="bg-dash-surface rounded-card shadow-card">
        <div class="flex items-center justify-between px-5 py-3">
          <div>
            <h2 class="text-sm font-semibold text-dash-text">
              Variants — {{ assignedSpecs.map(s => s.name + (s.unit ? ` (${s.unit})` : '')).join(' × ') }}
              <span class="font-normal text-dash-muted text-xs">· {{ variants.length }} combinations</span>
            </h2>
            <p class="text-2xs text-dash-muted mt-0.5">
              {{ assignedSpecs.map(s => s.name + ': ' + s.values.join(', ')).join(' · ') }}
            </p>
          </div>
          <AButton size="sm" variant="secondary" @click="editSpecsExpanded = !editSpecsExpanded">
            {{ editSpecsExpanded ? 'Cancel' : 'Edit Specs' }}
          </AButton>
        </div>

        <!-- Edit specs expanded -->
        <div v-if="editSpecsExpanded" class="px-5 pb-5 border-t border-dash-border space-y-4 pt-4">
          <div class="flex gap-2">
            <select v-model="specToAdd"
              class="flex-1 rounded-btn border border-dash-border bg-dash-bg px-3 py-1.5 text-xs text-dash-text focus:outline-none focus:border-dash-primary">
              <option value="">Add a spec type…</option>
              <option v-for="s in availableSpecTypes" :key="s.id" :value="s.id">
                {{ s.name }}{{ s.unit ? ` (${s.unit})` : '' }}
              </option>
            </select>
            <AButton size="sm" variant="secondary" :disabled="!specToAdd" @click="addSpec">Add</AButton>
          </div>

          <div v-if="assignedSpecs.length" class="space-y-2">
            <div v-for="(spec, idx) in assignedSpecs" :key="spec.spec_type_id"
              class="px-3 py-2.5 rounded-btn border border-dash-border bg-dash-bg">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-semibold text-dash-text flex-1">
                  {{ spec.name }}{{ spec.unit ? ` (${spec.unit})` : '' }}
                </span>
                <button :disabled="idx === 0" class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30" @click="moveSpec(idx, -1)">
                  <ChevronUp :size="12" />
                </button>
                <button :disabled="idx === assignedSpecs.length - 1" class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30" @click="moveSpec(idx, 1)">
                  <ChevronDown :size="12" />
                </button>
                <button class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-danger" @click="removeSpec(idx)">
                  <X :size="12" />
                </button>
              </div>
              <div class="flex flex-wrap gap-1.5 mb-2">
                <span v-for="(val, vi) in spec.values" :key="vi"
                  class="inline-flex items-center gap-1 rounded-full border border-dash-border bg-dash-surface px-2.5 py-1 text-xs font-medium text-dash-text">
                  {{ val }}{{ spec.unit ?? '' }}
                  <button @click="removeValue(spec, vi)" class="text-dash-faint hover:text-dash-danger ml-0.5">
                    <X :size="10" />
                  </button>
                </span>
              </div>
              <div class="flex gap-2">
                <input v-model="valueInputs[spec.spec_type_id]" type="text"
                  :placeholder="`Add ${spec.name} value…`"
                  :class="['flex-1 rounded-btn border bg-dash-bg px-3 py-1.5 text-xs text-dash-text focus:outline-none transition-colors',
                    spec.values.length === 0 ? 'border-dash-danger/60 focus:border-dash-danger' : 'border-dash-border focus:border-dash-primary']"
                  @keydown.enter.prevent="addValue(spec)" />
                <AButton size="sm" variant="secondary" @click="addValue(spec)">Add</AButton>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-1 border-t border-dash-border">
            <p v-if="assignedSpecs.length && specsValid" class="text-xs text-dash-muted">
              Will generate <span class="font-semibold text-dash-text">{{ combinationCount }} variant{{ combinationCount !== 1 ? 's' : '' }}</span>
            </p>
            <p v-else class="text-xs text-dash-danger">Add at least one value per spec.</p>
            <AButton size="sm" variant="danger" :loading="generating" :disabled="!specsValid || !assignedSpecs.length"
              @click="handleGenerate(true)">
              <Zap :size="13" /> Regenerate Variants
            </AButton>
          </div>
        </div>
      </div>

      <!-- Switch to multiple variants (single-variant product only) -->
      <div v-if="!hasSpecs" class="text-center py-2">
        <button class="text-2xs text-dash-muted hover:text-dash-text underline underline-offset-2 transition-colors"
          @click="switchToMultiple">
          Switch to multiple variants
        </button>
      </div>

      <!-- Price grid (always shown in editing mode) -->
      <div class="bg-dash-surface rounded-card shadow-card p-5">
        <h2 class="text-sm font-semibold text-dash-text mb-1">Prices &amp; Stock</h2>
        <p class="text-2xs text-dash-muted mb-4">Changes are saved when you click Save.</p>

        <!-- Single variant: 2×2 grid -->
        <div v-if="!hasSpecs && priceRows.length === 1" class="grid grid-cols-2 gap-3 mb-4">
          <AInput v-model="priceRows[0].price"             label="Price (LYD)" type="number" step="0.01" :error="priceRowErrors[0]?.price" />
          <AInput v-model="priceRows[0].originalPrice"     label="Original price (LYD)" type="number" step="0.01" />
          <AInput v-model="priceRows[0].quantity"          label="Quantity in stock" type="number" min="0" />
          <AInput v-model="priceRows[0].lowStockThreshold" label="Low stock alert at" type="number" min="0" />
        </div>

        <!-- Multi-variant: table -->
        <div v-else class="overflow-x-auto mb-4">
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr class="border-b border-dash-border">
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">Variant</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">Price (LYD)</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">Original</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">Qty</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">Low at</th>
                <th class="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, ri) in priceRows" :key="row.id" class="border-b border-dash-border/50 last:border-0">
                <td class="py-2 px-2 font-semibold text-dash-text whitespace-nowrap">{{ variantLabel(row.id) }}</td>
                <td class="py-1.5 px-1">
                  <input v-model="row.price" type="number" step="0.01" min="0"
                    :class="['w-24 px-2 py-1 rounded-btn border text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary',
                      priceRowErrors[ri]?.price ? 'border-dash-danger' : 'border-dash-border']" />
                  <p v-if="priceRowErrors[ri]?.price" class="text-2xs text-dash-danger mt-0.5">Required</p>
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
                  <button v-if="!variants.find(v => v.id === row.id)?.isDefault"
                    class="text-2xs text-dash-muted hover:text-dash-primary transition-colors whitespace-nowrap"
                    @click="setDefault(row.id)">Set default</button>
                  <span v-else class="text-2xs font-semibold text-dash-primary whitespace-nowrap">★ Default</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-dash-border">
          <div class="flex items-center gap-2 text-2xs text-dash-muted">
            <span>Overall stock:</span>
            <ABadge :status="overallStockPreview" />
          </div>
          <AButton size="sm" :loading="savingPrices" @click="savePrices">Save Prices &amp; Stock</AButton>
        </div>
        <p v-if="saveError" class="mt-2 text-xs text-dash-danger">{{ saveError }}</p>
      </div>

    </template>

    <!-- Confirm regenerate modal -->
    <AConfirmDialog
      :open="showRegenerateConfirm"
      title="Regenerate variants?"
      :message="`This will permanently delete ${variants.length} existing variant${variants.length !== 1 ? 's' : ''} and regenerate from your current spec values. Continue?`"
      :loading="generating"
      @confirm="doGenerate(true)"
      @cancel="showRegenerateConfirm = false"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { ImagePlus, ImageOff, Star, X, ChevronUp, ChevronDown, Zap, Check } from 'lucide-vue-next'
import {
  apiGetVariants, apiUpdateVariant, apiDeleteVariant, apiSetDefaultVariant,
  apiBulkUpdateVariants,
  apiGetImages, apiUploadImages, apiSetThumbnail, apiDeleteImage,
  apiGetSpecTypes, apiGetProductSpecs, apiSaveProductSpecs, apiGenerateVariants,
} from '../api/admin'
import type { ProductVariant, ProductImage, SpecType, ProductSpec } from '../types'
import ABadge         from '../components/ui/ABadge.vue'
import AButton        from '../components/ui/AButton.vue'
import AInput         from '../components/ui/AInput.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'

const props     = defineProps<{ id: string }>()
const productId = Number(props.id)

// ── Page-level error ──────────────────────────────────────────────────
const pageError = ref<string | null>(null)

// ── Images ────────────────────────────────────────────────────────────
const images        = ref<ProductImage[]>([])
const imagesLoading = ref(true)
const uploading     = ref(false)
const imagesExpanded = ref(true)

async function loadImages() {
  imagesLoading.value = true
  try {
    const res = await apiGetImages(productId)
    images.value = res.data
  } catch { /* empty state */ } finally {
    imagesLoading.value = false
  }
}

async function handleUpload(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  if (!files.length) return
  uploading.value = true
  try {
    const res = await apiUploadImages(productId, files)
    images.value = [...images.value, ...res.data]
    if (images.value.length === res.data.length) {
      images.value[0] = { ...images.value[0], isThumbnail: true }
    }
  } catch (e: unknown) {
    pageError.value = (e as any)?.response?.data?.message ?? 'Upload failed.'
  } finally {
    uploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function setThumbnail(img: ProductImage) {
  if (img.isThumbnail) return
  try {
    await apiSetThumbnail(productId, img.id)
    images.value = images.value.map(i => ({ ...i, isThumbnail: i.id === img.id }))
  } catch { /* ignore */ }
}

async function deleteImage(img: ProductImage) {
  try {
    await apiDeleteImage(productId, img.id)
    images.value = images.value.filter(i => i.id !== img.id)
    if (img.isThumbnail && images.value.length) {
      images.value[0] = { ...images.value[0], isThumbnail: true }
    }
  } catch { /* ignore */ }
}

// ── Variants ──────────────────────────────────────────────────────────
const variants = ref<ProductVariant[]>([])

const hasVariants = computed(() => variants.value.length > 0)
const hasSpecs    = computed(() => assignedSpecs.value.some(s => s.values.length > 0) || (hasVariants.value && variants.value[0]?.specs?.length > 0))

async function loadVariants() {
  try {
    const res = await apiGetVariants(productId)
    variants.value = res.data
    if (res.data.length > 0) {
      buildPriceRows(res.data)
      imagesExpanded.value = false
    }
  } catch (e: unknown) {
    pageError.value = (e as any)?.response?.data?.message ?? 'Failed to load variants.'
  }
}

function variantLabel(variantId: number): string {
  const v = variants.value.find(x => x.id === variantId)
  if (!v || !v.specs || v.specs.length === 0) return 'Default'
  return v.specs.map(s => s.unit ? `${s.value}${s.unit}` : s.value).join(' / ')
}

// ── Specs ─────────────────────────────────────────────────────────────
const allSpecTypes  = ref<SpecType[]>([])
const assignedSpecs = ref<Array<{ spec_type_id: number; name: string; unit: string | null; values: string[] }>>([])
const specToAdd     = ref<number | ''>('')
const valueInputs   = ref<Record<number, string>>({})

const availableSpecTypes = computed(() =>
  allSpecTypes.value.filter(s => !assignedSpecs.value.some(a => a.spec_type_id === s.id))
)

const combinationCount = computed(() => {
  if (!assignedSpecs.value.length) return 1
  return assignedSpecs.value.reduce((acc, s) => acc * Math.max(s.values.length, 1), 1)
})

const specsValid = computed(() =>
  assignedSpecs.value.length > 0 && assignedSpecs.value.every(s => s.values.length > 0)
)

async function loadSpecs() {
  try {
    const [typesRes, specsRes] = await Promise.all([
      apiGetSpecTypes(),
      apiGetProductSpecs(productId),
    ])
    allSpecTypes.value = typesRes.data
    assignedSpecs.value = specsRes.data.specs.map((s: ProductSpec) => ({
      spec_type_id: s.spec_type_id,
      name:         s.name,
      unit:         s.unit,
      values:       s.values.map(v => v.value),
    }))
    assignedSpecs.value.forEach(s => { valueInputs.value[s.spec_type_id] = '' })
  } catch (e: unknown) {
    pageError.value = (e as any)?.response?.data?.message ?? 'Failed to load specs.'
  }
}

function addSpec() {
  if (!specToAdd.value) return
  const spec = allSpecTypes.value.find(s => s.id === specToAdd.value)
  if (!spec) return
  assignedSpecs.value.push({ spec_type_id: spec.id, name: spec.name, unit: spec.unit, values: [] })
  valueInputs.value[spec.id] = ''
  specToAdd.value = ''
}

function removeSpec(idx: number) {
  const removed = assignedSpecs.value[idx]
  delete valueInputs.value[removed.spec_type_id]
  assignedSpecs.value.splice(idx, 1)
}

function moveSpec(idx: number, dir: -1 | 1) {
  const arr = assignedSpecs.value
  const to  = idx + dir
  if (to < 0 || to >= arr.length) return
  ;[arr[idx], arr[to]] = [arr[to], arr[idx]]
}

function addValue(spec: { spec_type_id: number; values: string[] }) {
  const val = (valueInputs.value[spec.spec_type_id] ?? '').trim()
  if (!val || spec.values.includes(val)) return
  spec.values.push(val)
  valueInputs.value[spec.spec_type_id] = ''
}

function removeValue(spec: { values: string[] }, idx: number) {
  spec.values.splice(idx, 1)
}

// ── Wizard state ──────────────────────────────────────────────────────
const currentStep       = ref<1 | 2 | 3>(1)
const productType       = ref<'single' | 'multi' | null>(null)
const generatingSingle  = ref(false)
const generating        = ref(false)
const showRegenerateConfirm = ref(false)
const editSpecsExpanded = ref(false)

function stepClass(n: number): string {
  if (currentStep.value > n) return 'border-emerald-500/30 bg-emerald-900/20'
  if (currentStep.value === n) return 'border-dash-primary/40 bg-dash-primary-lt/20'
  return 'border-dash-border opacity-40'
}

function stepNumClass(n: number): string {
  if (currentStep.value > n) return 'bg-emerald-500 text-white'
  if (currentStep.value === n) return 'bg-dash-primary text-white'
  return 'bg-dash-border text-dash-muted'
}

async function handleStep1Continue() {
  if (!productType.value) return
  imagesExpanded.value = false

  if (productType.value === 'single') {
    // Generate one default variant immediately (no specs)
    generatingSingle.value = true
    pageError.value = null
    try {
      const res = await apiGenerateVariants(productId, false)
      variants.value = res.data
      buildPriceRows(res.data)
      currentStep.value = 3
    } catch (e: unknown) {
      pageError.value = (e as any)?.response?.data?.message ?? 'Failed to create variant.'
    } finally {
      generatingSingle.value = false
    }
  } else {
    currentStep.value = 2
  }
}

function handleGenerate(isRegenerate: boolean) {
  // If regenerating from editing mode and variants exist, always confirm
  if (isRegenerate && variants.value.length > 0) {
    showRegenerateConfirm.value = true
    return
  }
  // Wizard: if variants already exist somehow (edge case), confirm
  if (!isRegenerate && variants.value.length > 0) {
    showRegenerateConfirm.value = true
    return
  }
  doGenerate(false)
}

async function doGenerate(force: boolean) {
  generating.value = true
  showRegenerateConfirm.value = false
  pageError.value = null
  try {
    await apiSaveProductSpecs(
      productId,
      assignedSpecs.value.map(s => ({ spec_type_id: s.spec_type_id, values: s.values }))
    )
    const res = await apiGenerateVariants(productId, force)
    variants.value = res.data
    buildPriceRows(res.data)
    editSpecsExpanded.value = false
    if (!hasVariants.value) currentStep.value = 3 // wizard path
  } catch (e: unknown) {
    pageError.value = (e as any)?.response?.data?.message ?? 'Generation failed.'
  } finally {
    generating.value = false
  }
}

function switchToMultiple() {
  // Reset wizard to step 1 with multi pre-selected
  variants.value  = []
  priceRows.value = []
  productType.value = 'multi'
  currentStep.value = 1
  imagesExpanded.value = false
}

// ── Price rows ────────────────────────────────────────────────────────
interface PriceRow {
  id:                  number
  price:               string
  originalPrice:       string
  quantity:            string
  lowStockThreshold:   string
}
const priceRows      = ref<PriceRow[]>([])
const priceRowErrors = ref<Array<{ price?: string }>>([])
const savingPrices   = ref(false)
const saveError      = ref<string | null>(null)

function buildPriceRows(vs: ProductVariant[]) {
  priceRows.value = vs.map(v => ({
    id:                String(v.id) as unknown as number,  // keep numeric
    price:             String(v.price),
    originalPrice:     v.originalPrice != null ? String(v.originalPrice) : '',
    quantity:          String(v.quantity),
    lowStockThreshold: String(v.lowStockThreshold),
  }))
  // Store id as number
  priceRows.value = vs.map(v => ({
    id:                v.id,
    price:             String(v.price),
    originalPrice:     v.originalPrice != null ? String(v.originalPrice) : '',
    quantity:          String(v.quantity),
    lowStockThreshold: String(v.lowStockThreshold),
  }))
  priceRowErrors.value = vs.map(() => ({}))
}

const overallStockPreview = computed(() => {
  if (!priceRows.value.length) return 'out_of_stock'
  const statuses = priceRows.value.map(r => {
    const qty       = Number(r.quantity) || 0
    const threshold = Number(r.lowStockThreshold) || 5
    if (qty === 0)        return 'out_of_stock'
    if (qty <= threshold) return 'low_stock'
    return 'in_stock'
  })
  if (statuses.every(s => s === 'out_of_stock')) return 'out_of_stock'
  if (statuses.some(s => s === 'in_stock'))      return 'in_stock'
  return 'low_stock'
})

async function savePrices() {
  // Validate
  priceRowErrors.value = priceRows.value.map(r => ({
    price: !r.price ? 'Required' : undefined,
  }))
  if (priceRowErrors.value.some(e => e.price)) return

  savingPrices.value = true
  saveError.value    = null
  try {
    const res = await apiBulkUpdateVariants(productId, priceRows.value.map(r => ({
      id:                  r.id,
      price:               Number(r.price),
      original_price:      r.originalPrice ? Number(r.originalPrice) : null,
      quantity:            Number(r.quantity),
      low_stock_threshold: Number(r.lowStockThreshold),
    })))
    variants.value = res.data
    buildPriceRows(res.data)
  } catch (e: unknown) {
    saveError.value = (e as any)?.response?.data?.message ?? 'Save failed.'
  } finally {
    savingPrices.value = false
  }
}

// ── Default variant ───────────────────────────────────────────────────
async function setDefault(variantId: number) {
  try {
    await apiSetDefaultVariant(productId, variantId)
    variants.value = variants.value.map(v => ({ ...v, isDefault: v.id === variantId }))
  } catch (e: unknown) {
    pageError.value = (e as any)?.response?.data?.message ?? 'Failed to set default.'
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────
onMounted(() => { loadImages(); loadSpecs(); loadVariants() })
watch(() => props.id, () => { loadImages(); loadSpecs(); loadVariants() })
</script>
```

- [x] **Step 2: Verify TypeScript compiles**

```bash
cd aroma-admin && npx tsc --noEmit
```

Expected: No errors.

- [x] **Step 3: Start the dev server and test the wizard flow**

```bash
cd aroma-admin && npm run dev
```

**Test scenario A — new product, multi-variant:**
1. Go to a product that has no variants yet → confirm Step 1 shows with the two radio options
2. Select "Multiple variants" → click Continue → confirm Step 2 appears with step indicators
3. Add "Size" spec type → add values "30", "50", "100" → confirm chips appear
4. Confirm the combination preview shows "Will generate 3 variants"
5. Click "Generate Variants" → confirm Step 3 appears with 3 rows in the price table
6. Fill in prices → click "Save Prices & Stock" → confirm the data persists (refresh the page — should show editing mode with the price grid)

**Test scenario B — new product, single:**
1. Go to a product with no variants → select "Single price & stock" → click Continue
2. Confirm the 2×2 price form appears → fill price/qty → click Save
3. Refresh → confirm editing mode shows the single-row price grid

**Test scenario C — returning to a product with specs:**
1. Refresh the page from scenario A → confirm no wizard shown, price grid shown directly
2. Confirm the specs summary card shows the spec names/values
3. Click "Edit Specs" → confirm spec editor expands → make a change → click "Regenerate Variants" → confirm confirmation modal → confirm → grid refreshes

**Test scenario D — returning single-variant:**
1. Refresh from scenario B → confirm price grid shows (2×2 form)
2. Confirm "Switch to multiple variants" link is present below
3. Click it → confirm wizard resets to Step 1 with "Multiple variants" pre-selected

- [x] **Step 4: Commit**

```bash
cd aroma-admin
git add src/views/ProductVariantsView.vue
git commit -m "feat: rewrite ProductVariantsView as guided 3-step wizard with inline price grid"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered in |
|-----------------|------------|
| Remove specs from create page | Task 3 |
| Step 1: single vs multi choice | Task 4 — wizard Step 1 |
| Single path: generate immediately on Continue | Task 4 — `handleStep1Continue` |
| Step 2: spec editor + one Generate button | Task 4 — wizard Step 2 |
| Step 3: inline price grid (multi) | Task 4 — price table |
| Step 3: 2×2 grid (single) | Task 4 — single grid |
| Bulk save endpoint | Task 1 |
| `apiBulkUpdateVariants` | Task 2 |
| Returning state: no wizard | Task 4 — `hasVariants` computed → editing mode template |
| Specs summary card + Edit Specs expand | Task 4 — editing mode, `editSpecsExpanded` |
| Single-variant returning: no Specs card + Switch link | Task 4 — `v-if="!hasSpecs"` |
| Default badge + set default | Task 4 — `setDefault()` |
| Confirmation modal before regenerate | Task 4 — `showRegenerateConfirm` |
| Images card collapsible | Task 4 — `imagesExpanded` |
| Error handling: empty price | Task 4 — `priceRowErrors` validation |
| Error handling: bulk save failure | Task 4 — `saveError` banner |
| Remove "Add Variant" button/modal | Task 4 — not present in new template |

All spec requirements are covered.
