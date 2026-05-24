# Brands Admin Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add server-side filters to the brands list, a brand detail page with a full paginated product table, and auto-generated slug from the English name on brand creation.

**Architecture:** Backend gains filter params on `AdminBrandController@index`, a new `show()` endpoint, and a route entry. Frontend gets updated API calls, filter inputs in `BrandsView`, a new `BrandDetailView`, and computed slug generation replacing the manual ID field.

**Tech Stack:** Laravel 11 (PHP), PHPUnit, Vue 3 Composition API, TypeScript, Tailwind CSS, Lucide Vue icons.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `aroma-api/app/Models/Brand.php` | Modify | Add `name_en` to `$fillable` |
| `aroma-api/app/Models/Product.php` | Modify | Add `name_en` to `$fillable` (it was missing; edit modal sends it) |
| `aroma-api/database/factories/BrandFactory.php` | Create | Test data factory for Brand model |
| `aroma-api/tests/Feature/AdminBrandTest.php` | Create | PHPUnit feature tests for brand API filters and show |
| `aroma-api/app/Http/Controllers/Api/Admin/AdminBrandController.php` | Modify | Add filter logic to `index()`, add `show()` |
| `aroma-api/routes/api.php` | Modify | Register `GET /admin/brands/{id}` route |
| `aroma-admin/src/api/admin.ts` | Modify | Add optional params to `apiGetBrands()`, add `apiGetBrand()` |
| `aroma-admin/src/views/BrandsView.vue` | Modify | Filter bar, name cell as RouterLink, slug auto-gen (remove manual ID input) |
| `aroma-admin/src/views/BrandDetailView.vue` | Create | Brand header + full paginated product table |
| `aroma-admin/src/router/index.ts` | Modify | Add `/brands/:id` route |

---

## Task 1: Fix model `$fillable` arrays

**Files:**
- Modify: `aroma-api/app/Models/Brand.php`
- Modify: `aroma-api/app/Models/Product.php`

- [x] **Step 1: Add `name_en` to Brand `$fillable`**

Open `aroma-api/app/Models/Brand.php`. Replace:
```php
protected $fillable = ['id', 'name', 'origin', 'tagline', 'bg'];
```
With:
```php
protected $fillable = ['id', 'name', 'name_en', 'origin', 'tagline', 'bg'];
```

- [x] **Step 2: Add `name_en` to Product `$fillable`**

Open `aroma-api/app/Models/Product.php`. Replace:
```php
protected $fillable = [
    'slug', 'brand_id', 'category_id', 'name', 'description', 'type',
    'rating', 'reviews_count', 'is_new', 'is_bestseller', 'is_offer',
    'placeholder_bg', 'placeholder_dot',
];
```
With:
```php
protected $fillable = [
    'slug', 'brand_id', 'category_id', 'name', 'name_en', 'description', 'type',
    'rating', 'reviews_count', 'is_new', 'is_bestseller', 'is_offer',
    'placeholder_bg', 'placeholder_dot',
];
```

- [x] **Step 3: Commit**

```bash
git add aroma-api/app/Models/Brand.php aroma-api/app/Models/Product.php
git commit -m "fix: add name_en to Brand and Product fillable arrays"
```

---

## Task 2: Create BrandFactory

**Files:**
- Create: `aroma-api/database/factories/BrandFactory.php`

- [x] **Step 1: Create the factory file**

Create `aroma-api/database/factories/BrandFactory.php` with this content:

```php
<?php

namespace Database\Factories;

use App\Models\Brand;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class BrandFactory extends Factory
{
    protected $model = Brand::class;

    public function definition(): array
    {
        $nameEn = fake()->words(2, true);
        return [
            'id'      => Str::slug($nameEn) . '-' . fake()->unique()->numberBetween(1, 9999),
            'name'    => fake()->words(2, true),
            'name_en' => $nameEn,
            'origin'  => fake()->country(),
            'tagline' => fake()->sentence(4),
            'bg'      => fake()->hexColor(),
        ];
    }
}
```

- [x] **Step 2: Add `HasFactory` trait to Brand model**

