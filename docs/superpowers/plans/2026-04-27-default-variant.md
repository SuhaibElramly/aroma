# Default Variant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Mark one variant per product as the default so its price/stock appear on the product card, and make the product detail page update price, original price, and stock live when the user switches sizes.

**Architecture:** Add an `is_default` boolean column to `product_variants`. The API enforces exactly one default per product (auto-promotes the first variant when none exist). `ProductResource` reads from the default variant instead of `first()`. The storefront receives all variants in full and swaps displayed price/stock/originalPrice client-side on size change — no extra API call needed.

**Tech Stack:** Laravel 11 (SQLite), Vue 3 (admin panel), Next.js 14 / React (storefront), TypeScript.

---

## File Map

| File | Change |
|---|---|
| `aroma-api/database/migrations/2026_04_27_200000_add_is_default_to_product_variants.php` | **Create** — adds `is_default` column |
| `aroma-api/app/Models/ProductVariant.php` | **Modify** — add `is_default` to fillable + auto-default boot hook |
| `aroma-api/app/Http/Controllers/Api/Admin/AdminProductVariantController.php` | **Modify** — expose `isDefault`, add `setDefault` endpoint, auto-default on create |
| `aroma-api/app/Http/Resources/ProductResource.php` | **Modify** — use default variant for `price`, `originalPrice`, `selectedSize`, `stock` |
| `aroma-api/routes/api.php` | **Modify** — register `PATCH .../variants/{variantId}/default` route |
| `aroma-admin/src/types/index.ts` | **Modify** — add `isDefault: boolean` to `ProductVariant` |
| `aroma-admin/src/views/ProductVariantsView.vue` | **Modify** — show default badge, "Set as default" button, pass `is_default` on save |
| `aroma-admin/src/api/admin.ts` | **Modify** — add `apiSetDefaultVariant` |
| `aroma/src/types/index.ts` | **Modify** — add `variants` full array to `Product`, extend `ProductVariant` storefront type |
| `aroma/src/features/product/ProductPageClient.tsx` | **Modify** — reactive price/stock/originalPrice on size change |
| `aroma-api/app/Http/Resources/ProductResource.php` | **Modify** — include full `variants` array with all fields in product response |

---

## Task 1: Database — add `is_default` column

**Files:**
- Create: `aroma-api/database/migrations/2026_04_27_200000_add_is_default_to_product_variants.php`

- [x] **Step 1: Create the migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->boolean('is_default')->default(false)->after('low_stock_threshold');
        });

        // Auto-promote the smallest variant of each product that has no default
        DB::statement("
            UPDATE product_variants
            SET is_default = 1
            WHERE id IN (
                SELECT MIN(id) FROM product_variants
                GROUP BY product_id
            )
        ");
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn('is_default');
        });
    }
};
```

- [x] **Step 2: Run the migration**

```bash
cd aroma-api && php artisan migrate
```

Expected output:
```
2026_04_27_200000_add_is_default_to_product_variants .......... DONE
```

- [x] **Step 3: Verify the data**

```bash
php artisan tinker --execute="
App\Models\ProductVariant::where('is_default', true)->get(['id','product_id','size','is_default'])
  ->each(fn(\$v) => print(\$v->product_id.' size:'.\$v->size.' default:'.\$v->is_default.PHP_EOL));
"
```

Expected: one row per product_id with `default:1`.

- [x] **Step 4: Commit**

```bash
git add database/migrations/2026_04_27_200000_add_is_default_to_product_variants.php
git commit -m "feat: add is_default column to product_variants"
```

---

## Task 2: Model — fillable + boot hook

**Files:**
- Modify: `aroma-api/app/Models/ProductVariant.php`

- [x] **Step 1: Add `is_default` to fillable and the boot hook**

Replace the entire `ProductVariant.php` with:

```php
<?php

namespace App\Models;

