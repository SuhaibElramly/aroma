# Flexible Product Specifications & Variants — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `size` column on product variants with a normalized spec system: global spec types, per-product spec assignments + values, auto-generated variant combinations stored in a `variant_spec_values` pivot table.

**Architecture:** Four new DB tables (`spec_types`, `product_spec_assignments`, `product_spec_values`, `variant_spec_values`) + `size` column dropped from `product_variants`. Three new admin controllers (SpecType CRUD, ProductSpec GET/PUT, VariantGenerate POST). Frontend gains a SpecTypesView page and a Specs section in ProductVariantsView.

**Tech Stack:** Laravel 11 (PHP), PHPUnit feature tests, Vue 3 + TypeScript, Tailwind CSS, Lucide icons, Axios via `client` wrapper.

---

## File Map

### Backend — New
- `aroma-api/database/migrations/2026_05_02_000001_create_spec_types_table.php`
- `aroma-api/database/migrations/2026_05_02_000002_create_product_spec_assignments_table.php`
- `aroma-api/database/migrations/2026_05_02_000003_create_product_spec_values_table.php`
- `aroma-api/database/migrations/2026_05_02_000004_create_variant_spec_values_table.php`
- `aroma-api/database/migrations/2026_05_02_000005_drop_size_from_product_variants.php`
- `aroma-api/app/Models/SpecType.php`
- `aroma-api/app/Models/ProductSpecAssignment.php`
- `aroma-api/app/Models/ProductSpecValue.php`
- `aroma-api/app/Models/VariantSpecValue.php`
- `aroma-api/app/Services/VariantGeneratorService.php`
- `aroma-api/app/Http/Controllers/Api/Admin/AdminSpecTypeController.php`
- `aroma-api/app/Http/Controllers/Api/Admin/AdminProductSpecController.php`
- `aroma-api/app/Http/Controllers/Api/Admin/AdminProductVariantGenerateController.php`
- `aroma-api/database/factories/ProductFactory.php`
- `aroma-api/database/factories/ProductVariantFactory.php`
- `aroma-api/database/factories/SpecTypeFactory.php`
- `aroma-api/tests/Feature/AdminSpecTypeTest.php`
- `aroma-api/tests/Feature/AdminProductSpecTest.php`
- `aroma-api/tests/Feature/AdminVariantGenerateTest.php`

### Backend — Modified
- `aroma-api/app/Models/Product.php` — add `specAssignments()` and `specValues()` relations
- `aroma-api/app/Models/ProductVariant.php` — add `specValues()` relation, remove `size` from `$fillable`
- `aroma-api/app/Http/Controllers/Api/Admin/AdminProductVariantController.php` — remove `size`, add `specs` to fmt(), remove store route
- `aroma-api/routes/api.php` — add new admin routes, remove variant store route

### Frontend — New
- `aroma-admin/src/views/SpecTypesView.vue`

### Frontend — Modified
- `aroma-admin/src/types/index.ts` — add `SpecType`, `ProductSpec`, `VariantSpec`; update `ProductVariant`
- `aroma-admin/src/api/admin.ts` — add spec type and product spec API calls
- `aroma-admin/src/router/index.ts` — add `/spec-types` route
- `aroma-admin/src/components/layout/Sidebar.vue` — add Spec Types nav item
- `aroma-admin/src/views/ProductVariantsView.vue` — add Specs section, update table + modal

---

## Task 1: Database Migrations

**Files:**
- Create: `aroma-api/database/migrations/2026_05_02_000001_create_spec_types_table.php`
- Create: `aroma-api/database/migrations/2026_05_02_000002_create_product_spec_assignments_table.php`
- Create: `aroma-api/database/migrations/2026_05_02_000003_create_product_spec_values_table.php`
- Create: `aroma-api/database/migrations/2026_05_02_000004_create_variant_spec_values_table.php`
- Create: `aroma-api/database/migrations/2026_05_02_000005_drop_size_from_product_variants.php`

- [ ] **Step 1: Create the spec_types migration**

```php
// aroma-api/database/migrations/2026_05_02_000001_create_spec_types_table.php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('spec_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('unit')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void {
        Schema::dropIfExists('spec_types');
    }
};
```

- [ ] **Step 2: Create the product_spec_assignments migration**

```php
// aroma-api/database/migrations/2026_05_02_000002_create_product_spec_assignments_table.php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('product_spec_assignments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('spec_type_id');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['product_id', 'spec_type_id']);
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('spec_type_id')->references('id')->on('spec_types')->onDelete('restrict');
        });
    }
    public function down(): void {
        Schema::dropIfExists('product_spec_assignments');
    }
};
```

- [ ] **Step 3: Create the product_spec_values migration**

```php
// aroma-api/database/migrations/2026_05_02_000003_create_product_spec_values_table.php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('product_spec_values', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('spec_type_id');
            $table->string('value');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('spec_type_id')->references('id')->on('spec_types')->onDelete('restrict');
        });
    }
    public function down(): void {
        Schema::dropIfExists('product_spec_values');
    }
};
```

- [ ] **Step 4: Create the variant_spec_values migration**

```php
// aroma-api/database/migrations/2026_05_02_000004_create_variant_spec_values_table.php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('variant_spec_values', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('variant_id');
            $table->unsignedBigInteger('spec_type_id');
            $table->string('value');
            $table->timestamps();
            $table->unique(['variant_id', 'spec_type_id']);
            $table->foreign('variant_id')->references('id')->on('product_variants')->onDelete('cascade');
            $table->foreign('spec_type_id')->references('id')->on('spec_types')->onDelete('restrict');
        });
    }
    public function down(): void {
        Schema::dropIfExists('variant_spec_values');
    }
};
```

- [ ] **Step 5: Create the drop_size migration**

```php
// aroma-api/database/migrations/2026_05_02_000005_drop_size_from_product_variants.php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn('size');
        });
    }
    public function down(): void {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->string('size')->nullable()->after('product_id');
        });
    }
};
```

- [ ] **Step 6: Run migrations and verify**

```bash
cd aroma-api && php artisan migrate
```

Expected: 5 new migrations run successfully, no errors.

- [ ] **Step 7: Commit**

```bash
git add aroma-api/database/migrations/2026_05_02_*
git commit -m "feat: add spec_types, product_spec_assignments, product_spec_values, variant_spec_values migrations; drop size from product_variants"
```

---

## Task 2: New Models + Update Existing Models

**Files:**
- Create: `aroma-api/app/Models/SpecType.php`
- Create: `aroma-api/app/Models/ProductSpecAssignment.php`
- Create: `aroma-api/app/Models/ProductSpecValue.php`
- Create: `aroma-api/app/Models/VariantSpecValue.php`
- Modify: `aroma-api/app/Models/Product.php`
- Modify: `aroma-api/app/Models/ProductVariant.php`

- [ ] **Step 1: Create SpecType model**

```php
// aroma-api/app/Models/SpecType.php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SpecType extends Model
{
    protected $fillable = ['name', 'unit'];

    public function assignments(): HasMany
    {
        return $this->hasMany(ProductSpecAssignment::class);
    }
}
```

- [ ] **Step 2: Create ProductSpecAssignment model**

```php
// aroma-api/app/Models/ProductSpecAssignment.php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductSpecAssignment extends Model
{
    protected $fillable = ['product_id', 'spec_type_id', 'sort_order'];

    public function specType(): BelongsTo
    {
        return $this->belongsTo(SpecType::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
```

- [ ] **Step 3: Create ProductSpecValue model**

```php
// aroma-api/app/Models/ProductSpecValue.php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductSpecValue extends Model
{
    protected $fillable = ['product_id', 'spec_type_id', 'value', 'sort_order'];

    public function specType(): BelongsTo
    {
        return $this->belongsTo(SpecType::class);
    }
}
```

- [ ] **Step 4: Create VariantSpecValue model**

```php
// aroma-api/app/Models/VariantSpecValue.php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VariantSpecValue extends Model
{
    protected $fillable = ['variant_id', 'spec_type_id', 'value'];

    public function specType(): BelongsTo
    {
        return $this->belongsTo(SpecType::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }
}
```

- [ ] **Step 5: Update Product model — add spec relations**

In `aroma-api/app/Models/Product.php`, add the following imports and methods. Add `use` statements at the top alongside existing ones:

```php
use App\Models\ProductSpecAssignment;
use App\Models\ProductSpecValue;
```

Add these two methods inside the `Product` class:

```php
public function specAssignments(): HasMany
{
    return $this->hasMany(ProductSpecAssignment::class);
}

public function specValues(): HasMany
{
    return $this->hasMany(ProductSpecValue::class);
}
```

- [ ] **Step 6: Update ProductVariant model — add specValues relation, remove `size`**

Replace the entire `aroma-api/app/Models/ProductVariant.php` with:

```php
<?php
namespace App\Models;

use App\Enums\StockStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id', 'price', 'original_price',
        'quantity', 'low_stock_threshold', 'stock', 'is_default',
    ];

    protected $casts = [
        'price'               => 'decimal:2',
        'original_price'      => 'decimal:2',
        'quantity'            => 'integer',
        'low_stock_threshold' => 'integer',
        'stock'               => StockStatus::class,
        'is_default'          => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saving(function (ProductVariant $variant) {
            $variant->stock = self::computeStock(
                $variant->quantity ?? 0,
                $variant->low_stock_threshold ?? 5,
            );
        });

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

    public function specValues(): HasMany
    {
        return $this->hasMany(VariantSpecValue::class, 'variant_id');
    }
}
```