Open `aroma-api/app/Models/Brand.php`. The full file should be:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Brand extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = ['id', 'name', 'name_en', 'origin', 'tagline', 'bg'];

    public function products()
    {
        return $this->hasMany(Product::class, 'brand_id', 'id');
    }
}
```

- [x] **Step 3: Commit**

```bash
git add aroma-api/database/factories/BrandFactory.php aroma-api/app/Models/Brand.php
git commit -m "feat: add BrandFactory and HasFactory trait to Brand model"
```

---

## Task 3: TDD — Brand API filters and show endpoint

**Files:**
- Create: `aroma-api/tests/Feature/AdminBrandTest.php`
- Modify: `aroma-api/app/Http/Controllers/Api/Admin/AdminBrandController.php`
- Modify: `aroma-api/routes/api.php`

- [x] **Step 1: Write the failing tests**

Create `aroma-api/tests/Feature/AdminBrandTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminBrandTest extends TestCase
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

    public function test_index_returns_all_brands_with_no_filters(): void
    {
        Brand::factory()->count(3)->create();

        $this->asAdmin()->getJson('/api/admin/brands')
            ->assertOk()
            ->assertJsonCount(3);
    }

    public function test_filters_brands_by_arabic_name(): void
    {
        Brand::factory()->create(['name' => 'شانيل', 'id' => 'chanel', 'name_en' => 'Chanel']);
        Brand::factory()->create(['name' => 'ديور',  'id' => 'dior',   'name_en' => 'Dior']);

        $this->asAdmin()->getJson('/api/admin/brands?name=' . urlencode('شانيل'))
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', 'chanel');
    }

    public function test_filters_brands_by_english_name(): void
    {
        Brand::factory()->create(['name' => 'شانيل', 'id' => 'chanel', 'name_en' => 'Chanel']);
        Brand::factory()->create(['name' => 'ديور',  'id' => 'dior',   'name_en' => 'Dior']);

        $this->asAdmin()->getJson('/api/admin/brands?name=Chanel')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', 'chanel');
    }

    public function test_filters_brands_by_origin(): void
    {
        Brand::factory()->create(['id' => 'chanel', 'origin' => 'France']);
        Brand::factory()->create(['id' => 'gucci',  'origin' => 'Italy']);

        $this->asAdmin()->getJson('/api/admin/brands?origin=France')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', 'chanel');
    }

    public function test_filters_brands_by_tagline(): void
    {
        Brand::factory()->create(['id' => 'brand-a', 'tagline' => 'Life is Beautiful']);
        Brand::factory()->create(['id' => 'brand-b', 'tagline' => 'Just Do It']);

        $this->asAdmin()->getJson('/api/admin/brands?tagline=Beautiful')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', 'brand-a');
    }

    public function test_min_products_one_excludes_brands_with_no_products(): void
    {
        Brand::factory()->count(2)->create();

        // No products exist, so no brand has >= 1 product
        $this->asAdmin()->getJson('/api/admin/brands?min_products=1')
            ->assertOk()
            ->assertJsonCount(0);
    }

    public function test_min_products_zero_returns_all_brands(): void
    {
        Brand::factory()->count(2)->create();

        $this->asAdmin()->getJson('/api/admin/brands?min_products=0')
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_max_products_zero_returns_brands_with_no_products(): void
    {
        Brand::factory()->count(2)->create();

        // All brands have 0 products, so all satisfy <= 0
        $this->asAdmin()->getJson('/api/admin/brands?max_products=0')
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_show_returns_brand(): void
    {
        $brand = Brand::factory()->create();

        $this->asAdmin()->getJson("/api/admin/brands/{$brand->id}")
            ->assertOk()
            ->assertJsonPath('id', $brand->id)
            ->assertJsonPath('name', $brand->name)
            ->assertJsonStructure(['id', 'name', 'nameEn', 'origin', 'tagline', 'bg', 'productCount']);
    }

    public function test_show_returns_404_for_nonexistent_brand(): void
    {
        $this->asAdmin()->getJson('/api/admin/brands/nonexistent')
            ->assertNotFound();
    }
}
```

- [x] **Step 2: Run tests — confirm they all fail**

Run from `aroma-api/`:
```bash
php artisan test tests/Feature/AdminBrandTest.php
```

Expected: all tests fail. The `show` tests fail with 404 (route doesn't exist). The filter tests fail because the current `index()` ignores query params but may still pass for the "no filters" test — the filter tests that expect 1 result while 2 exist will fail.

- [x] **Step 3: Implement filters + `show()` in AdminBrandController**

Replace the entire contents of `aroma-api/app/Http/Controllers/Api/Admin/AdminBrandController.php`:

```php
<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\Request;

class AdminBrandController extends Controller
{
    public function index(Request $request)
    {
        $query = Brand::withCount('products');

        if ($request->filled('name')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->name . '%')
                  ->orWhere('name_en', 'like', '%' . $request->name . '%');
            });
        }

        if ($request->filled('origin')) {
            $query->where('origin', 'like', '%' . $request->origin . '%');
        }

        if ($request->filled('tagline')) {
            $query->where('tagline', 'like', '%' . $request->tagline . '%');
        }

        if ($request->filled('min_products')) {
            $query->whereRaw(
                '(SELECT COUNT(*) FROM products WHERE products.brand_id = brands.id) >= ?',
                [(int) $request->min_products]
            );
        }

        if ($request->filled('max_products')) {
            $query->whereRaw(
                '(SELECT COUNT(*) FROM products WHERE products.brand_id = brands.id) <= ?',
                [(int) $request->max_products]
            );
        }

        $brands = $query->orderBy('name')->get();

        return response()->json($brands->map(fn ($b) => [
            'id'           => $b->id,
            'name'         => $b->name,
            'nameEn'       => $b->name_en,
            'origin'       => $b->origin,
            'tagline'      => $b->tagline,
            'bg'           => $b->bg,
            'productCount' => $b->products_count,
        ]));
    }

    public function show(string $id)
    {
        $brand = Brand::withCount('products')->findOrFail($id);

        return response()->json([
            'id'           => $brand->id,
            'name'         => $brand->name,
            'nameEn'       => $brand->name_en,
            'origin'       => $brand->origin,
            'tagline'      => $brand->tagline,
            'bg'           => $brand->bg,
            'productCount' => $brand->products_count,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id'       => 'required|string|unique:brands,id',
            'name'     => 'required|string',
            'name_en'  => 'nullable|string',
            'origin'   => 'nullable|string',
            'tagline'  => 'nullable|string',
            'bg'       => 'required|string',
        ]);
        $brand = Brand::create($data);
        return response()->json(['id' => $brand->id], 201);
    }

    public function update(Request $request, string $id)
    {
        $brand = Brand::findOrFail($id);
        $data  = $request->validate([
            'name'    => 'sometimes|string',
            'name_en' => 'nullable|string',
            'origin'  => 'nullable|string',
            'tagline' => 'nullable|string',
            'bg'      => 'sometimes|string',
        ]);
        $brand->update($data);
        return response()->json(['id' => $brand->id]);
    }

    public function destroy(string $id)
    {
        $brand = Brand::withCount('products')->findOrFail($id);

        if ($brand->products_count > 0) {
            return response()->json([
                'message' => "Cannot delete brand with {$brand->products_count} product(s). Reassign or delete products first.",
            ], 422);
        }

        $brand->delete();
        return response()->json(null, 204);
    }
}
```

- [x] **Step 4: Register the `show` route**

Open `aroma-api/routes/api.php`. Find the admin brands section and add the `show` route:

```php
Route::get('/brands', [AdminBrandController::class, 'index']);
Route::post('/brands', [AdminBrandController::class, 'store']);
Route::get('/brands/{id}', [AdminBrandController::class, 'show']);       // ← add this line
Route::put('/brands/{id}', [AdminBrandController::class, 'update']);
Route::delete('/brands/{id}', [AdminBrandController::class, 'destroy']);
```

- [x] **Step 5: Run tests — confirm they all pass**

```bash
php artisan test tests/Feature/AdminBrandTest.php
```

Expected output: `9 tests, 9 assertions` — all green.

- [x] **Step 6: Commit**

```bash
git add aroma-api/tests/Feature/AdminBrandTest.php \
        aroma-api/app/Http/Controllers/Api/Admin/AdminBrandController.php \
        aroma-api/routes/api.php
