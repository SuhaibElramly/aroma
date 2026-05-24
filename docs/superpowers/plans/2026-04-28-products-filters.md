# Products Page — Extended Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add 6 server-side filter fields (Name, Brand, Category, Type, Price Min, Price Max) to the admin Products page in a two-row 3-column grid layout.

**Architecture:** Backend filter logic lives entirely in `AdminProductController@index` using Eloquent query builder. The frontend passes filter state as query params via `apiGetProducts`. `ProductsView.vue` owns all filter refs and passes them through on every fetch.

**Tech Stack:** Laravel 10 (PHP), Vue 3 + TypeScript, Tailwind CSS, Axios (via `client`)

---

## Files

| File | Change |
|------|--------|
| `aroma-api/app/Http/Controllers/Api/Admin/AdminProductController.php` | Add `name_en` OR to search, add `category_id`, `type`, `price_min`, `price_max` filter branches |
| `aroma-admin/src/api/admin.ts` | Extend `apiGetProducts` params type with 4 new optional fields |
| `aroma-admin/src/views/ProductsView.vue` | Replace single search input with two 3-col filter rows; add 5 new filter refs; pass all to API |

---

## Task 1: Extend backend filter logic

**Files:**
- Modify: `aroma-api/app/Http/Controllers/Api/Admin/AdminProductController.php`

- [x] **Step 1: Replace the `index` method body**

Open `aroma-api/app/Http/Controllers/Api/Admin/AdminProductController.php`.

Replace the entire `index` method (lines 10–49) with:

```php
public function index(Request $request)
{
    $query = Product::with(['brand', 'category', 'variants', 'images'])
        ->orderBy('name');

    if ($request->filled('search')) {
        $term = "%{$request->search}%";
        $query->where(function ($q) use ($term) {
            $q->where('name', 'like', $term)
              ->orWhere('name_en', 'like', $term);
        });
    }

    if ($request->filled('brand_id')) {
        $query->where('brand_id', $request->brand_id);
    }

    if ($request->filled('category_id')) {
        $query->where('category_id', $request->category_id);
    }

    if ($request->filled('type')) {
        $query->where('type', $request->type);
    }

    if ($request->filled('price_min')) {
        $query->whereExists(function ($sub) use ($request) {
            $sub->selectRaw('1')
                ->from('product_variants')
                ->whereColumn('product_variants.product_id', 'products.id')
                ->havingRaw('MIN(price) >= ?', [(float) $request->price_min]);
        });
    }

    if ($request->filled('price_max')) {
        $query->whereExists(function ($sub) use ($request) {
            $sub->selectRaw('1')
                ->from('product_variants')
                ->whereColumn('product_variants.product_id', 'products.id')
                ->havingRaw('MIN(price) <= ?', [(float) $request->price_max]);
        });
    }

    $products = $query->paginate(20);

    return response()->json([
        'data' => $products->map(fn($p) => [
            'id'           => $p->id,
            'slug'         => $p->slug,
            'name'         => $p->name,
            'nameEn'       => $p->name_en,
            'brand'        => $p->brand?->name,
            'brandId'      => $p->brand_id,
            'category'     => $p->category?->label,
            'categoryId'   => $p->category_id,
            'type'         => $p->type?->value,
            'isNew'        => $p->is_new,
            'isBestseller' => $p->is_bestseller,
            'isOffer'      => $p->is_offer,
            'variantCount' => $p->variants->count(),
            'price'        => $p->variants->first()?->price,
            'thumbnailUrl' => $p->images->firstWhere('is_thumbnail', true)?->url
                           ?? $p->images->first()?->url,
        ]),
        'meta' => [
            'total'       => $products->total(),
            'currentPage' => $products->currentPage(),
            'lastPage'    => $products->lastPage(),
        ],
    ]);
}
```

- [x] **Step 2: Verify the API responds correctly**

Run the Laravel dev server if not already running:
```bash
cd aroma-api && php artisan serve
```

Test each new filter manually with curl or a browser:
```bash
# name_en search
curl "http://localhost:8000/api/admin/products?search=oud" -H "Authorization: Bearer <token>"

# category filter
curl "http://localhost:8000/api/admin/products?category_id=1" -H "Authorization: Bearer <token>"

# type filter
curl "http://localhost:8000/api/admin/products?type=EDP" -H "Authorization: Bearer <token>"

# price range
curl "http://localhost:8000/api/admin/products?price_min=50&price_max=200" -H "Authorization: Bearer <token>"
```

Expected: `data` array filtered correctly, `meta.total` reflects filtered count.

- [x] **Step 3: Commit**

```bash
git add aroma-api/app/Http/Controllers/Api/Admin/AdminProductController.php
git commit -m "feat(admin): extend product filters — name_en, category, type, price range"
```