- [ ] **Step 7: Verify PHP syntax**

```bash
cd aroma-api && php artisan about 2>&1 | head -5
```

Expected: No parse errors, app boots.

- [ ] **Step 8: Commit**

```bash
git add aroma-api/app/Models/SpecType.php aroma-api/app/Models/ProductSpecAssignment.php \
        aroma-api/app/Models/ProductSpecValue.php aroma-api/app/Models/VariantSpecValue.php \
        aroma-api/app/Models/Product.php aroma-api/app/Models/ProductVariant.php
git commit -m "feat: add SpecType, ProductSpecAssignment, ProductSpecValue, VariantSpecValue models; update Product and ProductVariant"
```

---

## Task 3: VariantGeneratorService + Factories

**Files:**
- Create: `aroma-api/app/Services/VariantGeneratorService.php`
- Create: `aroma-api/database/factories/ProductFactory.php`
- Create: `aroma-api/database/factories/ProductVariantFactory.php`
- Create: `aroma-api/database/factories/SpecTypeFactory.php`

- [ ] **Step 1: Create VariantGeneratorService**

```php
// aroma-api/app/Services/VariantGeneratorService.php
<?php
namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\VariantSpecValue;
use Illuminate\Support\Facades\DB;

class VariantGeneratorService
{
    public function generate(Product $product): array
    {
        $assignments = $product->specAssignments()
            ->orderBy('sort_order')
            ->get();

        // Build value sets per spec, in assignment order
        $sets = [];
        foreach ($assignments as $assignment) {
            $values = $product->specValues()
                ->where('spec_type_id', $assignment->spec_type_id)
                ->orderBy('sort_order')
                ->pluck('value')
                ->toArray();

            if (empty($values)) {
                throw new \InvalidArgumentException(
                    'All assigned specs must have at least one value before generating.'
                );
            }

            $sets[] = [
                'spec_type_id' => $assignment->spec_type_id,
                'values'       => $values,
            ];
        }

        // Compute cartesian product of values
        $valueSets    = array_column($sets, 'values');
        $specTypeIds  = array_column($sets, 'spec_type_id');
        $combinations = $this->cartesian($valueSets);

        $variants = [];
        DB::transaction(function () use ($product, $combinations, $specTypeIds, &$variants) {
            foreach ($combinations as $combo) {
                $variant = ProductVariant::create([
                    'product_id' => $product->id,
                    'price'      => 0,
                    'quantity'   => 0,
                    'low_stock_threshold' => 5,
                ]);

                foreach ($combo as $idx => $value) {
                    VariantSpecValue::create([
                        'variant_id'  => $variant->id,
                        'spec_type_id' => $specTypeIds[$idx],
                        'value'        => $value,
                    ]);
                }

                $variants[] = $variant->load('specValues.specType');
            }
        });

        return $variants;
    }

    // Returns [[]]} for empty input (one combination with no specs — for spec-less products)
    private function cartesian(array $sets): array
    {
        $result = [[]];
        foreach ($sets as $set) {
            $append = [];
            foreach ($result as $existing) {
                foreach ($set as $item) {
                    $append[] = array_merge($existing, [$item]);
                }
            }
            $result = $append;
        }
        return $result;
    }
}
```

- [ ] **Step 2: Create ProductFactory**

```php
// aroma-api/database/factories/ProductFactory.php
<?php
namespace Database\Factories;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Product> */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $nameEn = fake()->words(2, true);
        return [
            'name'            => fake()->words(2, true),
            'name_en'         => $nameEn,
            'slug'            => Str::slug($nameEn) . '-' . fake()->unique()->numberBetween(1, 99999),
            'brand_id'        => Brand::factory(),
            'category_id'     => Category::factory(),
            'type'            => 'EDP',
            'placeholder_bg'  => '#F2E8E5',
            'placeholder_dot' => '#C9A0A0',
        ];
    }
}
```

- [ ] **Step 3: Create ProductVariantFactory**

```php
// aroma-api/database/factories/ProductVariantFactory.php
<?php
namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ProductVariant> */
class ProductVariantFactory extends Factory
{
    protected $model = ProductVariant::class;

    public function definition(): array
    {
        return [
            'product_id'         => Product::factory(),
            'price'              => fake()->randomFloat(2, 10, 500),
            'original_price'     => null,
            'quantity'           => fake()->numberBetween(0, 100),
            'low_stock_threshold' => 5,
        ];
    }
}
```

- [ ] **Step 4: Create SpecTypeFactory**

```php
// aroma-api/database/factories/SpecTypeFactory.php
<?php
namespace Database\Factories;

use App\Models\SpecType;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<SpecType> */
class SpecTypeFactory extends Factory
{
    protected $model = SpecType::class;

    public function definition(): array
    {
        return [
            'name' => fake()->unique()->word(),
            'unit' => null,
        ];
    }
}
```

- [ ] **Step 5: Add `HasFactory` to Product and SpecType models**

In `aroma-api/app/Models/Product.php`, add to imports:
```php
use Illuminate\Database\Eloquent\Factories\HasFactory;
```
Add `use HasFactory;` inside the `Product` class body.

In `aroma-api/app/Models/SpecType.php`, add to imports:
```php
use Illuminate\Database\Eloquent\Factories\HasFactory;
```
Add `use HasFactory;` inside the `SpecType` class body.

In `aroma-api/app/Models/ProductVariant.php`, add to imports:
```php
use Illuminate\Database\Eloquent\Factories\HasFactory;
```
Add `use HasFactory;` inside the `ProductVariant` class body.

- [ ] **Step 6: Check CategoryFactory exists; if not, create it**

```bash
cat aroma-api/database/factories/CategoryFactory.php
```

If the file exists, confirm it creates a Category with at least `label`, `slug`, and `bg`. If `CategoryFactory.php` doesn't exist or is missing those fields, create/update it:

```php
// aroma-api/database/factories/CategoryFactory.php
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
        $label = fake()->word();
        return [
            'label' => $label,
            'slug'  => Str::slug($label) . '-' . fake()->unique()->numberBetween(1, 9999),
            'bg'    => fake()->hexColor(),
        ];
    }
}
```

Also add `use HasFactory;` to `aroma-api/app/Models/Category.php` if it's not already there.

- [ ] **Step 7: Verify VariantGeneratorService cartesian logic with artisan tinker**

```bash
cd aroma-api && php artisan tinker --execute="
use App\Services\VariantGeneratorService;
\$svc = new VariantGeneratorService;
\$ref = new ReflectionMethod(\$svc, 'cartesian');
\$ref->setAccessible(true);
\$result = \$ref->invoke(\$svc, [['30','50'],['Gold','Silver']]);
echo count(\$result) . ' combinations\n'; // expect 4
echo \$result[0][0] . '/' . \$result[0][1] . '\n'; // expect 30/Gold
echo \$ref->invoke(\$svc, []) === [[]] ? 'empty OK' : 'empty FAIL';
"
```

Expected output:
```
4 combinations
30/Gold
empty OK
```

- [ ] **Step 8: Commit**

```bash
git add aroma-api/app/Services/VariantGeneratorService.php \
        aroma-api/database/factories/ProductFactory.php \
        aroma-api/database/factories/ProductVariantFactory.php \
        aroma-api/database/factories/SpecTypeFactory.php \
        aroma-api/database/factories/CategoryFactory.php \
        aroma-api/app/Models/Product.php \
        aroma-api/app/Models/ProductVariant.php \
        aroma-api/app/Models/SpecType.php
git commit -m "feat: add VariantGeneratorService, ProductFactory, ProductVariantFactory, SpecTypeFactory"
```

---

## Task 4: AdminSpecTypeController

**Files:**
- Create: `aroma-api/app/Http/Controllers/Api/Admin/AdminSpecTypeController.php`
- Create: `aroma-api/tests/Feature/AdminSpecTypeTest.php`
- Modify: `aroma-api/routes/api.php`

- [ ] **Step 1: Write the failing test**