git commit -m "feat: add brand list filters and show endpoint to admin API"
```

---

## Task 4: Update frontend API layer

**Files:**
- Modify: `aroma-admin/src/api/admin.ts`

- [x] **Step 1: Update `apiGetBrands` and add `apiGetBrand`**

In `aroma-admin/src/api/admin.ts`, replace the brands section:

```typescript
// ── Brands ────────────────────────────────────────────────────────────
export const apiGetBrands = (params?: {
  name?:         string
  origin?:       string
  tagline?:      string
  min_products?: number
  max_products?: number
}) =>
  client.get<AdminBrand[]>('/admin/brands', { params })

export const apiGetBrand = (id: string) =>
  client.get<AdminBrand>(`/admin/brands/${id}`)

export const apiCreateBrand = (data: Record<string, unknown>) =>
  client.post<{ id: string }>('/admin/brands', data)

export const apiUpdateBrand = (id: string, data: Record<string, unknown>) =>
  client.put<{ id: string }>(`/admin/brands/${id}`, data)

export const apiDeleteBrand = (id: string) =>
  client.delete(`/admin/brands/${id}`)
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/api/admin.ts
git commit -m "feat: add filter params to apiGetBrands and add apiGetBrand"
```

---

## Task 5: Update BrandsView — filters, RouterLink, slug auto-gen

**Files:**
- Modify: `aroma-admin/src/views/BrandsView.vue`

- [x] **Step 1: Replace BrandsView.vue with the updated version**

Replace the full contents of `aroma-admin/src/views/BrandsView.vue`:

```vue
<!-- aroma-admin/src/views/BrandsView.vue -->
<template>
  <div class="space-y-4">
    <div v-if="loadError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ loadError }}
    </div>

    <div class="flex justify-end">
      <AButton size="sm" @click="openCreate"><Plus :size="14" /> Add Brand</AButton>
    </div>

    <!-- Filters -->
    <div class="space-y-3">
      <div class="grid grid-cols-3 gap-3">
        <AInput v-model="filterName"    label="Name"    placeholder="Search AR / EN…"  @input="debouncedLoad" />
        <AInput v-model="filterOrigin"  label="Origin"  placeholder="e.g. France"      @input="debouncedLoad" />
        <AInput v-model="filterTagline" label="Tagline" placeholder="Keyword…"         @input="debouncedLoad" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <AInput v-model="filterMinProducts" label="Min Products" type="number" placeholder="0"   @input="debouncedLoad" />
        <AInput v-model="filterMaxProducts" label="Max Products" type="number" placeholder="Any" @input="debouncedLoad" />
      </div>
    </div>

    <ATable :columns="cols" :rows="brands" :loading="loading">
      <template #cell-name="{ row }">
        <RouterLink
          :to="`/brands/${(row as AdminBrand).id}`"
          class="group block"
        >
          <p class="font-medium text-xs group-hover:text-dash-primary transition-colors">{{ (row as AdminBrand).name }}</p>
          <p v-if="(row as AdminBrand).nameEn" class="text-[10px] text-dash-faint">{{ (row as AdminBrand).nameEn }}</p>
        </RouterLink>
      </template>
      <template #cell-id="{ value }">
        <span class="font-mono text-[10px] text-dash-faint">{{ value }}</span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-1.5 justify-end">
          <AButton size="sm" variant="ghost" @click.stop="openEdit(row as AdminBrand)">Edit</AButton>
          <AButton size="sm" variant="danger" @click.stop="confirmDelete(row as AdminBrand)">Delete</AButton>
        </div>
      </template>
      <template #empty>
        <AEmptyState :icon="Tag" heading="No brands found" />
      </template>
    </ATable>

    <AModal :open="modalOpen" :title="editing ? 'Edit Brand' : 'Add Brand'" @close="modalOpen = false">
      <form class="space-y-3" @submit.prevent>
        <div class="grid grid-cols-2 gap-3">
          <AInput v-model="form.name"    label="Name (Arabic)"  :error="formErrors.name"    dir="rtl" />
          <AInput v-model="form.name_en" label="Name (English)" :error="formErrors.name_en" />
        </div>

        <!-- Slug preview — only shown when creating -->
        <div
          v-if="!editing"
          class="flex items-center gap-2 rounded-btn bg-dash-bg border border-dash-border px-3 py-2"
        >
          <Link2 :size="12" class="text-dash-faint shrink-0" />
          <span class="text-2xs text-dash-muted">Brand ID:</span>
          <span
            v-if="generatedSlug"
            class="text-2xs font-medium text-dash-text font-mono"
          >{{ generatedSlug }}</span>
          <span v-else class="text-2xs text-dash-faint italic">type English name above…</span>
        </div>

        <AInput v-model="form.origin"  label="Country of origin" />
        <AInput v-model="form.tagline" label="Tagline" />
        <AInput v-model="form.bg"      label="Background colour" placeholder="#F4EFE8" :error="formErrors.bg" />
        <p v-if="formErrors.general" class="text-xs text-dash-danger">{{ formErrors.general }}</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="modalOpen = false">Cancel</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">{{ editing ? 'Save' : 'Add' }}</AButton>
      </template>
    </AModal>

    <AConfirmDialog
      :open="!!deletingBrand"
      title="Delete brand?"
      :message="deletingBrand?.productCount
        ? `This brand has ${deletingBrand.productCount} products. Reassign them first.`
        : `Delete &quot;${deletingBrand?.name}&quot;? This cannot be undone.`"
      confirm-label="Delete"
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="deletingBrand = null"
    />
    <div v-if="deleteError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ deleteError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Plus, Tag, Link2 } from 'lucide-vue-next'
