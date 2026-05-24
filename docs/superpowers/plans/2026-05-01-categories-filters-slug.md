# Categories Admin — Filters & Auto-slug Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add label + min/max-products filters to the admin categories list, and auto-generate the slug from the label on creation instead of asking the user to type it.

**Architecture:** Backend filtering mirrors the existing `AdminBrandController` pattern (filled-param guards + `whereRaw` subqueries). Slug derivation uses Laravel's `Str::slug()` with a uniqueness loop. Frontend filter bar mirrors `BrandsView` (debounced inputs, params passed to the API helper).

**Tech Stack:** Laravel 11, Vue 3 + TypeScript, PHPUnit feature tests.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `aroma-api/app/Http/Controllers/Api/Admin/AdminCategoryController.php` | Modify | Add filtering to `index()`; auto-slug in `store()` |
| `aroma-api/database/factories/CategoryFactory.php` | Create | Factory for test setup |
| `aroma-api/tests/Feature/AdminCategoryTest.php` | Create | Feature tests covering filters and slug generation |
| `aroma-admin/src/api/admin.ts` | Modify | Accept optional filter params in `apiGetCategories` |
| `aroma-admin/src/views/CategoriesView.vue` | Modify | Add filter bar; remove manual ID field from create modal |

---

## Task 1: CategoryFactory

**Files:**
- Create: `aroma-api/database/factories/CategoryFactory.php`

- [x] **Step 1: Create the factory**

```php
<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Category> */
class CategoryFactory extends Factory
{
    protected $model = Category::class;

    public function definition(): array
    {
        $label = fake()->words(2, true);
        return [
            'slug' => Str::slug($label) . '-' . fake()->unique()->numberBetween(1, 9999),
            'label' => $label,
            'bg'    => fake()->hexColor(),
        ];
    }
}
```

- [x] **Step 2: Add `HasFactory` to Category model**