```php
// aroma-api/tests/Feature/AdminSpecTypeTest.php
<?php
namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductSpecAssignment;
use App\Models\SpecType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSpecTypeTest extends TestCase
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

    public function test_index_lists_spec_types_with_product_count(): void
    {
        $size  = SpecType::factory()->create(['name' => 'Size', 'unit' => 'ml']);
        $color = SpecType::factory()->create(['name' => 'Color', 'unit' => null]);
        $product = Product::factory()->create();
        ProductSpecAssignment::create(['product_id' => $product->id, 'spec_type_id' => $size->id, 'sort_order' => 0]);

        $res = $this->asAdmin()->getJson('/api/admin/spec-types')->assertOk();
        $this->assertCount(2, $res->json());
        $sizeRow = collect($res->json())->firstWhere('id', $size->id);
        $this->assertEquals('Size', $sizeRow['name']);
        $this->assertEquals('ml', $sizeRow['unit']);
        $this->assertEquals(1, $sizeRow['productCount']);
    }

    public function test_store_creates_spec_type(): void
    {
        $this->asAdmin()->postJson('/api/admin/spec-types', ['name' => 'Weight', 'unit' => 'g'])
            ->assertCreated()
            ->assertJsonPath('name', 'Weight')
            ->assertJsonPath('unit', 'g');

        $this->assertDatabaseHas('spec_types', ['name' => 'Weight', 'unit' => 'g']);
    }

    public function test_store_requires_name(): void
    {
        $this->asAdmin()->postJson('/api/admin/spec-types', ['unit' => 'ml'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }

    public function test_update_changes_name_and_unit(): void
    {
        $spec = SpecType::factory()->create(['name' => 'Old', 'unit' => null]);

        $this->asAdmin()->putJson("/api/admin/spec-types/{$spec->id}", ['name' => 'New', 'unit' => 'kg'])
            ->assertOk()
            ->assertJsonPath('name', 'New')
            ->assertJsonPath('unit', 'kg');

        $this->assertDatabaseHas('spec_types', ['id' => $spec->id, 'name' => 'New', 'unit' => 'kg']);
    }

    public function test_destroy_deletes_unused_spec_type(): void
    {
        $spec = SpecType::factory()->create();

        $this->asAdmin()->deleteJson("/api/admin/spec-types/{$spec->id}")->assertNoContent();

        $this->assertDatabaseMissing('spec_types', ['id' => $spec->id]);
    }

    public function test_destroy_blocks_spec_type_in_use(): void
    {
        $spec    = SpecType::factory()->create();
        $product = Product::factory()->create();
        ProductSpecAssignment::create(['product_id' => $product->id, 'spec_type_id' => $spec->id, 'sort_order' => 0]);

        $this->asAdmin()->deleteJson("/api/admin/spec-types/{$spec->id}")
            ->assertUnprocessable()
            ->assertJsonPath('message', fn($msg) => str_contains($msg, '1 product'));

        $this->assertDatabaseHas('spec_types', ['id' => $spec->id]);
    }

    public function test_non_admin_cannot_access(): void
    {
        $user = User::factory()->create(['is_admin' => false]);
        $this->actingAs($user, 'sanctum')->getJson('/api/admin/spec-types')->assertForbidden();
    }
}
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd aroma-api && php artisan test tests/Feature/AdminSpecTypeTest.php 2>&1 | tail -20
```

Expected: Multiple FAILED errors — route not found (404).

- [ ] **Step 3: Create AdminSpecTypeController**

```php
// aroma-api/app/Http/Controllers/Api/Admin/AdminSpecTypeController.php
<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProductSpecAssignment;
use App\Models\SpecType;
use Illuminate\Http\Request;

class AdminSpecTypeController extends Controller
{
    public function index()
    {
        $specs = SpecType::withCount('assignments as product_count')->orderBy('name')->get();

        return response()->json($specs->map(fn($s) => [
            'id'           => $s->id,
            'name'         => $s->name,
            'unit'         => $s->unit,
            'productCount' => $s->product_count,
        ]));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'unit' => 'nullable|string|max:20',
        ]);
        $spec = SpecType::create($data);
        return response()->json($this->fmt($spec), 201);
    }

    public function update(Request $request, int $id)
    {
        $spec = SpecType::findOrFail($id);
        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'unit' => 'nullable|string|max:20',
        ]);
        $spec->update($data);
        return response()->json($this->fmt($spec->fresh()));
    }

    public function destroy(int $id)
    {
        $spec  = SpecType::findOrFail($id);
        $count = ProductSpecAssignment::where('spec_type_id', $id)->count();

        if ($count > 0) {
            return response()->json(
                ['message' => "This spec type is assigned to {$count} product(s) and cannot be deleted."],
                422
            );
        }

        $spec->delete();
        return response()->json(null, 204);
    }

    private function fmt(SpecType $s): array
    {
        return ['id' => $s->id, 'name' => $s->name, 'unit' => $s->unit, 'productCount' => 0];
    }
}
```

- [ ] **Step 4: Register routes in api.php**

In `aroma-api/routes/api.php`, inside the `Route::middleware(['auth:sanctum', 'is_admin'])->prefix('admin')` group, add after the coupon routes and update the `use` import:

Add `AdminSpecTypeController` to the existing `use` import block at the bottom of the file:
```php
use App\Http\Controllers\Api\Admin\{
    AdminDashboardController, AdminOrderController, AdminProductController,
    AdminBrandController, AdminCategoryController, AdminUserController,
    AdminProductVariantController, AdminProductImageController,
    AdminUserDetailController, AdminCouponController,
    AdminSpecTypeController,
};
```

Add these routes inside the admin group:
```php
Route::get('/spec-types',        [AdminSpecTypeController::class, 'index']);
Route::post('/spec-types',       [AdminSpecTypeController::class, 'store']);
Route::put('/spec-types/{id}',   [AdminSpecTypeController::class, 'update']);
Route::delete('/spec-types/{id}',[AdminSpecTypeController::class, 'destroy']);
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd aroma-api && php artisan test tests/Feature/AdminSpecTypeTest.php 2>&1 | tail -20
```

Expected: All 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add aroma-api/app/Http/Controllers/Api/Admin/AdminSpecTypeController.php \
        aroma-api/tests/Feature/AdminSpecTypeTest.php \
        aroma-api/routes/api.php
git commit -m "feat: add AdminSpecTypeController with CRUD and in-use delete guard"
```

---

## Task 5: AdminProductSpecController + AdminProductVariantGenerateController

**Files:**
- Create: `aroma-api/app/Http/Controllers/Api/Admin/AdminProductSpecController.php`
- Create: `aroma-api/app/Http/Controllers/Api/Admin/AdminProductVariantGenerateController.php`
- Create: `aroma-api/tests/Feature/AdminProductSpecTest.php`
- Create: `aroma-api/tests/Feature/AdminVariantGenerateTest.php`
- Modify: `aroma-api/routes/api.php`

- [ ] **Step 1: Write the failing product spec test**

```php
// aroma-api/tests/Feature/AdminProductSpecTest.php
<?php
namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductSpecAssignment;
use App\Models\ProductSpecValue;
use App\Models\SpecType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminProductSpecTest extends TestCase
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

    public function test_get_specs_returns_empty_for_new_product(): void
    {
        $product = Product::factory()->create();

        $res = $this->asAdmin()->getJson("/api/admin/products/{$product->id}/specs")->assertOk();
        $this->assertEquals([], $res->json('specs'));
    }

    public function test_put_specs_saves_assignments_and_values(): void
    {
        $product = Product::factory()->create();
        $size    = SpecType::factory()->create(['name' => 'Size', 'unit' => 'ml']);
        $color   = SpecType::factory()->create(['name' => 'Color', 'unit' => null]);

        $this->asAdmin()->putJson("/api/admin/products/{$product->id}/specs", [
            'specs' => [
                ['spec_type_id' => $size->id,  'values' => ['30', '50']],
                ['spec_type_id' => $color->id, 'values' => ['Gold']],
            ],
        ])->assertOk();

        $this->assertDatabaseHas('product_spec_assignments', ['product_id' => $product->id, 'spec_type_id' => $size->id, 'sort_order' => 0]);
        $this->assertDatabaseHas('product_spec_assignments', ['product_id' => $product->id, 'spec_type_id' => $color->id, 'sort_order' => 1]);
        $this->assertDatabaseHas('product_spec_values', ['product_id' => $product->id, 'spec_type_id' => $size->id, 'value' => '30', 'sort_order' => 0]);
        $this->assertDatabaseHas('product_spec_values', ['product_id' => $product->id, 'spec_type_id' => $size->id, 'value' => '50', 'sort_order' => 1]);
    }

    public function test_put_specs_replaces_existing_assignments(): void
    {
        $product = Product::factory()->create();
        $size    = SpecType::factory()->create(['name' => 'Size', 'unit' => 'ml']);
        $color   = SpecType::factory()->create(['name' => 'Color', 'unit' => null]);

        // Set initial spec
        $this->asAdmin()->putJson("/api/admin/products/{$product->id}/specs", [
            'specs' => [['spec_type_id' => $size->id, 'values' => ['30']]],
        ])->assertOk();

        // Replace with a different spec
        $this->asAdmin()->putJson("/api/admin/products/{$product->id}/specs", [
            'specs' => [['spec_type_id' => $color->id, 'values' => ['Gold']]],
        ])->assertOk();

        $this->assertDatabaseMissing('product_spec_assignments', ['product_id' => $product->id, 'spec_type_id' => $size->id]);
        $this->assertDatabaseHas('product_spec_assignments', ['product_id' => $product->id, 'spec_type_id' => $color->id]);
    }

    public function test_get_specs_returns_assignments_with_values(): void
    {
        $product = Product::factory()->create();
        $size    = SpecType::factory()->create(['name' => 'Size', 'unit' => 'ml']);
        ProductSpecAssignment::create(['product_id' => $product->id, 'spec_type_id' => $size->id, 'sort_order' => 0]);
        ProductSpecValue::create(['product_id' => $product->id, 'spec_type_id' => $size->id, 'value' => '30', 'sort_order' => 0]);
        ProductSpecValue::create(['product_id' => $product->id, 'spec_type_id' => $size->id, 'value' => '50', 'sort_order' => 1]);

        $res = $this->asAdmin()->getJson("/api/admin/products/{$product->id}/specs")->assertOk();
        $spec = $res->json('specs.0');
        $this->assertEquals($size->id, $spec['spec_type_id']);
        $this->assertEquals('Size', $spec['name']);
        $this->assertEquals('ml', $spec['unit']);
        $this->assertCount(2, $spec['values']);
        $this->assertEquals('30', $spec['values'][0]['value']);
    }
}
```

- [ ] **Step 2: Write the failing variant generate test**

```php
// aroma-api/tests/Feature/AdminVariantGenerateTest.php
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