import { apiGetBrands, apiCreateBrand, apiUpdateBrand, apiDeleteBrand } from '../api/admin'
import type { AdminBrand } from '../types'
import ATable         from '../components/ui/ATable.vue'
import AButton        from '../components/ui/AButton.vue'
import AInput         from '../components/ui/AInput.vue'
import AModal         from '../components/ui/AModal.vue'
import AEmptyState    from '../components/ui/AEmptyState.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'

// ── Filter state ──────────────────────────────────────────────────────
const filterName        = ref('')
const filterOrigin      = ref('')
const filterTagline     = ref('')
const filterMinProducts = ref('')
const filterMaxProducts = ref('')

// ── List state ────────────────────────────────────────────────────────
const brands      = ref<AdminBrand[]>([])
const loading     = ref(true)
const loadError   = ref<string | null>(null)

// ── Modal state ───────────────────────────────────────────────────────
const modalOpen    = ref(false)
const editing      = ref<AdminBrand | null>(null)
const saving       = ref(false)
const deletingBrand= ref<AdminBrand | null>(null)
const deleting     = ref(false)
const deleteError  = ref<string | null>(null)
const formErrors   = ref<Record<string, string>>({})

const emptyForm = () => ({ name: '', name_en: '', origin: '', tagline: '', bg: '' })
const form = ref(emptyForm())

// Derive slug from English name: "Jo Malone" → "jo-malone"
const generatedSlug = computed(() =>
  form.value.name_en.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
)

const cols = [
  { key: 'id',           label: 'ID' },
  { key: 'name',         label: 'Name' },
  { key: 'origin',       label: 'Origin' },
  { key: 'tagline',      label: 'Tagline' },
  { key: 'productCount', label: 'Products' },
]

// ── Data fetching ─────────────────────────────────────────────────────
async function loadBrands() {
  loading.value  = true
  loadError.value = null
  try {
    brands.value = (await apiGetBrands({
      name:         filterName.value        || undefined,
      origin:       filterOrigin.value      || undefined,
      tagline:      filterTagline.value     || undefined,
      min_products: filterMinProducts.value ? Number(filterMinProducts.value) : undefined,
      max_products: filterMaxProducts.value ? Number(filterMaxProducts.value) : undefined,
    })).data
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load brands.'
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => loadBrands(), 350)
}

// ── Modal helpers ─────────────────────────────────────────────────────
function openCreate() {
  editing.value = null
  form.value = emptyForm()
  formErrors.value = {}
  modalOpen.value = true
}