---

## Task 2: Extend the API client type

**Files:**
- Modify: `aroma-admin/src/api/admin.ts` (line 37)

- [x] **Step 1: Update `apiGetProducts` signature**

In `aroma-admin/src/api/admin.ts`, replace line 37:

```ts
export const apiGetProducts = (params: { search?: string; brand_id?: string; page?: number }) =>
```

with:

```ts
export const apiGetProducts = (params: {
  search?:      string
  brand_id?:    string
  category_id?: string
  type?:        string
  price_min?:   number
  price_max?:   number
  page?:        number
}) =>
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/api/admin.ts
git commit -m "feat(admin): extend apiGetProducts params with category, type, price filters"
```

---

## Task 3: Replace filter bar in ProductsView.vue

**Files:**
- Modify: `aroma-admin/src/views/ProductsView.vue`

- [x] **Step 1: Replace the toolbar template block**

In `aroma-admin/src/views/ProductsView.vue`, replace the `<!-- Toolbar -->` block (lines 4–12):

```html
<!-- Toolbar -->
<div class="flex items-center justify-between gap-3">
  <div class="flex gap-2 flex-1">
    <AInput v-model="search" placeholder="Search products…" class="w-56" @input="debouncedFetch" />
  </div>
  <AButton @click="openCreate" size="sm">
    <Plus :size="14" /> Add Product
  </AButton>
</div>
```

with:

```html
<!-- Toolbar -->
<div class="space-y-3">
  <div class="flex items-end justify-between gap-3">
    <div class="grid grid-cols-3 gap-3 flex-1">
      <AInput v-model="search"     label="Name" placeholder="Search AR / EN…" @input="debouncedFetch" />
      <ASelect v-model="brandId"    label="Brand"    :options="[{ value: '', label: 'All brands' }, ...brandOptions]"    @update:modelValue="fetch(1)" />
      <ASelect v-model="categoryId" label="Category" :options="[{ value: '', label: 'All categories' }, ...categoryOptions]" @update:modelValue="fetch(1)" />
    </div>
    <AButton @click="openCreate" size="sm" class="shrink-0 self-end">
      <Plus :size="14" /> Add Product
    </AButton>
  </div>

  <div class="grid grid-cols-3 gap-3">
    <ASelect v-model="filterType" label="Type" :options="typeFilterOptions" @update:modelValue="fetch(1)" />
    <AInput v-model="priceMin" label="Price Min (LYD)" type="number" placeholder="0" @input="debouncedFetch" />
    <AInput v-model="priceMax" label="Price Max (LYD)" type="number" placeholder="Any" @input="debouncedFetch" />
  </div>
</div>
```

- [x] **Step 2: Update the script refs and fetch call**

In the `<script setup>` block, replace:

```ts
const search  = ref('')
```

with:

```ts
const search     = ref('')
const brandId    = ref('')
const categoryId = ref('')
const filterType = ref('')
const priceMin   = ref('')
const priceMax   = ref('')
```

- [x] **Step 3: Add `typeFilterOptions` computed**

After the existing `typeOptions` line (line 143), add:

```ts
const typeFilterOptions = [
  { value: '', label: 'All types' },
  ...typeOptions,
]
```

- [x] **Step 4: Update `usePagination` fetch call to pass all filters**

Replace (line 157–159):

```ts
const { items, meta, loading, fetch, changePage } = usePagination((page) =>
  apiGetProducts({ search: search.value || undefined, page }).then(r => r.data),
)
```

with:

```ts
const { items, meta, loading, fetch, changePage } = usePagination((page) =>
  apiGetProducts({
    search:      search.value      || undefined,
    brand_id:    brandId.value     || undefined,
    category_id: categoryId.value  || undefined,
    type:        filterType.value  || undefined,
    price_min:   priceMin.value    ? Number(priceMin.value)  : undefined,
    price_max:   priceMax.value    ? Number(priceMax.value)  : undefined,
    page,
  }).then(r => r.data),
)
```

- [x] **Step 5: Verify in browser**

Start the admin dev server if not running:
```bash
cd aroma-admin && npm run dev
```

Open the Products page and verify:
- Row 1 shows Name / Brand / Category filters; "Add Product" button is top-right
- Row 2 shows Type / Price Min / Price Max
- Typing in Name filters by both Arabic and English names (debounced)
- Selecting Brand/Category/Type immediately filters the table
- Entering a price range filters by minimum variant price
- All filters combine correctly (select Brand + Type together, etc.)
- Clearing a select back to "All" shows unfiltered results
- Pagination resets to page 1 on any filter change

- [x] **Step 6: Commit**

```bash
git add aroma-admin/src/views/ProductsView.vue
git commit -m "feat(admin): add 6-filter bar to Products page (name, brand, category, type, price)"
```