use App\Enums\StockStatus;
use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id', 'size', 'price', 'original_price',
        'quantity', 'low_stock_threshold', 'stock', 'is_default',
    ];

    protected $casts = [
        'price'               => 'decimal:2',
        'original_price'      => 'decimal:2',
        'quantity'            => 'integer',
        'low_stock_threshold' => 'integer',
        'is_default'          => 'boolean',
        'stock'               => StockStatus::class,
    ];

    protected static function booted(): void
    {
        static::saving(function (ProductVariant $variant) {
            $variant->stock = self::computeStock(
                $variant->quantity ?? 0,
                $variant->low_stock_threshold ?? 5,
            );
        });

        // When a new variant is the first for its product, auto-mark as default
        static::created(function (ProductVariant $variant) {
            $count = static::where('product_id', $variant->product_id)->count();
            if ($count === 1) {
                $variant->updateQuietly(['is_default' => true]);
            }
        });
    }

    public static function computeStock(int $quantity, int $threshold): string
    {
        if ($quantity === 0)         return 'out_of_stock';
        if ($quantity <= $threshold) return 'low_stock';
        return 'in_stock';
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
```

- [x] **Step 2: Verify model loads cleanly**

```bash
php artisan tinker --execute="echo App\Models\ProductVariant::where('is_default',true)->count().' defaults'.PHP_EOL;"
```

Expected: `12 defaults` (one per product).

- [x] **Step 3: Commit**

```bash
git add app/Models/ProductVariant.php
git commit -m "feat: auto-set is_default on first variant creation"
```

---

## Task 3: Admin API — expose `isDefault` + `setDefault` endpoint

**Files:**
- Modify: `aroma-api/app/Http/Controllers/Api/Admin/AdminProductVariantController.php`
- Modify: `aroma-api/routes/api.php`

- [x] **Step 1: Update the controller**

Replace `AdminProductVariantController.php` with:

```php
<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminProductVariantController extends Controller
{
    public function index(int $productId)
    {
        $product = Product::findOrFail($productId);
        return response()->json(
            $product->variants()->orderBy('size')->get()->map(fn($v) => $this->fmt($v))
        );
    }

    public function store(Request $request, int $productId)
    {
        Product::findOrFail($productId);
        $data = $request->validate([
            'size'                => 'required|integer|min:1',
            'price'               => 'required|numeric|min:0',
            'original_price'      => 'nullable|numeric|min:0',
            'quantity'            => 'required|integer|min:0',
            'low_stock_threshold' => 'required|integer|min:0',
        ]);
        $variant = ProductVariant::create(array_merge($data, ['product_id' => $productId]));
        return response()->json($this->fmt($variant->fresh()), 201);
    }

    public function update(Request $request, int $productId, int $variantId)
    {
        $variant = ProductVariant::where('product_id', $productId)->findOrFail($variantId);
        $data = $request->validate([
            'size'                => 'sometimes|integer|min:1',
            'price'               => 'sometimes|numeric|min:0',
            'original_price'      => 'nullable|numeric|min:0',
            'quantity'            => 'sometimes|integer|min:0',
            'low_stock_threshold' => 'sometimes|integer|min:0',
        ]);
        $variant->update($data);
        return response()->json($this->fmt($variant->fresh()));
    }

    public function setDefault(int $productId, int $variantId)
    {
        $variant = ProductVariant::where('product_id', $productId)->findOrFail($variantId);

        DB::transaction(function () use ($productId, $variant) {
            ProductVariant::where('product_id', $productId)->update(['is_default' => false]);
            $variant->update(['is_default' => true]);
        });

        return response()->json($this->fmt($variant->fresh()));
    }

    public function destroy(int $productId, int $variantId)
    {
        $variant = ProductVariant::where('product_id', $productId)->findOrFail($variantId);
        $wasDefault = $variant->is_default;
        $variant->delete();

        // Promote smallest remaining variant if deleted was the default
        if ($wasDefault) {
            ProductVariant::where('product_id', $productId)
                ->orderBy('size')
                ->first()
                ?->update(['is_default' => true]);
        }

        return response()->json(null, 204);
    }

    private function fmt(ProductVariant $v): array
    {
        return [
            'id'                => $v->id,
            'productId'         => $v->product_id,
            'size'              => $v->size,
            'price'             => $v->price,
            'originalPrice'     => $v->original_price,
            'quantity'          => $v->quantity,
            'lowStockThreshold' => $v->low_stock_threshold,
            'stock'             => $v->stock?->value,
            'isDefault'         => (bool) $v->is_default,
        ];
    }
}
```

- [x] **Step 2: Register the new route in `routes/api.php`**

Find the existing variant routes block and add one line:

```php
Route::patch('products/{product}/variants/{variant}/default',
    [AdminProductVariantController::class, 'setDefault']);
```

The full admin variant routes block should look like:

```php
Route::get('products/{product}/variants',        [AdminProductVariantController::class, 'index']);
Route::post('products/{product}/variants',       [AdminProductVariantController::class, 'store']);
Route::put('products/{product}/variants/{variant}',     [AdminProductVariantController::class, 'update']);
Route::patch('products/{product}/variants/{variant}/default', [AdminProductVariantController::class, 'setDefault']);
Route::delete('products/{product}/variants/{variant}',  [AdminProductVariantController::class, 'destroy']);
```

- [x] **Step 3: Smoke-test the new endpoint**

```bash
# Get product 1's variants first
curl -s http://localhost:8000/api/admin/products/1/variants \
  -H "Authorization: Bearer $(php artisan tinker --execute=\"echo App\Models\User::where('is_admin',true)->first()->createToken('t')->plainTextToken;\")" \
  | python3 -m json.tool | grep -E "id|isDefault|size"
```

Expected: list of variants, one with `"isDefault": true`.

- [x] **Step 4: Commit**

```bash
git add app/Http/Controllers/Api/Admin/AdminProductVariantController.php routes/api.php
git commit -m "feat: add setDefault endpoint and expose isDefault on variants"
```

---

## Task 4: ProductResource — use default variant, expose full variants array

**Files:**
- Modify: `aroma-api/app/Http/Resources/ProductResource.php`

- [x] **Step 1: Update the resource**

Replace `ProductResource.php` with:

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Use the is_default variant; fall back to first if none marked
        $variants     = $this->variants;
        $defaultVariant = $variants->firstWhere('is_default', true) ?? $variants->first();

        return [
            'id'            => $this->id,
            'slug'          => $this->slug,
            'name'          => $this->name,
            'nameEn'        => $this->name_en,
            'brand'         => $this->brand?->name_en ?: $this->brand?->name,
            'brandId'       => $this->brand_id,
            'price'         => $defaultVariant?->price,
            'originalPrice' => $defaultVariant?->original_price,
            'sizes'         => $variants->pluck('size')->toArray(),
            'selectedSize'  => $defaultVariant?->size,
            'type'          => $this->type?->value,
            'category'      => $this->category?->label,
            'notes'         => $this->notes->groupBy('type')->map(function ($group) {
                return $group->pluck('note')->toArray();
            })->toArray(),
            'tags'          => $this->tags->pluck('tag')->toArray(),
            'description'   => $this->description,
            'stock'         => str_replace('_', '-', $defaultVariant?->stock?->value),
            'rating'        => $this->rating,
            'reviews'       => $this->reviews_count,
            'new'           => $this->is_new,
            'bestseller'    => $this->is_bestseller,
            'offer'         => $this->is_offer,
            'placeholder'   => [
                'bg'  => $this->placeholder_bg,
                'dot' => $this->placeholder_dot,
            ],
            // Full variant list so the storefront can swap price/stock client-side
            'variants' => $variants->map(fn($v) => [
                'id'            => $v->id,
                'size'          => $v->size,
                'price'         => (float) $v->price,
                'originalPrice' => $v->original_price ? (float) $v->original_price : null,
                'stock'         => str_replace('_', '-', $v->stock?->value),
                'isDefault'     => (bool) $v->is_default,
            ])->values(),
            'images'       => $this->whenLoaded('images', fn() =>
                $this->images->map(fn($img) => [
                    'id'          => $img->id,
                    'url'         => $img->url,
                    'isThumbnail' => $img->is_thumbnail,
                ])->values()
            ),
            'thumbnailUrl' => $this->whenLoaded('images', fn() =>
                $this->images->firstWhere('is_thumbnail', true)?->url
                ?? $this->images->first()?->url
            ),
        ];
    }
}
```

- [x] **Step 2: Verify API response includes variants array**

```bash
curl -s http://localhost:8000/api/products/sauvage | python3 -m json.tool | grep -A 20 '"variants"'
```

Expected: a `variants` array with `id`, `size`, `price`, `originalPrice`, `stock`, `isDefault` for each variant. One entry has `"isDefault": true`.

- [x] **Step 3: Commit**

```bash
git add app/Http/Resources/ProductResource.php
git commit -m "feat: ProductResource uses default variant and exposes full variants list"
```

---

## Task 5: Admin panel — `isDefault` in type + "Set as default" button

**Files:**
- Modify: `aroma-admin/src/types/index.ts`
- Modify: `aroma-admin/src/api/admin.ts`
- Modify: `aroma-admin/src/views/ProductVariantsView.vue`

- [x] **Step 1: Update `ProductVariant` type**

In `aroma-admin/src/types/index.ts`, change:

```ts
export interface ProductVariant {
  id:                 number
  productId:          number
  size:               string
  price:              string
  originalPrice:      string | null
  quantity:           number
  lowStockThreshold:  number
  stock:              StockStatus
  isDefault:          boolean        // ← add this line
}
```

- [x] **Step 2: Add `apiSetDefaultVariant` to `admin.ts`**

In `aroma-admin/src/api/admin.ts`, add after `apiDeleteVariant`:

```ts
export const apiSetDefaultVariant = (productId: number, variantId: number) =>
  client.patch<ProductVariant>(`/admin/products/${productId}/variants/${variantId}/default`)
```

- [x] **Step 3: Update `ProductVariantsView.vue`**

In the variants table section, update the `#actions` slot and add a "Default" badge to the size column. Make these targeted changes:

**a) Import `apiSetDefaultVariant`** — change the import line:

```ts
import {
  apiGetVariants, apiCreateVariant, apiUpdateVariant, apiDeleteVariant, apiSetDefaultVariant,
  apiGetImages, apiUploadImages, apiSetThumbnail, apiDeleteImage,
} from '../api/admin'
```

**b) Add `settingDefault` ref** (after the existing refs):

```ts
const settingDefault = ref(false)
```

**c) Add `setDefault` function** (after `confirmDelete`):

```ts
async function setDefault(v: ProductVariant) {
  if (v.isDefault || settingDefault.value) return
  settingDefault.value = true
  try {
    const res = await apiSetDefaultVariant(productId, v.id)
    variants.value = variants.value.map(x => ({
      ...x,
      isDefault: x.id === v.id,
    }))
  } catch { /* ignore */ }
  finally { settingDefault.value = false }
}
```

**d) Update the `cols` definition** to add an `isDefault` column:

```ts
const cols = [
  { key: 'size',          label: 'Size (ml)' },
  { key: 'price',         label: 'Price' },
  { key: 'originalPrice', label: 'Original' },
  { key: 'quantity',      label: 'Qty' },
  { key: 'stock',         label: 'Status' },
  { key: 'isDefault',     label: 'Default' },
]
```

**e) Add `#cell-isDefault` slot** inside `<ATable>`, after the existing `#cell-quantity` slot:

```html
<template #cell-isDefault="{ value, row }">
  <button
    v-if="!(row as ProductVariant).isDefault"
    class="text-[11px] text-dash-primary hover:underline"
    :disabled="settingDefault"
    @click.stop="setDefault(row as ProductVariant)"
  >
    Set default
  </button>
  <span v-else class="text-[11px] font-medium text-dash-secondary bg-dash-secondary-lt rounded-full px-2 py-0.5">
    Default
  </span>
</template>
```

- [x] **Step 4: Verify in the browser**

1. Open admin → any product → Variants
2. Each row should show either a "Default" badge or a "Set default" button
3. Click "Set default" on a non-default row — it should flip immediately
4. Refresh the page — the same row should still show "Default"

- [x] **Step 5: Commit**

```bash
# from aroma-admin/
git add src/types/index.ts src/api/admin.ts src/views/ProductVariantsView.vue
git commit -m "feat: set-default variant UI in admin panel"
```

---

## Task 6: Storefront types — add full variants array to `Product`

**Files:**
- Modify: `aroma/src/types/index.ts`

- [x] **Step 1: Add a `StorefrontVariant` interface and extend `Product`**

In `aroma/src/types/index.ts`, add after the existing `ProductImage` interface:

```ts
export interface StorefrontVariant {
  id:            number
  size:          string
  price:         number
  originalPrice: number | null
  stock:         StockStatus
  isDefault:     boolean
}
```

Then extend the `Product` interface — add these two fields after `thumbnailUrl`:

```ts
  variants?:     StorefrontVariant[]
```

- [x] **Step 2: Commit**

```bash
# from aroma/
git add src/types/index.ts
git commit -m "feat: add StorefrontVariant type and variants field to Product"
```

---

## Task 7: Storefront product page — reactive price / stock / original price

**Files:**
- Modify: `aroma/src/features/product/ProductPageClient.tsx`

- [x] **Step 1: Replace the gallery + purchase module with variant-aware logic**

The key change: derive the active variant from `selectedSize`, then read `price`, `originalPrice`, and `stock` from that variant object instead of from the top-level `product` fields.

Find this block (around line 44–56):