function openEdit(b: AdminBrand) {
  editing.value = b
  form.value = { name: b.name, name_en: b.nameEn ?? '', origin: b.origin ?? '', tagline: b.tagline ?? '', bg: b.bg }
  formErrors.value = {}
  modalOpen.value = true
}

async function handleSave() {
  formErrors.value = {}
  if (!form.value.name) { formErrors.value.name = 'Name is required'; return }
  if (!form.value.bg)   { formErrors.value.bg   = 'Colour is required'; return }
  if (!editing.value && !generatedSlug.value) {
    formErrors.value.name_en = 'English name required to generate the brand ID'
    return
  }

  saving.value = true
  try {
    editing.value
      ? await apiUpdateBrand(editing.value.id, form.value)
      : await apiCreateBrand({ id: generatedSlug.value, ...form.value })
    modalOpen.value = false
    loadBrands()
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : 'Save failed.'
  } finally {
    saving.value = false
  }
}

function confirmDelete(b: AdminBrand) { deletingBrand.value = b }

async function handleDelete() {
  if (!deletingBrand.value) return
  deleteError.value = null
  deleting.value = true
  try {
    await apiDeleteBrand(deletingBrand.value.id)
    deletingBrand.value = null
    loadBrands()
  } catch (e: unknown) {
    deleteError.value = e instanceof Error ? e.message : 'Delete failed.'
    deletingBrand.value = null
  } finally {
    deleting.value = false
  }
}