Open `aroma-api/app/Models/Category.php` and add the trait:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    protected $fillable = ['slug', 'label', 'bg'];

    public function products() {
        return $this->hasMany(Product::class, 'category_id');
    }
}
```

- [x] **Step 3: Verify factory works**

```bash
cd aroma-api && php artisan tinker --execute="use App\Models\Category; Category::factory()->make()->toArray();"
```

Expected: prints an array with `slug`, `label`, `bg` keys.

- [x] **Step 4: Commit**

```bash
git add aroma-api/database/factories/CategoryFactory.php aroma-api/app/Models/Category.php
git commit -m "feat: add CategoryFactory and HasFactory to Category model"
```

---

## Task 2: Backend filtering + auto-slug

**Files:**
- Modify: `aroma-api/app/Http/Controllers/Api/Admin/AdminCategoryController.php`

- [x] **Step 1: Write the failing tests**

Create `aroma-api/tests/Feature/AdminCategoryTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminCategoryTest extends TestCase
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

    public function test_index_returns_all_categories_with_no_filters(): void
    {
        Category::factory()->count(3)->create();

        $this->asAdmin()->getJson('/api/admin/categories')
            ->assertOk()
            ->assertJsonCount(3);
    }

    public function test_filters_categories_by_label(): void
    {
        Category::factory()->create(['label' => 'Women', 'slug' => 'women']);
        Category::factory()->create(['label' => 'Men',   'slug' => 'men']);

        $this->asAdmin()->getJson('/api/admin/categories?label=Wom')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.slug', 'women');
    }

    public function test_min_products_one_excludes_categories_with_no_products(): void
    {
        Category::factory()->count(2)->create();

        $this->asAdmin()->getJson('/api/admin/categories?min_products=1')
            ->assertOk()
            ->assertJsonCount(0);
    }

    public function test_min_products_zero_returns_all_categories(): void
    {
        Category::factory()->count(2)->create();

        $this->asAdmin()->getJson('/api/admin/categories?min_products=0')
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_max_products_zero_returns_categories_with_no_products(): void
    {
        Category::factory()->count(2)->create();

        $this->asAdmin()->getJson('/api/admin/categories?max_products=0')
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_store_auto_generates_slug_from_label(): void
    {
        $this->asAdmin()->postJson('/api/admin/categories', [
            'label' => 'Body Care',
            'bg'    => '#F4EFE8',
        ])->assertCreated();

        $this->assertDatabaseHas('categories', ['slug' => 'body-care']);
    }

    public function test_store_appends_suffix_when_slug_already_exists(): void
    {
        Category::factory()->create(['slug' => 'body-care', 'label' => 'Body Care']);

        $this->asAdmin()->postJson('/api/admin/categories', [
            'label' => 'Body Care',
            'bg'    => '#FFFFFF',
        ])->assertCreated();

        $this->assertDatabaseHas('categories', ['slug' => 'body-care-2']);
    }

    public function test_store_requires_label(): void
    {
        $this->asAdmin()->postJson('/api/admin/categories', ['bg' => '#F4EFE8'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['label']);
    }

    public function test_store_requires_bg(): void
    {
        $this->asAdmin()->postJson('/api/admin/categories', ['label' => 'Test'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['bg']);
    }
}
```

- [x] **Step 2: Run tests to verify they fail**

```bash
cd aroma-api && php artisan test tests/Feature/AdminCategoryTest.php
```

Expected: multiple FAIL — `index` may pass (no filtering yet), store tests fail because current `store()` requires `slug`.

- [x] **Step 3: Update `AdminCategoryController`**

Replace the full file content:

```php
<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminCategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Category::withCount('products');

        if ($request->filled('label')) {
            $query->where('label', 'like', '%' . $request->label . '%');
        }

        if ($request->filled('min_products')) {
            $query->whereRaw(
                '(SELECT COUNT(*) FROM products WHERE products.category_id = categories.id) >= ?',
                [(int) $request->min_products]
            );
        }

        if ($request->filled('max_products')) {
            $query->whereRaw(
                '(SELECT COUNT(*) FROM products WHERE products.category_id = categories.id) <= ?',
                [(int) $request->max_products]
            );
        }

        $cats = $query->orderBy('label')->get();

        return response()->json($cats->map(fn($c) => [
            'id'           => $c->id,
            'slug'         => $c->slug,
            'label'        => $c->label,
            'bg'           => $c->bg,
            'productCount' => $c->products_count,
        ]));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'label' => 'required|string',
            'bg'    => 'required|string',
        ]);

        $base = Str::slug($data['label']);
        $slug = $base;
        $i    = 2;
        while (Category::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $i++;
        }
        $data['slug'] = $slug;

        $cat = Category::create($data);
        return response()->json(['id' => $cat->id], 201);
    }

    public function update(Request $request, int $id)
    {
        $cat  = Category::findOrFail($id);
        $data = $request->validate([
            'label' => 'sometimes|string',
            'bg'    => 'sometimes|string',
        ]);
        $cat->update($data);
        return response()->json(['id' => $cat->id]);
    }

    public function destroy(int $id)
    {
        Category::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
```

- [x] **Step 4: Run tests — all must pass**

```bash
cd aroma-api && php artisan test tests/Feature/AdminCategoryTest.php
```

Expected: all tests PASS.

- [x] **Step 5: Commit**

```bash
git add aroma-api/app/Http/Controllers/Api/Admin/AdminCategoryController.php \
        aroma-api/tests/Feature/AdminCategoryTest.php
git commit -m "feat: add category filters and auto-generate slug from label"
```

---

## Task 3: Frontend — API helper

**Files:**
- Modify: `aroma-admin/src/api/admin.ts` (around line 96)

- [x] **Step 1: Update `apiGetCategories` to accept filter params**

Replace the existing `apiGetCategories` definition:

```ts
export const apiGetCategories = (params?: {
  label?: string
  min_products?: number
  max_products?: number
}) =>
  client.get<AdminCategory[]>('/admin/categories', { params })
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/api/admin.ts
git commit -m "feat: pass filter params to apiGetCategories"
```

---

## Task 4: Frontend — CategoriesView filter bar + remove slug input

**Files:**
- Modify: `aroma-admin/src/views/CategoriesView.vue`

- [x] **Step 1: Replace `CategoriesView.vue` with the updated version**

```vue
<!-- aroma-admin/src/views/CategoriesView.vue -->
<template>
  <div class="space-y-4">
    <div v-if="loadError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ loadError }}
    </div>
    <div class="flex justify-end">
      <AButton size="sm" @click="openCreate"><Plus :size="14" /> Add Category</AButton>
    </div>

    <!-- Filters -->
    <div class="space-y-3">
      <div class="grid grid-cols-1 gap-3">
        <AInput v-model="filterLabel" label="Label" placeholder="Search label…" @input="debouncedLoad" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <AInput v-model="filterMinProducts" label="Min Products" type="number" placeholder="0"   @input="debouncedLoad" />
        <AInput v-model="filterMaxProducts" label="Max Products" type="number" placeholder="Any" @input="debouncedLoad" />
      </div>
    </div>

    <ATable :columns="cols" :rows="categories" :loading="loading">
      <template #cell-id="{ value }">
        <span class="font-mono text-[10px] text-dash-faint">{{ value }}</span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-1.5 justify-end">
          <AButton size="sm" variant="ghost" @click.stop="openEdit(row as AdminCategory)">Edit</AButton>
          <AButton size="sm" variant="danger" @click.stop="confirmDelete(row as AdminCategory)">Delete</AButton>
        </div>
      </template>
      <template #empty>
        <AEmptyState :icon="Grid3X3" heading="No categories found" />
      </template>
    </ATable>

    <AModal :open="modalOpen" :title="editing ? 'Edit Category' : 'Add Category'" @close="modalOpen = false">
      <form class="space-y-3" @submit.prevent>
        <AInput v-model="form.label" label="Label" :error="formErrors.label" />
        <AInput v-model="form.bg"    label="Background colour" placeholder="#F4EFE8" :error="formErrors.bg" />
        <p v-if="formErrors.general" class="text-xs text-dash-danger">{{ formErrors.general }}</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="modalOpen = false">Cancel</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">{{ editing ? 'Save' : 'Add' }}</AButton>
      </template>
    </AModal>

    <AConfirmDialog
      :open="!!deletingCat"
      title="Delete category?"
      :message="`Delete &quot;${deletingCat?.label}&quot;? Products in this category will lose their category.`"
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="deletingCat = null"
    />
    <div v-if="deleteError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ deleteError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Plus, Grid3X3 } from 'lucide-vue-next'
import { apiGetCategories, apiCreateCategory, apiUpdateCategory, apiDeleteCategory } from '../api/admin'
import type { AdminCategory } from '../types'
import ATable         from '../components/ui/ATable.vue'
import AButton        from '../components/ui/AButton.vue'
import AInput         from '../components/ui/AInput.vue'
import AModal         from '../components/ui/AModal.vue'
import AEmptyState    from '../components/ui/AEmptyState.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'

const categories = ref<AdminCategory[]>([])
const loading    = ref(true)
const loadError  = ref<string | null>(null)
const modalOpen  = ref(false)
const editing    = ref<AdminCategory | null>(null)
const saving     = ref(false)
const deletingCat= ref<AdminCategory | null>(null)
const deleting   = ref(false)
const deleteError= ref<string | null>(null)
const formErrors = ref<Record<string,string>>({})

const filterLabel       = ref('')
const filterMinProducts = ref('')
const filterMaxProducts = ref('')

const emptyForm = () => ({ label: '', bg: '' })
const form = ref(emptyForm())

const cols = [
  { key: 'id',           label: 'ID' },
  { key: 'label',        label: 'Label' },
  { key: 'productCount', label: 'Products' },
]

async function loadCats() {
  loading.value = true
  loadError.value = null
  try {
    categories.value = (await apiGetCategories({
      label:        filterLabel.value       || undefined,
      min_products: filterMinProducts.value ? Number(filterMinProducts.value) : undefined,
      max_products: filterMaxProducts.value ? Number(filterMaxProducts.value) : undefined,
    })).data
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load categories.'
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => loadCats(), 350)
}
onUnmounted(() => clearTimeout(debounceTimer))

function openCreate() { editing.value = null; form.value = emptyForm(); formErrors.value = {}; modalOpen.value = true }
function openEdit(c: AdminCategory) {
  editing.value = c
  form.value = { label: c.label, bg: c.bg }
  formErrors.value = {}; modalOpen.value = true
}

async function handleSave() {
  formErrors.value = {}
  if (!form.value.label) { formErrors.value.label = 'Label is required'; return }
  if (!form.value.bg)    { formErrors.value.bg    = 'Colour is required'; return }
  saving.value = true
  try {
    editing.value
      ? await apiUpdateCategory(String(editing.value.id), form.value)
      : await apiCreateCategory(form.value)
    modalOpen.value = false; loadCats()
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : 'Save failed.'
  } finally { saving.value = false }
}

function confirmDelete(c: AdminCategory) { deletingCat.value = c }

async function handleDelete() {
  if (!deletingCat.value) return
  deleteError.value = null
  deleting.value = true
  try {
    await apiDeleteCategory(String(deletingCat.value.id))
    deletingCat.value = null
    loadCats()
  } catch (e: unknown) {
    deleteError.value = e instanceof Error ? e.message : 'Delete failed.'
    deletingCat.value = null
  } finally {
    deleting.value = false
  }
}

onMounted(loadCats)
</script>
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/views/CategoriesView.vue
git commit -m "feat: add filters and remove manual slug input from categories view"
```

---

## Task 5: Manual smoke test

- [x] **Step 1: Start the dev server if not running**

```bash
cd aroma-admin && npm run dev
```

- [x] **Step 2: Open the Categories page**

Navigate to the Categories page in the browser. Verify:
- Filter bar shows "Label", "Min Products", "Max Products" inputs
- No "ID (slug)" field appears in the Add Category modal
- Creating a new category with just Label + BG succeeds
- Filtering by label text narrows the list
- Min/max product filters work correctly

- [x] **Step 3: Run the full backend test suite**

```bash
cd aroma-api && php artisan test
```

Expected: all tests pass.