class AdminVariantGenerateTest extends TestCase
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

    private function setupProductWithSpecs(Product $product): void
    {
        $size  = SpecType::factory()->create(['name' => 'Size', 'unit' => 'ml']);
        $color = SpecType::factory()->create(['name' => 'Color', 'unit' => null]);

        ProductSpecAssignment::create(['product_id' => $product->id, 'spec_type_id' => $size->id, 'sort_order' => 0]);
        ProductSpecAssignment::create(['product_id' => $product->id, 'spec_type_id' => $color->id, 'sort_order' => 1]);

        ProductSpecValue::create(['product_id' => $product->id, 'spec_type_id' => $size->id, 'value' => '30', 'sort_order' => 0]);
        ProductSpecValue::create(['product_id' => $product->id, 'spec_type_id' => $size->id, 'value' => '50', 'sort_order' => 1]);
        ProductSpecValue::create(['product_id' => $product->id, 'spec_type_id' => $color->id, 'value' => 'Gold', 'sort_order' => 0]);
        ProductSpecValue::create(['product_id' => $product->id, 'spec_type_id' => $color->id, 'value' => 'Silver', 'sort_order' => 1]);
    }

    public function test_generate_creates_cartesian_product_variants(): void
    {
        $product = Product::factory()->create();
        $this->setupProductWithSpecs($product);

        $res = $this->asAdmin()
            ->postJson("/api/admin/products/{$product->id}/variants/generate")
            ->assertOk();

        $this->assertCount(4, $res->json()); // 2 sizes × 2 colors
        $this->assertEquals(4, ProductVariant::where('product_id', $product->id)->count());
        $this->assertEquals(8, \App\Models\VariantSpecValue::whereIn(
            'variant_id',
            ProductVariant::where('product_id', $product->id)->pluck('id')
        )->count()); // 4 variants × 2 specs
    }

    public function test_generate_sets_first_variant_as_default(): void
    {
        $product = Product::factory()->create();
        $this->setupProductWithSpecs($product);

        $this->asAdmin()->postJson("/api/admin/products/{$product->id}/variants/generate")->assertOk();

        $this->assertEquals(1, ProductVariant::where('product_id', $product->id)->where('is_default', true)->count());
    }

    public function test_generate_returns_409_when_variants_exist_without_force(): void
    {
        $product = Product::factory()->create();
        $this->setupProductWithSpecs($product);
        ProductVariant::factory()->create(['product_id' => $product->id]);

        $res = $this->asAdmin()
            ->postJson("/api/admin/products/{$product->id}/variants/generate")
            ->assertStatus(409);

        $this->assertEquals(1, $res->json('existing_count'));
    }

    public function test_generate_with_force_deletes_and_regenerates(): void
    {
        $product = Product::factory()->create();
        $this->setupProductWithSpecs($product);
        ProductVariant::factory()->create(['product_id' => $product->id]);

        $this->asAdmin()
            ->postJson("/api/admin/products/{$product->id}/variants/generate?force=true")
            ->assertOk();

        $this->assertEquals(4, ProductVariant::where('product_id', $product->id)->count());
    }

    public function test_generate_returns_422_when_spec_has_no_values(): void
    {
        $product = Product::factory()->create();
        $size    = SpecType::factory()->create(['name' => 'Size', 'unit' => 'ml']);
        ProductSpecAssignment::create(['product_id' => $product->id, 'spec_type_id' => $size->id, 'sort_order' => 0]);
        // No ProductSpecValues created

        $this->asAdmin()
            ->postJson("/api/admin/products/{$product->id}/variants/generate")
            ->assertUnprocessable();
    }

    public function test_generate_for_product_with_no_specs_creates_one_default_variant(): void
    {
        $product = Product::factory()->create();
        // No spec assignments

        $res = $this->asAdmin()
            ->postJson("/api/admin/products/{$product->id}/variants/generate")
            ->assertOk();

        $this->assertCount(1, $res->json());
        $this->assertEquals(1, ProductVariant::where('product_id', $product->id)->count());
    }
}
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd aroma-api && php artisan test tests/Feature/AdminProductSpecTest.php tests/Feature/AdminVariantGenerateTest.php 2>&1 | tail -20
```

Expected: All FAILED (routes not found).

- [ ] **Step 4: Create AdminProductSpecController**

```php
// aroma-api/app/Http/Controllers/Api/Admin/AdminProductSpecController.php
<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductSpecAssignment;
use App\Models\ProductSpecValue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminProductSpecController extends Controller
{
    public function show(int $productId)
    {
        $product     = Product::findOrFail($productId);
        $assignments = ProductSpecAssignment::with('specType')
            ->where('product_id', $productId)
            ->orderBy('sort_order')
            ->get();

        $specs = $assignments->map(function ($assignment) use ($productId) {
            $values = ProductSpecValue::where('product_id', $productId)
                ->where('spec_type_id', $assignment->spec_type_id)
                ->orderBy('sort_order')
                ->get(['id', 'value', 'sort_order']);

            return [
                'spec_type_id' => $assignment->spec_type_id,
                'name'         => $assignment->specType->name,
                'unit'         => $assignment->specType->unit,
                'sort_order'   => $assignment->sort_order,
                'values'       => $values,
            ];
        });

        return response()->json(['specs' => $specs]);
    }

    public function update(Request $request, int $productId)
    {
        Product::findOrFail($productId);

        $data = $request->validate([
            'specs'                    => 'present|array',
            'specs.*.spec_type_id'     => 'required|integer|exists:spec_types,id',
            'specs.*.values'           => 'required|array|min:1',
            'specs.*.values.*'         => 'required|string|max:100',
        ]);

        DB::transaction(function () use ($data, $productId) {
            ProductSpecAssignment::where('product_id', $productId)->delete();
            ProductSpecValue::where('product_id', $productId)->delete();

            foreach ($data['specs'] as $idx => $spec) {
                ProductSpecAssignment::create([
                    'product_id'   => $productId,
                    'spec_type_id' => $spec['spec_type_id'],
                    'sort_order'   => $idx,
                ]);

                foreach ($spec['values'] as $valueIdx => $value) {
                    ProductSpecValue::create([
                        'product_id'   => $productId,
                        'spec_type_id' => $spec['spec_type_id'],
                        'value'        => $value,
                        'sort_order'   => $valueIdx,
                    ]);
                }
            }
        });

        return response()->json(['ok' => true]);
    }
}
```

- [ ] **Step 5: Create AdminProductVariantGenerateController**

```php
// aroma-api/app/Http/Controllers/Api/Admin/AdminProductVariantGenerateController.php
<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\VariantGeneratorService;
use Illuminate\Http\Request;

class AdminProductVariantGenerateController extends Controller
{
    public function __construct(private VariantGeneratorService $generator) {}