onMounted(loadBrands)
onUnmounted(() => clearTimeout(debounceTimer))
</script>
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/views/BrandsView.vue
git commit -m "feat: add brand list filters, RouterLink on name, and auto-generated slug"
```

---

## Task 6: Create BrandDetailView

**Files:**
- Create: `aroma-admin/src/views/BrandDetailView.vue`

- [x] **Step 1: Create the file**

Create `aroma-admin/src/views/BrandDetailView.vue` with this content:

```vue
<!-- aroma-admin/src/views/BrandDetailView.vue -->
<template>
  <div class="space-y-4">

    <!-- Brand load error -->
    <div v-if="brandError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ brandError }}
    </div>

    <!-- Brand header skeleton -->
    <div v-if="brandLoading" class="flex items-center gap-4">
      <div class="h-10 w-10 rounded-btn bg-dash-border animate-pulse shrink-0" />
      <div class="space-y-2">
        <div class="h-4 w-40 rounded bg-dash-border animate-pulse" />
        <div class="h-3 w-24 rounded bg-dash-border animate-pulse" />
      </div>
    </div>

    <!-- Brand header -->
    <div v-else-if="brand" class="flex items-start justify-between gap-6 flex-wrap">
      <div class="flex items-center gap-4">
        <div
          class="h-10 w-10 rounded-btn shrink-0 border border-dash-border"
          :style="{ backgroundColor: brand.bg }"
        />
        <div>
          <RouterLink
            to="/brands"
            class="inline-flex items-center gap-1 text-xs text-dash-faint hover:text-dash-muted transition-colors mb-1"
          >
            <ArrowLeft :size="12" />
            Brands
          </RouterLink>
          <h2 class="text-xl font-semibold text-dash-text tracking-tight leading-none">{{ brand.name }}</h2>
          <p v-if="brand.nameEn" class="text-sm text-dash-muted mt-0.5">{{ brand.nameEn }}</p>
        </div>
      </div>
      <div class="flex items-center gap-6 text-xs">
        <div v-if="brand.origin">
          <p class="text-dash-faint mb-0.5">Origin</p>
          <p class="font-medium text-dash-text">{{ brand.origin }}</p>
        </div>
        <div>
          <p class="text-dash-faint mb-0.5">Products</p>
          <p class="font-medium text-dash-text">{{ brand.productCount }}</p>
        </div>
        <div>
          <p class="text-dash-faint mb-0.5">Colour</p>
          <div class="flex items-center gap-1.5">
            <div
              class="w-4 h-4 rounded border border-dash-border shrink-0"
              :style="{ backgroundColor: brand.bg }"
            />
            <span class="font-mono font-medium text-dash-text">{{ brand.bg }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Product filters -->
    <div class="space-y-3">
      <div class="grid grid-cols-3 gap-3">
        <AInput v-model="search"     label="Name"     placeholder="Search AR / EN…" @input="debouncedFetch" />
        <ASelect
          v-model="categoryId"
          label="Category"
          :options="[{ value: '', label: 'All categories' }, ...categoryOptions]"
          @update:modelValue="fetch(1)"
        />
        <ASelect
          v-model="filterType"
          label="Type"
          :options="typeFilterOptions"
          @update:modelValue="fetch(1)"
        />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <AInput v-model="priceMin" label="Price Min (LYD)" type="number" placeholder="0"   @input="debouncedFetch" />
        <AInput v-model="priceMax" label="Price Max (LYD)" type="number" placeholder="Any" @input="debouncedFetch" />
      </div>
    </div>

    <!-- Products table (no Brand column) -->
    <ATable :columns="cols" :rows="items" :loading="loading">
      <template #cell-name="{ row }">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 shrink-0 rounded-lg overflow-hidden bg-dash-border flex items-center justify-center">
            <img
              v-if="(row as AdminProduct).thumbnailUrl"
              :src="(row as AdminProduct).thumbnailUrl!"
              :alt="(row as AdminProduct).name"
              class="h-full w-full object-cover"
            />
            <ImageOff v-else :size="14" class="text-dash-faint" />
          </div>
          <div>
            <p class="font-medium text-dash-text text-xs">{{ (row as AdminProduct).name }}</p>
            <p v-if="(row as AdminProduct).nameEn" class="text-2xs text-dash-faint">{{ (row as AdminProduct).nameEn }}</p>
          </div>
        </div>
      </template>
      <template #cell-type="{ value }">
        <span class="text-[11px] rounded-full px-2 py-0.5 bg-dash-primary-lt text-dash-primary font-medium">{{ value }}</span>
      </template>
      <template #cell-price="{ value }">
        <span v-if="value">{{ Number(value).toFixed(2) }} LYD</span>
        <span v-else class="text-dash-faint">No variants</span>
      </template>
      <template #cell-isNew="{ value }">
        <span v-if="value" class="text-[10px] text-dash-secondary bg-dash-secondary-lt rounded-full px-2 py-0.5">New</span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-1.5 justify-end">
          <RouterLink :to="`/products/${(row as AdminProduct).id}/variants`">
            <AButton size="sm" variant="ghost">Variants ({{ (row as AdminProduct).variantCount }})</AButton>
          </RouterLink>
          <AButton size="sm" variant="ghost" @click.stop="openEdit(row as AdminProduct)">Edit</AButton>
          <AButton size="sm" variant="danger" @click.stop="confirmDelete(row as AdminProduct)">Delete</AButton>
        </div>
      </template>
      <template #empty>
        <AEmptyState :icon="Package" heading="No products for this brand" />
      </template>
    </ATable>

    <APagination :meta="meta" @change="changePage" />

    <!-- Edit modal -->
    <AModal :open="modalOpen" title="Edit Product" wide @close="modalOpen = false">
      <form class="space-y-4" @submit.prevent>

        <!-- Names -->
        <div>
          <p class="text-2xs font-semibold text-dash-muted uppercase tracking-wider mb-2.5">Product Name</p>
          <div class="grid grid-cols-2 gap-3">
            <AInput v-model="form.name"    label="Arabic Name"  :error="formErrors.name"  dir="rtl" />
            <AInput v-model="form.name_en" label="English Name" />
          </div>
        </div>

        <!-- Slug (read-only) -->
        <div class="flex items-center gap-2 rounded-btn bg-dash-bg border border-dash-border px-3 py-2">
          <Link2 :size="12" class="text-dash-faint shrink-0" />
          <span class="text-2xs text-dash-muted">aromashop.ly/products/</span>
          <span class="text-2xs font-medium text-dash-text font-mono">{{ form.slug }}</span>
          <span class="ml-auto text-2xs text-dash-faint">URL slug (fixed)</span>
        </div>

        <!-- Classification -->
        <div>
          <p class="text-2xs font-semibold text-dash-muted uppercase tracking-wider mb-2.5">Classification</p>
          <div class="grid grid-cols-3 gap-3">
            <ASelect v-model="form.brand_id"    label="Brand"    :options="brandOptions"    placeholder="Choose brand…"    :error="formErrors.brand_id" />
            <ASelect v-model="form.category_id" label="Category" :options="categoryOptions" placeholder="Choose category…" :error="formErrors.category_id" />
            <ASelect v-model="form.type"        label="Type"     :options="typeOptions"     placeholder="Choose type…"     :error="formErrors.type" />
          </div>
        </div>

        <!-- Description -->
        <ATextarea v-model="form.description" label="Description" placeholder="Optional product description…" rows="3" />

        <!-- Status flags -->
        <div>
          <p class="text-2xs font-semibold text-dash-muted uppercase tracking-wider mb-2.5">Status</p>
          <div class="flex gap-1.5">
            <label
              v-for="flag in flags"
              :key="flag.key"
              class="flex items-center gap-2 px-3 py-2 rounded-btn border cursor-pointer transition-all duration-150 text-xs font-medium"
              :class="form[flag.key]
                ? 'bg-dash-secondary/10 border-dash-secondary/30 text-dash-secondary'
                : 'bg-dash-bg border-dash-border text-dash-muted hover:border-dash-muted/60 hover:text-dash-text'"
            >
              <input type="checkbox" v-model="form[flag.key]" class="sr-only" />
              <Check v-if="form[flag.key]" :size="11" stroke-width="2.5" />
              {{ flag.label }}
            </label>
          </div>
        </div>

        <!-- Card color -->
        <div>
          <p class="text-2xs font-semibold text-dash-muted uppercase tracking-wider mb-2.5">Card Color</p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <p class="text-2xs text-dash-muted mb-1.5">Background</p>
              <div class="flex items-center gap-2">
                <div class="relative w-8 h-8 rounded-btn overflow-hidden border border-dash-border shrink-0">
                  <input type="color" v-model="form.placeholder_bg" class="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
                  <div class="w-full h-full" :style="{ backgroundColor: form.placeholder_bg }" />
                </div>
                <input
                  type="text"
                  v-model="form.placeholder_bg"
                  maxlength="7"
                  class="flex-1 min-w-0 rounded-btn border border-dash-border bg-dash-bg px-2.5 py-1.5 text-xs font-mono text-dash-text focus:outline-none focus:border-dash-primary"
                />
              </div>
            </div>
            <div>
              <p class="text-2xs text-dash-muted mb-1.5">Accent</p>
              <div class="flex items-center gap-2">
                <div class="relative w-8 h-8 rounded-btn overflow-hidden border border-dash-border shrink-0">
                  <input type="color" v-model="form.placeholder_dot" class="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
                  <div class="w-full h-full" :style="{ backgroundColor: form.placeholder_dot }" />
                </div>
                <input
                  type="text"
                  v-model="form.placeholder_dot"
                  maxlength="7"
                  class="flex-1 min-w-0 rounded-btn border border-dash-border bg-dash-bg px-2.5 py-1.5 text-xs font-mono text-dash-text focus:outline-none focus:border-dash-primary"
                />
              </div>
            </div>
          </div>
          <!-- Color preview -->
          <div
            class="mt-3 rounded-btn h-10 flex items-center justify-center gap-2"
            :style="{ backgroundColor: form.placeholder_bg }"
          >
            <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: form.placeholder_dot }" />
            <span class="text-2xs font-medium" :style="{ color: form.placeholder_dot }">Preview</span>
          </div>
        </div>

        <p v-if="formErrors.general" class="text-xs text-dash-danger">{{ formErrors.general }}</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="modalOpen = false">Cancel</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">Save Changes</AButton>
      </template>
    </AModal>

    <!-- Delete confirmation -->
    <AConfirmDialog
      :open="!!deletingProduct"
      title="Delete product?"
      :message="`Delete &quot;${deletingProduct?.name}&quot;? This cannot be undone.`"
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="deletingProduct = null"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, Package, ImageOff, Link2, Check } from 'lucide-vue-next'
import { usePagination } from '../composables/usePagination'
import {
  apiGetBrand, apiGetProducts, apiUpdateProduct, apiDeleteProduct,
  apiGetBrands, apiGetCategories,
} from '../api/admin'
import type { AdminBrand, AdminProduct, AdminCategory, ProductType } from '../types'
import ATable         from '../components/ui/ATable.vue'
import AButton        from '../components/ui/AButton.vue'
import AInput         from '../components/ui/AInput.vue'
import ASelect        from '../components/ui/ASelect.vue'
import ATextarea      from '../components/ui/ATextarea.vue'
import AModal         from '../components/ui/AModal.vue'
import APagination    from '../components/ui/APagination.vue'
import AEmptyState    from '../components/ui/AEmptyState.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'