```tsx
  const size = selectedSize ?? product.selectedSize
  const images = product.images ?? []
  const displayImg = activeImg ?? product.thumbnailUrl ?? null
```

Replace it with:

```tsx
  const allVariants  = product.variants ?? []
  const size         = selectedSize ?? product.selectedSize
  const activeVariant = allVariants.find(v => v.size === size)
                       ?? allVariants.find(v => v.isDefault)
                       ?? allVariants[0]
  const displayPrice    = activeVariant ? activeVariant.price         : Number(product.price)
  const displayOriginal = activeVariant ? activeVariant.originalPrice : (product.originalPrice ?? null)
  const displayStock    = (activeVariant?.stock ?? product.stock) as import('@/types').StockStatus
  const images          = product.images ?? []
  const displayImg      = activeImg ?? product.thumbnailUrl ?? null
```

- [x] **Step 2: Update the price display**

Find:

```tsx
            <span className="font-sans text-[28px] font-medium text-aroma-text">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="font-sans text-[18px] text-aroma-faint line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
```

Replace with:

```tsx
            <span className="font-sans text-[28px] font-medium text-aroma-text">
              {formatPrice(displayPrice)}
            </span>
            {displayOriginal && (
              <span className="font-sans text-[18px] text-aroma-faint line-through">
                {formatPrice(displayOriginal)}
              </span>
            )}
```

- [x] **Step 3: Update the stock badge**

Find:

```tsx
            <StockBadge status={product.stock} />
```

Replace with:

```tsx
            <StockBadge status={displayStock} />
```

- [x] **Step 4: Update the add-to-cart guard and button state**

Find every occurrence of `product.stock === 'out-of-stock'` (there are 3: the guard inside `handleAdd`, the `disabled` prop, and the button style/label). Replace all three with `displayStock === 'out-of-stock'`:

```tsx
  // Inside handleAdd:
  if (displayStock === 'out-of-stock') return

  // Button disabled prop:
  disabled={displayStock === 'out-of-stock'}

  // Button background style:
  background: added
    ? '#5A8A6A'
    : displayStock === 'out-of-stock'
    ? '#D0CCC8'
    : '#1C1917',

  // Button label:
  ) : displayStock === 'out-of-stock' ? (
```

- [x] **Step 5: Verify in the browser**

1. Open `http://localhost:3000/product/sauvage`
2. The price shown should match the default variant's price
3. Click a different size — price, original price, and stock badge should update instantly with no page reload
4. If a variant is `out-of-stock`, the Add to Cart button should go grey and be disabled

- [x] **Step 6: Commit**

```bash
# from aroma/
git add src/features/product/ProductPageClient.tsx
git commit -m "feat: reactive price and stock on variant size change"
```

---

## Task 8: Seeder update — mark default variant in fresh installs

**Files:**
- Modify: `aroma-api/database/seeders/ProductSeeder.php`

- [x] **Step 1: Mark the first variant as default in each product's variants array**

In `ProductSeeder.php`, the `variants` arrays currently have no `is_default` key. Update every product's first variant to include `'is_default' => true`. Example for Sauvage (the pattern repeats for all 12 products):

```php
'variants' => [
    ['size' => 60,  'price' => 480.00, 'original_price' => null, 'is_default' => true],
    ['size' => 100, 'price' => 480.00, 'original_price' => null, 'is_default' => false],
    ['size' => 200, 'price' => 480.00, 'original_price' => null, 'is_default' => false],
],
```

Apply the same pattern to all 12 products: first variant gets `'is_default' => true`, remaining get `'is_default' => false`.

Also remove `'stock'` from the seeder variant arrays — the model's `saving` hook computes it automatically from `quantity` and `low_stock_threshold`. You'll need to add `quantity` and `low_stock_threshold` to each variant if they aren't present already (they were added in a previous migration). Use `'quantity' => 50, 'low_stock_threshold' => 5` as defaults where not specified.

- [x] **Step 2: Verify a fresh seed works**

```bash
php artisan migrate:fresh --seed 2>&1 | tail -5
```

Expected: no errors, ends with `Database seeding completed successfully.`

```bash
php artisan tinker --execute="
  echo App\Models\ProductVariant::where('is_default',true)->count().' defaults / '.App\Models\Product::count().' products'.PHP_EOL;
"
```

Expected: `12 defaults / 12 products`

- [x] **Step 3: Commit**

```bash
git add database/seeders/ProductSeeder.php
git commit -m "chore: mark default variant in product seeder"
```