    public function __invoke(Request $request, int $productId)
    {
        $product         = Product::findOrFail($productId);
        $existingCount   = ProductVariant::where('product_id', $productId)->count();
        $force           = filter_var($request->query('force', 'false'), FILTER_VALIDATE_BOOLEAN);

        if ($existingCount > 0 && !$force) {
            return response()->json(['existing_count' => $existingCount], 409);
        }

        if ($existingCount > 0 && $force) {
            ProductVariant::where('product_id', $productId)->delete();
        }

        try {
            $variants = $this->generator->generate($product);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $specOrder = $product->specAssignments()->orderBy('sort_order')->pluck('spec_type_id')->toArray();

        return response()->json(
            collect($variants)->map(fn($v) => $this->fmt($v, $specOrder))
        );
    }

    private function fmt($variant, array $specOrder): array
    {
        $specs = $variant->specValues
            ->sortBy(fn($sv) => array_search($sv->spec_type_id, $specOrder) ?? 999)
            ->map(fn($sv) => [
                'name'  => $sv->specType->name,
                'unit'  => $sv->specType->unit,
                'value' => $sv->value,
            ])->values()->toArray();

        return [
            'id'                => $variant->id,
            'productId'         => $variant->product_id,
            'price'             => $variant->price,
            'originalPrice'     => $variant->original_price,
            'quantity'          => $variant->quantity,
            'lowStockThreshold' => $variant->low_stock_threshold,
            'stock'             => $variant->stock?->value,
            'isDefault'         => (bool) $variant->is_default,
            'specs'             => $specs,
        ];
    }
}
```

- [ ] **Step 6: Register routes in api.php**

Add `AdminProductSpecController` and `AdminProductVariantGenerateController` to the `use` import block at the bottom of `aroma-api/routes/api.php`:

```php
use App\Http\Controllers\Api\Admin\{
    AdminDashboardController, AdminOrderController, AdminProductController,
    AdminBrandController, AdminCategoryController, AdminUserController,
    AdminProductVariantController, AdminProductImageController,
    AdminUserDetailController, AdminCouponController,
    AdminSpecTypeController, AdminProductSpecController,
    AdminProductVariantGenerateController,
};
```

Inside the admin route group, add after the existing variant routes:
```php
Route::get('/products/{productId}/specs',    [AdminProductSpecController::class, 'show']);
Route::put('/products/{productId}/specs',    [AdminProductSpecController::class, 'update']);
Route::post('/products/{productId}/variants/generate', AdminProductVariantGenerateController::class);
```

- [ ] **Step 7: Run tests to confirm they pass**

```bash
cd aroma-api && php artisan test tests/Feature/AdminProductSpecTest.php tests/Feature/AdminVariantGenerateTest.php 2>&1 | tail -20
```

Expected: All 9 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add aroma-api/app/Http/Controllers/Api/Admin/AdminProductSpecController.php \
        aroma-api/app/Http/Controllers/Api/Admin/AdminProductVariantGenerateController.php \
        aroma-api/tests/Feature/AdminProductSpecTest.php \
        aroma-api/tests/Feature/AdminVariantGenerateTest.php \
        aroma-api/routes/api.php
git commit -m "feat: add AdminProductSpecController, AdminProductVariantGenerateController, and routes"
```

---

## Task 6: Update AdminProductVariantController

**Files:**
- Modify: `aroma-api/app/Http/Controllers/Api/Admin/AdminProductVariantController.php`
- Modify: `aroma-api/routes/api.php` — remove the `store` route

- [ ] **Step 1: Replace AdminProductVariantController**

Replace the entire file `aroma-api/app/Http/Controllers/Api/Admin/AdminProductVariantController.php` with:

```php
<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductSpecAssignment;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminProductVariantController extends Controller
{
    public function index(int $productId)
    {
        $product   = Product::findOrFail($productId);
        $specOrder = $this->getSpecOrder($productId);

        return response()->json(
            $product->variants()
                ->with('specValues.specType')
                ->orderBy('id')
                ->get()
                ->map(fn($v) => $this->fmt($v, $specOrder))
        );
    }

    public function update(Request $request, int $productId, int $variantId)
    {
        $variant = ProductVariant::where('product_id', $productId)->findOrFail($variantId);
        $data = $request->validate([
            'price'               => 'sometimes|numeric|min:0',
            'original_price'      => 'nullable|numeric|min:0',
            'quantity'            => 'sometimes|integer|min:0',
            'low_stock_threshold' => 'sometimes|integer|min:0',
        ]);
        $variant->update($data);
        $specOrder = $this->getSpecOrder($productId);
        return response()->json($this->fmt($variant->fresh()->load('specValues.specType'), $specOrder));
    }

    public function setDefault(int $productId, int $variantId)
    {
        $variant = ProductVariant::where('product_id', $productId)->findOrFail($variantId);
        DB::transaction(function () use ($variant, $productId) {
            ProductVariant::where('product_id', $productId)->update(['is_default' => false]);
            $variant->updateQuietly(['is_default' => true]);
        });
        $specOrder = $this->getSpecOrder($productId);
        return response()->json($this->fmt($variant->fresh()->load('specValues.specType'), $specOrder));
    }

    public function destroy(int $productId, int $variantId)
    {
        $variant    = ProductVariant::where('product_id', $productId)->findOrFail($variantId);
        $wasDefault = $variant->is_default;
        $variant->delete();

        if ($wasDefault) {
            $next = ProductVariant::where('product_id', $productId)->orderBy('id')->first();
            $next?->updateQuietly(['is_default' => true]);
        }

        return response()->json(null, 204);
    }

    private function getSpecOrder(int $productId): array
    {
        return ProductSpecAssignment::where('product_id', $productId)
            ->orderBy('sort_order')
            ->pluck('spec_type_id')
            ->toArray();
    }

    private function fmt(ProductVariant $v, array $specOrder): array
    {
        if (!$v->relationLoaded('specValues')) {
            $v->load('specValues.specType');
        }

        $specs = $v->specValues
            ->sortBy(fn($sv) => array_search($sv->spec_type_id, $specOrder) !== false
                ? array_search($sv->spec_type_id, $specOrder)
                : 999
            )
            ->map(fn($sv) => [
                'name'  => $sv->specType->name,
                'unit'  => $sv->specType->unit,
                'value' => $sv->value,
            ])->values()->toArray();

        return [
            'id'                => $v->id,
            'productId'         => $v->product_id,
            'price'             => $v->price,
            'originalPrice'     => $v->original_price,
            'quantity'          => $v->quantity,
            'lowStockThreshold' => $v->low_stock_threshold,
            'stock'             => $v->stock?->value,
            'isDefault'         => (bool) $v->is_default,
            'specs'             => $specs,
        ];
    }
}
```

- [ ] **Step 2: Remove the variant store route**

In `aroma-api/routes/api.php`, remove this line from the admin group:
```php
Route::post('/products/{productId}/variants',               [AdminProductVariantController::class, 'store']);
```

- [ ] **Step 3: Run the full test suite to verify nothing broken**

```bash
cd aroma-api && php artisan test 2>&1 | tail -20
```

Expected: All tests PASS. If AdminCouponTest or AdminBrandTest fail, investigate — they should be unaffected by this change.

- [ ] **Step 4: Commit**

```bash
git add aroma-api/app/Http/Controllers/Api/Admin/AdminProductVariantController.php \
        aroma-api/routes/api.php
git commit -m "feat: update AdminProductVariantController — remove size, add specs array to response, remove store route"
```

---

## Task 7: Frontend Types + API + SpecTypesView + Router + Sidebar

**Files:**
- Modify: `aroma-admin/src/types/index.ts`
- Modify: `aroma-admin/src/api/admin.ts`
- Create: `aroma-admin/src/views/SpecTypesView.vue`
- Modify: `aroma-admin/src/router/index.ts`
- Modify: `aroma-admin/src/components/layout/Sidebar.vue`

- [ ] **Step 1: Update types/index.ts — add SpecType, ProductSpec, VariantSpec; update ProductVariant**

In `aroma-admin/src/types/index.ts`:

Replace the `ProductVariant` interface:
```typescript
export interface VariantSpec {
  name: string
  unit: string | null
  value: string
}

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
}
```

Add these new interfaces (after the `ProductImage` interface):
```typescript
export interface SpecType {
  id:           number
  name:         string
  unit:         string | null
  productCount: number
}

export interface ProductSpecValue {
  id:        number
  value:     string
  sort_order: number
}

export interface ProductSpec {
  spec_type_id: number
  name:         string
  unit:         string | null
  sort_order:   number
  values:       ProductSpecValue[]
}
```

- [ ] **Step 2: Update api/admin.ts — add spec type and product spec API calls**

Add these functions at the end of `aroma-admin/src/api/admin.ts` (also update the import at the top to include `SpecType` and `ProductSpec`):

First, add `SpecType` and `ProductSpec` to the import at line 1:
```typescript
import type {
  AdminUser, DashboardStats, AdminOrder, AdminProduct,
  AdminBrand, AdminCategory, AdminUserRow, PageMeta, ProductVariant, ProductImage,
  AdminCartItem, AdminWishlistProduct, ProductType, AdminCoupon, CouponOrder,
  SpecType, ProductSpec,
} from '../types'
```

Then add at the end of the file:
```typescript
// ── Spec Types ────────────────────────────────────────────────────────
export const apiGetSpecTypes = () =>
  client.get<SpecType[]>('/admin/spec-types')

export const apiCreateSpecType = (data: { name: string; unit?: string | null }) =>
  client.post<SpecType>('/admin/spec-types', data)

export const apiUpdateSpecType = (id: number, data: { name?: string; unit?: string | null }) =>
  client.put<SpecType>(`/admin/spec-types/${id}`, data)

export const apiDeleteSpecType = (id: number) =>
  client.delete(`/admin/spec-types/${id}`)

// ── Product Specs ─────────────────────────────────────────────────────
export const apiGetProductSpecs = (productId: number) =>
  client.get<{ specs: ProductSpec[] }>(`/admin/products/${productId}/specs`)

export const apiSaveProductSpecs = (productId: number, specs: Array<{
  spec_type_id: number
  values: string[]
}>) =>
  client.put(`/admin/products/${productId}/specs`, { specs })

export const apiGenerateVariants = (productId: number, force = false) =>
  client.post<ProductVariant[]>(
    `/admin/products/${productId}/variants/generate${force ? '?force=true' : ''}`
  )
```

- [ ] **Step 3: Create SpecTypesView.vue**

```vue
<!-- aroma-admin/src/views/SpecTypesView.vue -->
<template>
  <div class="space-y-4">
    <div v-if="loadError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ loadError }}
    </div>

    <div class="flex items-center gap-3">
      <div>
        <h1 class="text-sm font-semibold text-dash-text">Spec Types</h1>
        <p class="text-2xs text-dash-muted mt-0.5">Global list of product specification types (Size, Color, Weight…)</p>
      </div>
      <div class="ml-auto">
        <AButton size="sm" @click="openCreate"><Plus :size="14" /> New Spec Type</AButton>
      </div>
    </div>

    <ATable :columns="cols" :rows="specTypes" :loading="loading">
      <template #cell-unit="{ value }">
        <span class="text-dash-muted text-xs">{{ value ?? '—' }}</span>
      </template>
      <template #cell-productCount="{ value }">
        <span class="text-xs">{{ value }} product{{ value !== 1 ? 's' : '' }}</span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-1.5 justify-end">
          <AButton size="sm" variant="ghost" @click.stop="openEdit(row as SpecType)">Edit</AButton>
          <AButton
            size="sm"
            variant="danger"
            :disabled="(row as SpecType).productCount > 0"
            :title="(row as SpecType).productCount > 0 ? 'In use — cannot delete' : ''"
            @click.stop="confirmDelete(row as SpecType)"
          >Delete</AButton>
        </div>
      </template>
      <template #empty>
        <AEmptyState :icon="SlidersHorizontal" heading="No spec types yet" sub="Create spec types to use as product variant options" />
      </template>
    </ATable>

    <!-- Create / Edit modal -->
    <AModal :open="modalOpen" :title="editing ? 'Edit Spec Type' : 'New Spec Type'" @close="modalOpen = false">
      <form class="space-y-3" @submit.prevent>
        <AInput v-model="form.name" label="Name" placeholder="e.g. Size, Color, Weight" :error="formErrors.name" />
        <AInput v-model="form.unit" label="Unit (optional)" placeholder="e.g. ml, g, oz" />
        <p class="text-2xs text-dash-muted">Unit is appended to variant values when displayed (e.g. "30ml").</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="modalOpen = false">Cancel</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">{{ editing ? 'Save' : 'Create' }}</AButton>
      </template>
    </AModal>

    <AConfirmDialog
      :open="!!deleting"
      title="Delete spec type?"
      message="This spec type will be permanently removed."
      :loading="deleteLoading"
      @confirm="handleDelete"
      @cancel="deleting = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, SlidersHorizontal } from 'lucide-vue-next'
import { apiGetSpecTypes, apiCreateSpecType, apiUpdateSpecType, apiDeleteSpecType } from '../api/admin'
import type { SpecType } from '../types'
import ATable         from '../components/ui/ATable.vue'
import AButton        from '../components/ui/AButton.vue'
import AInput         from '../components/ui/AInput.vue'
import AModal         from '../components/ui/AModal.vue'
import AEmptyState    from '../components/ui/AEmptyState.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'

const specTypes   = ref<SpecType[]>([])
const loading     = ref(true)
const loadError   = ref<string | null>(null)
const modalOpen   = ref(false)
const editing     = ref<SpecType | null>(null)
const saving      = ref(false)
const deleting    = ref<SpecType | null>(null)
const deleteLoading = ref(false)
const formErrors  = ref<Record<string, string>>({})

const emptyForm = () => ({ name: '', unit: '' })
const form = ref(emptyForm())

const cols = [
  { key: 'name',         label: 'Name' },
  { key: 'unit',         label: 'Unit' },
  { key: 'productCount', label: 'In Use' },
]

async function load() {
  loading.value = true
  loadError.value = null
  try {
    const res = await apiGetSpecTypes()
    specTypes.value = res.data
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load spec types.'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = emptyForm()
  formErrors.value = {}
  modalOpen.value = true
}

function openEdit(spec: SpecType) {
  editing.value = spec
  form.value = { name: spec.name, unit: spec.unit ?? '' }
  formErrors.value = {}
  modalOpen.value = true
}

async function handleSave() {
  formErrors.value = {}
  if (!form.value.name.trim()) {
    formErrors.value.name = 'Name is required'
    return
  }
  saving.value = true
  try {
    const payload = { name: form.value.name.trim(), unit: form.value.unit.trim() || null }
    if (editing.value) {
      const res = await apiUpdateSpecType(editing.value.id, payload)
      specTypes.value = specTypes.value.map(s => s.id === editing.value!.id ? { ...s, ...res.data } : s)
    } else {
      await load()
      await apiCreateSpecType(payload)
      await load()
    }
    modalOpen.value = false
  } catch (e: unknown) {
    formErrors.value.name = e instanceof Error ? e.message : 'Save failed.'
  } finally {
    saving.value = false
  }
}

function confirmDelete(spec: SpecType) { deleting.value = spec }

async function handleDelete() {
  if (!deleting.value) return
  deleteLoading.value = true
  try {
    await apiDeleteSpecType(deleting.value.id)
    specTypes.value = specTypes.value.filter(s => s.id !== deleting.value!.id)
    deleting.value = null
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Delete failed.'
    deleting.value = null
  } finally {
    deleteLoading.value = false
  }
}

onMounted(load)
</script>
```

Note: The `handleSave` for create calls `load()` after create. Fix this to be consistent:

```typescript
async function handleSave() {
  formErrors.value = {}
  if (!form.value.name.trim()) {
    formErrors.value.name = 'Name is required'
    return
  }
  saving.value = true
  try {
    const payload = { name: form.value.name.trim(), unit: form.value.unit.trim() || null }
    if (editing.value) {
      const res = await apiUpdateSpecType(editing.value.id, payload)
      specTypes.value = specTypes.value.map(s =>
        s.id === editing.value!.id ? { ...s, name: res.data.name, unit: res.data.unit } : s
      )
    } else {
      const res = await apiCreateSpecType(payload)
      specTypes.value = [...specTypes.value, { ...res.data, productCount: 0 }]
    }
    modalOpen.value = false
  } catch (e: unknown) {
    formErrors.value.name = e instanceof Error ? e.message : 'Save failed.'
  } finally {
    saving.value = false
  }
}
```

Use this corrected version in the file above.

- [ ] **Step 4: Add route to router/index.ts**

In `aroma-admin/src/router/index.ts`, add inside the `children` array:
```typescript
{ path: 'spec-types', name: 'spec-types', component: () => import('../views/SpecTypesView.vue') },
```

- [ ] **Step 5: Add Spec Types to Sidebar.vue**

In `aroma-admin/src/components/layout/Sidebar.vue`, add `SlidersHorizontal` to the import:
```typescript
import { LayoutDashboard, ShoppingBag, Package, Tag, Grid3X3, Users, Ticket, SlidersHorizontal } from 'lucide-vue-next'
```

Add to `catalogItems`:
```typescript
const catalogItems = [
  { to: '/products',    label: 'Products',    icon: Package },
  { to: '/spec-types',  label: 'Spec Types',  icon: SlidersHorizontal },
  { to: '/brands',      label: 'Brands',      icon: Tag },
  { to: '/categories',  label: 'Categories',  icon: Grid3X3 },
  { to: '/coupons',     label: 'Coupons',     icon: Ticket },
]
```

- [ ] **Step 6: Start the dev server and verify SpecTypesView in browser**

```bash
cd aroma-admin && npm run dev
```

Open `http://localhost:5173/spec-types` (or whatever port is shown). Verify:
- Page loads with empty state
- "New Spec Type" button opens modal
- Creating a spec type adds it to the list
- Edit updates inline
- Delete with productCount > 0 shows disabled button
- Sidebar shows "Spec Types" link

- [ ] **Step 7: Commit**

```bash
git add aroma-admin/src/types/index.ts \
        aroma-admin/src/api/admin.ts \
        aroma-admin/src/views/SpecTypesView.vue \
        aroma-admin/src/router/index.ts \
        aroma-admin/src/components/layout/Sidebar.vue
git commit -m "feat: add SpecTypesView, update types and API for spec types and product specs"
```

---

## Task 8: ProductVariantsView — Specs Section + Updated Table/Modal

**Files:**
- Modify: `aroma-admin/src/views/ProductVariantsView.vue`

This task fully replaces the variants section logic. Read the current file before editing.

- [ ] **Step 1: Replace ProductVariantsView.vue**

Replace the entire `aroma-admin/src/views/ProductVariantsView.vue` with:

```vue
<template>
  <div class="space-y-6 max-w-4xl">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-xs">
      <RouterLink to="/products" class="text-dash-faint hover:text-dash-text transition-colors">Products</RouterLink>
      <span class="text-dash-border">/</span>
      <span class="text-dash-text font-medium">Variants &amp; Images</span>
    </div>

    <!-- Error -->
    <div v-if="loadError" class="rounded-card bg-dash-danger-lt border border-dash-danger/20 px-4 py-3 text-xs text-dash-danger">
      {{ loadError }}
    </div>

    <!-- ── Images ──────────────────────────────────── -->
    <div class="bg-dash-surface rounded-card shadow-card p-5">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-sm font-semibold text-dash-text">Images</h2>
          <p class="text-2xs text-dash-muted mt-0.5">Click any image to set it as the thumbnail</p>
        </div>
        <label class="cursor-pointer">
          <input type="file" accept="image/*" multiple class="sr-only" @change="handleUpload" :disabled="uploading" />
          <span
            :class="[
              'inline-flex items-center gap-1.5 rounded-btn px-3 py-1.5 text-xs font-medium transition-all duration-200',
              uploading
                ? 'bg-dash-border text-dash-faint cursor-not-allowed'
                : 'bg-dash-secondary text-white hover:bg-dash-secondary-dk shadow-sm cursor-pointer',
            ]"
          >
            <span v-if="uploading" class="inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
            <ImagePlus v-else :size="14" />
            Upload images
          </span>
        </label>
      </div>

      <div v-if="imagesLoading" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        <div v-for="i in 4" :key="i" class="aspect-square rounded-xl bg-dash-border animate-pulse" />
      </div>

      <div v-else-if="images.length" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        <div
          v-for="img in images"
          :key="img.id"
          class="group relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer"
          :class="img.isThumbnail ? 'border-dash-primary shadow-card' : 'border-dash-border hover:border-dash-primary/40'"
          @click="setThumbnail(img)"
        >
          <img :src="img.url" :alt="img.originalName ?? 'Product image'" class="h-full w-full object-cover" />
          <div v-if="img.isThumbnail" class="absolute top-1.5 left-1.5 bg-dash-primary text-white text-2xs font-semibold rounded-md px-1.5 py-0.5 flex items-center gap-1">
            <Star :size="9" /> Thumbnail
          </div>
          <button
            class="absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center rounded-lg bg-dash-text/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-dash-danger"
            @click.stop="deleteImage(img)"
          >
            <X :size="11" />
          </button>
        </div>
      </div>

      <div v-else class="flex flex-col items-center justify-center py-10 text-center">
        <div class="h-12 w-12 rounded-2xl bg-dash-border flex items-center justify-center text-dash-faint mb-3">
          <ImageOff :size="22" />
        </div>
        <p class="text-sm font-medium text-dash-text">No images yet</p>
        <p class="text-2xs text-dash-faint mt-1">Upload images using the button above</p>
      </div>
    </div>

    <!-- ── Specs ───────────────────────────────────── -->
    <div class="bg-dash-surface rounded-card shadow-card p-5 space-y-5">
      <div>
        <h2 class="text-sm font-semibold text-dash-text">Specs</h2>
        <p class="text-2xs text-dash-muted mt-0.5">Define what varies between variants (e.g. Size, Color). Leave empty for a single-variant product.</p>
      </div>

      <!-- Step 1: Assign specs -->
      <div>
        <p class="text-xs font-medium text-dash-text mb-2">Assign Specs</p>
        <div class="flex gap-2">
          <select
            v-model="specToAdd"
            class="flex-1 rounded-btn border border-dash-border bg-dash-bg px-3 py-1.5 text-xs text-dash-text focus:outline-none focus:border-dash-primary"
          >
            <option value="">Add a spec type…</option>
            <option
              v-for="s in availableSpecTypes"
              :key="s.id"
              :value="s.id"
            >{{ s.name }}{{ s.unit ? ` (${s.unit})` : '' }}</option>
          </select>
          <AButton size="sm" variant="secondary" :disabled="!specToAdd" @click="addSpec">Add</AButton>
        </div>

        <!-- Assigned spec chips -->
        <div v-if="assignedSpecs.length" class="mt-3 space-y-2">
          <div
            v-for="(spec, idx) in assignedSpecs"
            :key="spec.spec_type_id"
            class="flex items-center gap-2 px-3 py-2 rounded-btn border border-dash-border bg-dash-bg"
          >
            <span class="text-xs font-medium text-dash-text flex-1">
              {{ spec.name }}{{ spec.unit ? ` (${spec.unit})` : '' }}
            </span>
            <button
              :disabled="idx === 0"
              class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30"
              @click="moveSpec(idx, -1)"
            ><ChevronUp :size="12" /></button>
            <button
              :disabled="idx === assignedSpecs.length - 1"
              class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30"
              @click="moveSpec(idx, 1)"
            ><ChevronDown :size="12" /></button>
            <button
              class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-danger"
              @click="removeSpec(idx)"
            ><X :size="12" /></button>
          </div>
        </div>
      </div>

      <!-- Step 2: Define values -->
      <div v-if="assignedSpecs.length">
        <p class="text-xs font-medium text-dash-text mb-3">Define Values</p>
        <div class="space-y-4">
          <div v-for="spec in assignedSpecs" :key="spec.spec_type_id">
            <p class="text-2xs font-semibold text-dash-muted mb-1.5 uppercase tracking-wide">
              {{ spec.name }}{{ spec.unit ? ` (${spec.unit})` : '' }}
            </p>
            <!-- Tag chips -->
            <div class="flex flex-wrap gap-1.5 mb-2">
              <span
                v-for="(val, vi) in spec.values"
                :key="vi"
                class="inline-flex items-center gap-1 rounded-full border border-dash-border bg-dash-bg px-2.5 py-1 text-xs font-medium text-dash-text"
              >
                {{ val }}{{ spec.unit ? spec.unit : '' }}
                <button @click="removeValue(spec, vi)" class="text-dash-faint hover:text-dash-danger ml-0.5">
                  <X :size="10" />
                </button>
              </span>
            </div>
            <!-- Add value input -->
            <div class="flex gap-2">
              <input
                v-model="valueInputs[spec.spec_type_id]"
                type="text"
                :placeholder="`Add ${spec.name} value…`"
                class="flex-1 rounded-btn border border-dash-border bg-dash-bg px-3 py-1.5 text-xs text-dash-text focus:outline-none focus:border-dash-primary"
                @keydown.enter.prevent="addValue(spec)"
              />
              <AButton size="sm" variant="secondary" @click="addValue(spec)">Add</AButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Save + Generate row -->
      <div class="flex items-center gap-3 pt-1">
        <AButton size="sm" variant="secondary" :loading="savingSpecs" @click="saveSpecs">
          <Save :size="13" /> Save Specs &amp; Values
        </AButton>
        <AButton size="sm" :loading="generating" @click="clickGenerate">
          <Zap :size="13" /> Generate Variants
          <span v-if="combinationCount > 0" class="ml-1 text-2xs opacity-80">({{ combinationCount }})</span>
        </AButton>
      </div>
    </div>

    <!-- ── Variants ────────────────────────────────── -->
    <div class="bg-dash-surface rounded-card shadow-card p-5">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-sm font-semibold text-dash-text">Variants</h2>
          <p class="text-2xs text-dash-muted mt-0.5">Price and stock per variant</p>
        </div>
      </div>

      <ATable :columns="cols" :rows="variants" :loading="variantsLoading">
        <template #cell-label="{ row }">
          <span class="text-xs font-medium text-dash-text">{{ variantLabel(row as ProductVariant) }}</span>
        </template>
        <template #cell-stock="{ value }">
          <ABadge :status="typeof value === 'string' ? value : ''" />
        </template>
        <template #cell-price="{ value }">{{ Number(value).toFixed(2) }} LYD</template>
        <template #cell-originalPrice="{ value }">
          <span v-if="value">{{ Number(value).toFixed(2) }} LYD</span>
          <span v-else class="text-dash-faint">—</span>
        </template>
        <template #cell-quantity="{ value, row }">
          <span :class="getQtyClass(row as ProductVariant)">{{ value }}</span>
        </template>
        <template #cell-isDefault="{ value }">
          <span v-if="value" class="inline-flex items-center gap-1 text-2xs font-semibold text-dash-primary bg-dash-primary/10 rounded px-1.5 py-0.5">
            <Star :size="10" /> Default
          </span>
        </template>
        <template #actions="{ row }">
          <div class="flex gap-1.5 justify-end">
            <AButton v-if="!(row as ProductVariant).isDefault" size="sm" variant="ghost" @click.stop="setDefault(row as ProductVariant)" :loading="settingDefault === (row as ProductVariant).id">Default</AButton>
            <AButton size="sm" variant="ghost" @click.stop="openEdit(row as ProductVariant)">Edit</AButton>
            <AButton size="sm" variant="danger" @click.stop="confirmDeleteVariant(row as ProductVariant)">Delete</AButton>
          </div>
        </template>
        <template #empty>
          <AEmptyState :icon="Package" heading="No variants" sub="Save your specs and click Generate Variants" />
        </template>
      </ATable>
    </div>

    <!-- Edit variant modal -->
    <AModal :open="modalOpen" title="Edit Variant" @close="modalOpen = false">
      <form class="space-y-3" @submit.prevent>
        <!-- Spec label read-only -->
        <div v-if="editing && variantLabel(editing)" class="rounded-btn bg-dash-bg border border-dash-border px-3 py-2 text-xs font-medium text-dash-text">
          {{ variantLabel(editing) }}
        </div>
        <div class="grid grid-cols-2 gap-3">
          <AInput v-model="form.price"          label="Price (LYD)" type="number" step="0.01" :error="formErrors.price" />
          <AInput v-model="form.original_price" label="Original price (LYD)" type="number" step="0.01" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <AInput v-model="form.quantity"            label="Quantity in stock" type="number" min="0" :error="formErrors.quantity" />
          <AInput v-model="form.low_stock_threshold" label="Low stock threshold" type="number" min="0" />
        </div>
        <div class="flex items-center gap-2 text-2xs text-dash-muted pt-0.5">
          <span>Stock status will be:</span>
          <ABadge :status="previewStock" />
        </div>
        <p v-if="formErrors.general" class="text-xs text-dash-danger">{{ formErrors.general }}</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="modalOpen = false">Cancel</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">Save</AButton>
      </template>
    </AModal>

    <!-- Confirm generate when variants exist -->
    <AConfirmDialog
      :open="showGenerateConfirm"
      title="Regenerate variants?"
      :message="`This will permanently delete ${variants.length} existing variant${variants.length !== 1 ? 's' : ''} and regenerate from your current spec values. Continue?`"
      :loading="generating"
      @confirm="doGenerate(true)"
      @cancel="showGenerateConfirm = false"
    />

    <!-- Confirm delete variant -->
    <AConfirmDialog
      :open="!!deletingVariant"
      title="Delete variant?"
      message="This variant will be permanently removed."
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="deletingVariant = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, Package, ImagePlus, ImageOff, Star, X, ChevronUp, ChevronDown, Save, Zap } from 'lucide-vue-next'
import {
  apiGetVariants, apiUpdateVariant, apiDeleteVariant, apiSetDefaultVariant,
  apiGetImages, apiUploadImages, apiSetThumbnail, apiDeleteImage,
  apiGetSpecTypes, apiGetProductSpecs, apiSaveProductSpecs, apiGenerateVariants,
} from '../api/admin'
import type { ProductVariant, ProductImage, SpecType, ProductSpec } from '../types'
import ATable         from '../components/ui/ATable.vue'
import ABadge         from '../components/ui/ABadge.vue'
import AButton        from '../components/ui/AButton.vue'
import AInput         from '../components/ui/AInput.vue'
import AModal         from '../components/ui/AModal.vue'
import AEmptyState    from '../components/ui/AEmptyState.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'

const props     = defineProps<{ id: string }>()
const productId = Number(props.id)

// ── Images ────────────────────────────────────────────────
const images        = ref<ProductImage[]>([])
const imagesLoading = ref(true)
const uploading     = ref(false)
const loadError     = ref<string | null>(null)

async function loadImages() {
  imagesLoading.value = true
  try {
    const res = await apiGetImages(productId)
    images.value = res.data
  } catch { /* show empty state */ } finally {
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
    loadError.value = e instanceof Error ? e.message : 'Upload failed.'
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

// ── Specs ─────────────────────────────────────────────────
const allSpecTypes  = ref<SpecType[]>([])
const assignedSpecs = ref<Array<{ spec_type_id: number; name: string; unit: string | null; values: string[] }>>([])
const specToAdd     = ref<number | ''>('')
const valueInputs   = ref<Record<number, string>>({})
const savingSpecs   = ref(false)

const availableSpecTypes = computed(() =>
  allSpecTypes.value.filter(s => !assignedSpecs.value.some(a => a.spec_type_id === s.id))
)

const combinationCount = computed(() => {
  if (!assignedSpecs.value.length) return 1
  return assignedSpecs.value.reduce((acc, s) => acc * (s.values.length || 1), 1)
})

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
    // Init valueInputs
    assignedSpecs.value.forEach(s => { valueInputs.value[s.spec_type_id] = '' })
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load specs.'
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

async function saveSpecs() {
  savingSpecs.value = true
  try {
    await apiSaveProductSpecs(
      productId,
      assignedSpecs.value.map(s => ({ spec_type_id: s.spec_type_id, values: s.values }))
    )
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Failed to save specs.'
  } finally {
    savingSpecs.value = false
  }
}

// ── Generate ──────────────────────────────────────────────
const showGenerateConfirm = ref(false)
const generating          = ref(false)

function clickGenerate() {
  if (variants.value.length > 0) {
    showGenerateConfirm.value = true
  } else {
    doGenerate(false)
  }
}

async function doGenerate(force: boolean) {
  generating.value = true
  showGenerateConfirm.value = false
  try {
    // Save specs first, then generate
    await apiSaveProductSpecs(
      productId,
      assignedSpecs.value.map(s => ({ spec_type_id: s.spec_type_id, values: s.values }))
    )
    const res = await apiGenerateVariants(productId, force)
    variants.value = res.data
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Generation failed.'
  } finally {
    generating.value = false
  }
}

// ── Variants ──────────────────────────────────────────────
const variants        = ref<ProductVariant[]>([])
const variantsLoading = ref(true)
const modalOpen       = ref(false)
const editing         = ref<ProductVariant | null>(null)
const saving          = ref(false)
const deletingVariant = ref<ProductVariant | null>(null)
const deleting        = ref(false)
const formErrors      = ref<Record<string, string>>({})
const settingDefault  = ref<number | null>(null)

const emptyForm = () => ({ price: '', original_price: '', quantity: '0', low_stock_threshold: '5' })
const form = ref(emptyForm())

const cols = [
  { key: 'label',         label: 'Variant' },
  { key: 'price',         label: 'Price' },
  { key: 'originalPrice', label: 'Original' },
  { key: 'quantity',      label: 'Qty' },
  { key: 'stock',         label: 'Status' },
  { key: 'isDefault',     label: '' },
]

const previewStock = computed(() => {
  const qty       = Number(form.value.quantity) || 0
  const threshold = Number(form.value.low_stock_threshold) || 5
  if (qty === 0)        return 'out_of_stock'
  if (qty <= threshold) return 'low_stock'
  return 'in_stock'
})

function variantLabel(v: ProductVariant): string {
  if (!v.specs || v.specs.length === 0) return 'Default'
  return v.specs.map(s => s.unit ? `${s.value}${s.unit}` : s.value).join(' / ')
}

function getQtyClass(v: ProductVariant) {
  if (v.stock === 'out_of_stock') return 'text-dash-danger font-medium'
  if (v.stock === 'low_stock')    return 'text-dash-orange font-medium'
  return 'text-dash-text'
}

async function loadVariants() {
  if (!productId || isNaN(productId)) return
  variantsLoading.value = true
  loadError.value = null
  try {
    const res = await apiGetVariants(productId)
    variants.value = res.data
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load variants.'
  } finally {
    variantsLoading.value = false
  }
}

function openEdit(v: ProductVariant) {
  editing.value = v
  form.value = {
    price:               String(v.price),
    original_price:      v.originalPrice != null ? String(v.originalPrice) : '',
    quantity:            String(v.quantity),
    low_stock_threshold: String(v.lowStockThreshold),
  }
  formErrors.value = {}
  modalOpen.value  = true
}

async function handleSave() {
  formErrors.value = {}
  if (!form.value.price)    { formErrors.value.price    = 'Price is required'; return }
  if (form.value.quantity === '') { formErrors.value.quantity = 'Quantity is required'; return }

  const payload = {
    price:               Number(form.value.price),
    original_price:      form.value.original_price ? Number(form.value.original_price) : null,
    quantity:            Number(form.value.quantity),
    low_stock_threshold: Number(form.value.low_stock_threshold),
  }

  saving.value = true
  try {
    if (editing.value) {
      const res = await apiUpdateVariant(productId, editing.value.id, payload)
      variants.value = variants.value.map(v => v.id === editing.value!.id ? res.data : v)
    }
    modalOpen.value = false
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : 'Save failed.'
  } finally {
    saving.value = false
  }
}

async function setDefault(v: ProductVariant) {
  settingDefault.value = v.id
  try {
    await apiSetDefaultVariant(productId, v.id)
    variants.value = variants.value.map(x => ({ ...x, isDefault: x.id === v.id }))
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Failed to set default.'
  } finally {
    settingDefault.value = null
  }
}

function confirmDeleteVariant(v: ProductVariant) { deletingVariant.value = v }

async function handleDelete() {
  if (!deletingVariant.value) return
  deleting.value = true
  try {
    await apiDeleteVariant(productId, deletingVariant.value.id)
    variants.value = variants.value.filter(v => v.id !== deletingVariant.value!.id)
    deletingVariant.value = null
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Delete failed.'
  } finally {
    deleting.value = false
  }
}

onMounted(() => { loadImages(); loadSpecs(); loadVariants() })
watch(() => props.id, () => { loadImages(); loadSpecs(); loadVariants() })
</script>
```

- [ ] **Step 2: Verify the page in browser**

With the dev server running, navigate to a product's variants page (e.g., `http://localhost:5173/products/1/variants`). Verify:

1. **Specs section** loads — shows "Add a spec type…" dropdown populated with your spec types from `/spec-types`
2. Adding a spec adds a chip with up/down/remove controls
3. Defining values with Enter or Add button adds tag chips
4. "Save Specs & Values" button saves without errors (check Network tab)
5. "Generate Variants" shows the count (e.g. "Will create 4")
6. Clicking Generate with no existing variants creates them and shows them in the table
7. The Variant column shows "30ml / Gold" format
8. Clicking Generate again with existing variants shows the confirm modal
9. Confirming deletes and regenerates
10. Edit modal shows spec label read-only, no size field
11. Saving price/stock updates the row in the table
12. Delete variant removes the row

- [ ] **Step 3: Commit**

```bash
git add aroma-admin/src/views/ProductVariantsView.vue
git commit -m "feat: update ProductVariantsView with Specs section, Generate flow, and updated variant table"
```

---

## Self-Review Checklist (run after all tasks)

```bash
cd aroma-api && php artisan test 2>&1 | tail -30
```

Expected: All tests pass (AdminSpecTypeTest × 6, AdminProductSpecTest × 4, AdminVariantGenerateTest × 6, plus existing suites).

Check spec coverage:
- [x] `spec_types` CRUD → Task 4
- [x] Delete guard when in use → Task 4
- [x] `product_spec_assignments` + `product_spec_values` GET/PUT → Task 5
- [x] Cartesian generation → Task 5 (service) + Task 5 (generate controller)
- [x] 409 when variants exist without force → Task 5
- [x] force=true deletes + regenerates → Task 5
- [x] 422 when spec has no values → Task 5
- [x] No-spec product generates one default variant → Task 5
- [x] Variant response includes `specs` array → Task 6
- [x] `size` removed from variant → Tasks 1, 2, 6
- [x] SpecTypesView → Task 7
- [x] Sidebar link → Task 7
- [x] ProductVariantsView Specs section → Task 8
- [x] Generate confirm modal → Task 8
- [x] Variant table "Variant" column → Task 8
- [x] Edit modal no size field → Task 8