const props = defineProps<{ id: string }>()

// ── Brand header ──────────────────────────────────────────────────────
const brand        = ref<AdminBrand | null>(null)
const brandLoading = ref(true)
const brandError   = ref<string | null>(null)

async function loadBrand() {
  try {
    brand.value = (await apiGetBrand(props.id)).data
  } catch (e: unknown) {
    brandError.value = e instanceof Error ? e.message : 'Failed to load brand.'
  } finally {
    brandLoading.value = false
  }
}

// ── Product filters ───────────────────────────────────────────────────
const search     = ref('')
const categoryId = ref('')
const filterType = ref('')
const priceMin   = ref('')
const priceMax   = ref('')
const cats       = ref<AdminCategory[]>([])
const allBrands  = ref<AdminBrand[]>([])

const typeOptions       = ['EDP', 'EDT', 'Parfum', 'EDC'].map(v => ({ value: v, label: v }))
const typeFilterOptions = [{ value: '', label: 'All types' }, ...typeOptions]
const categoryOptions   = computed(() => cats.value.map(c => ({ value: String(c.id), label: c.label })))
const brandOptions      = computed(() => allBrands.value.map(b => ({ value: String(b.id), label: b.name })))

const cols = [
  { key: 'name',         label: 'Name' },
  { key: 'category',     label: 'Category' },
  { key: 'type',         label: 'Type' },
  { key: 'price',        label: 'Price' },
  { key: 'isNew',        label: 'Flags' },
  { key: 'variantCount', label: 'Variants' },
]

// ── Product table (paginated, locked to this brand) ───────────────────
const { items, meta, loading, fetch, changePage } = usePagination((page) =>
  apiGetProducts({
    brand_id:    props.id,
    search:      search.value      || undefined,
    category_id: categoryId.value  || undefined,
    type:        (filterType.value || undefined) as ProductType | undefined,
    price_min:   priceMin.value ? Number(priceMin.value)  : undefined,
    price_max:   priceMax.value ? Number(priceMax.value)  : undefined,
    page,
  }).then(r => r.data),
)

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetch(1), 350)
}

// ── Edit modal ────────────────────────────────────────────────────────
const modalOpen       = ref(false)
const editing         = ref<AdminProduct | null>(null)
const saving          = ref(false)
const deletingProduct = ref<AdminProduct | null>(null)
const deleting        = ref(false)
const formErrors      = ref<Record<string, string>>({})

const flags = [
  { key: 'is_new'        as const, label: 'New arrival' },
  { key: 'is_bestseller' as const, label: 'Bestseller'  },
  { key: 'is_offer'      as const, label: 'On offer'    },
]

const emptyForm = () => ({
  slug: '', name: '', name_en: '', brand_id: '', category_id: '',
  type: '', description: '',
  is_new: false as boolean, is_bestseller: false as boolean, is_offer: false as boolean,
  placeholder_bg: '#F2E8E5', placeholder_dot: '#C9A0A0',
})
const form = ref(emptyForm())

function openEdit(p: AdminProduct) {
  editing.value = p
  form.value = {
    slug:            p.slug,
    name:            p.name,
    name_en:         p.nameEn ?? '',
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
  formErrors.value = {}
  modalOpen.value  = true
}

async function handleSave() {
  formErrors.value = {}
  if (!form.value.name)        { formErrors.value.name        = 'Name is required';  return }
  if (!form.value.brand_id)    { formErrors.value.brand_id    = 'Select a brand';    return }
  if (!form.value.category_id) { formErrors.value.category_id = 'Select a category'; return }
  if (!form.value.type)        { formErrors.value.type        = 'Select a type';     return }

  saving.value = true
  try {
    if (editing.value) {
      await apiUpdateProduct(editing.value.id, {
        name:            form.value.name,
        name_en:         form.value.name_en     || undefined,
        brand_id:        form.value.brand_id,
        category_id:     form.value.category_id,
        type:            form.value.type,
        description:     form.value.description || undefined,
        placeholder_bg:  form.value.placeholder_bg,
        placeholder_dot: form.value.placeholder_dot,
        is_new:          form.value.is_new,
        is_bestseller:   form.value.is_bestseller,
        is_offer:        form.value.is_offer,
      })
    }
    modalOpen.value = false
    fetch(1)
    loadBrand() // refresh product count in header
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : 'Save failed.'
  } finally {
    saving.value = false
  }
}

function confirmDelete(p: AdminProduct) { deletingProduct.value = p }

async function handleDelete() {
  if (!deletingProduct.value) return
  deleting.value = true
  try {
    await apiDeleteProduct(deletingProduct.value.id)
    deletingProduct.value = null
    fetch(1)
    loadBrand() // refresh product count in header
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : 'Delete failed.'
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  loadBrand()
  fetch(1)
  try {
    const [b, c] = await Promise.all([apiGetBrands(), apiGetCategories()])
    allBrands.value = b.data
    cats.value      = c.data
  } catch {
    // dropdowns stay empty; not critical
  }
})

onUnmounted(() => clearTimeout(debounceTimer))
</script>
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/views/BrandDetailView.vue
git commit -m "feat: add BrandDetailView with brand header and full product table"
```

---

## Task 7: Add `/brands/:id` route to Vue router

**Files:**
- Modify: `aroma-admin/src/router/index.ts`

- [x] **Step 1: Add the brand detail route**

Open `aroma-admin/src/router/index.ts`. In the children array, add the brand detail route directly after the brands list route:

```typescript
{ path: 'brands',      name: 'brands',       component: () => import('../views/BrandsView.vue') },
{ path: 'brands/:id',  name: 'brand-detail', component: () => import('../views/BrandDetailView.vue'), props: true },
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/router/index.ts
git commit -m "feat: register /brands/:id route for brand detail page"
```

---

## Self-Review Checklist

- ✅ **Brand model `$fillable`** — Task 1 fixes `name_en` missing from `Brand`
- ✅ **Product model `$fillable`** — Task 1 fixes `name_en` missing from `Product` (needed for edit modal `name_en` save to work)
- ✅ **Brand filters (name, origin, tagline, min/max products)** — Task 3 implements all five params
- ✅ **LIKE search covers both Arabic and English name** — `name` param queries both `name` and `name_en` columns
- ✅ **Min/max products uses `whereRaw` subquery** — SQLite-safe for tests, works in MySQL production
- ✅ **Show endpoint** — Task 3 adds `show()` + route registration
- ✅ **apiGetBrands updated with params** — Task 4
- ✅ **apiGetBrand added** — Task 4
- ✅ **BrandsView filter bar** — Task 5 (name, origin, tagline, min/max products — all debounced 350ms)
- ✅ **Name cell is a RouterLink to `/brands/:id`** — Task 5
- ✅ **Manual ID field removed; slug auto-generated from English name** — Task 5, `generatedSlug` computed
- ✅ **Slug preview chip in create form** — Task 5
- ✅ **BrandDetailView header matches UserDetailView pattern** — Task 6
- ✅ **Products table locked to brand_id prop** — Task 6, `brand_id: props.id` in pagination call
- ✅ **Brand column removed from BrandDetailView product table** — Task 6, cols array has no `brand` key
- ✅ **Brand filter select removed from BrandDetailView filter bar** — Task 6, only category/type/price filters
- ✅ **Edit modal includes brand select for reassignment** — Task 6
- ✅ **Header product count refreshes after edit/delete** — Task 6, `loadBrand()` called after save/delete
- ✅ **Vue router route registered with `props: true`** — Task 7
- ✅ **BrandFactory for tests** — Task 2
- ✅ **No TBDs or placeholder steps** — verified
