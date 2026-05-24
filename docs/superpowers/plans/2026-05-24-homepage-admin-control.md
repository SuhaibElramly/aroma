# Homepage Admin Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make the Aroma storefront homepage fully editable from the admin panel — hero text/image, section visibility, order, and per-block config — driven by DB records instead of hardcoded values.

**Architecture:** A `settings` table stores the hero config as a keyed JSON record. A `homepage_blocks` table stores repeatable page blocks (type, position, enabled, config JSON). The storefront `GET /api/home` endpoint reads and hydrates both. The admin panel gets a new HomepageView with a hero editor and a drag-and-drop block list backed by dedicated admin REST endpoints.

**Tech Stack:** Laravel 11 (PHP), SQLite (dev DB), Vue 3 + TypeScript (admin), Next.js 14 + React (storefront), vuedraggable@next, lucide-vue-next, vue-i18n.

---

## File Map

**Created:**
- `aroma-api/database/migrations/2026_05_24_000001_create_settings_table.php`
- `aroma-api/database/migrations/2026_05_24_000002_create_homepage_blocks_table.php`
- `aroma-api/app/Models/Setting.php`
- `aroma-api/app/Models/HomepageBlock.php`
- `aroma-api/app/Services/HomepageAdminService.php`
- `aroma-api/app/Http/Controllers/Api/Admin/AdminHomepageController.php`
- `aroma-api/database/seeders/HomepageBlockSeeder.php`
- `aroma-api/tests/Feature/HomeTest.php`
- `aroma-api/tests/Feature/AdminHomepageTest.php`
- `aroma-admin/src/views/HomepageView.vue`
- `aroma-admin/src/components/homepage/HeroEditor.vue`
- `aroma-admin/src/components/homepage/BlockList.vue`
- `aroma-admin/src/components/homepage/BlockEditor.vue`

**Modified:**
- `aroma-api/app/Services/HomeService.php` — rewritten to read from DB
- `aroma-api/app/Http/Controllers/Api/HomeController.php` — updated response shape
- `aroma-api/routes/api.php` — add admin homepage routes
- `aroma-api/database/seeders/DatabaseSeeder.php` — call HomepageBlockSeeder
- `aroma/src/types/index.ts` — new HomePageData, HeroConfig, HomeBlock types
- `aroma/src/features/home/HeroSection.tsx` — accepts props, supports bg image
- `aroma/src/features/home/HomeSection.tsx` — HomeSections iterates blocks dynamically
- `aroma/src/features/home/HomePageClient.tsx` — passes hero props, removes TrustStrip
- `aroma/src/features/home/TrustStrip.tsx` — **deleted**
- `aroma-admin/src/types/index.ts` — add HomepageConfig, HomepageBlock, HeroConfig
- `aroma-admin/src/api/admin.ts` — add homepage API functions
- `aroma-admin/src/router/index.ts` — add /homepage route
- `aroma-admin/src/components/layout/Sidebar.vue` — add Homepage nav item
- `aroma-admin/src/locales/en.ts` — add homepage strings
- `aroma-admin/src/locales/ar.ts` — add homepage strings (Arabic)

---

## Task 1: DB Migrations + Models

**Files:**
- Create: `aroma-api/database/migrations/2026_05_24_000001_create_settings_table.php`
- Create: `aroma-api/database/migrations/2026_05_24_000002_create_homepage_blocks_table.php`
- Create: `aroma-api/app/Models/Setting.php`
- Create: `aroma-api/app/Models/HomepageBlock.php`

- [x] **Step 1: Create the settings migration**

```php
// aroma-api/database/migrations/2026_05_24_000001_create_settings_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
```

- [x] **Step 2: Create the homepage_blocks migration**

```php
// aroma-api/database/migrations/2026_05_24_000002_create_homepage_blocks_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('homepage_blocks', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // bestsellers|new_arrivals|offers|categories|featured_brand
            $table->unsignedInteger('position')->default(0);
            $table->boolean('enabled')->default(true);
            $table->json('config')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('homepage_blocks');
    }
};
```

- [x] **Step 3: Create the Setting model**

```php
// aroma-api/app/Models/Setting.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];
    protected $casts    = ['value' => 'array'];

    public static function get(string $key, mixed $default = null): mixed
    {
        return static::where('key', $key)->value('value') ?? $default;
    }

    public static function set(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
    }
}
```

- [x] **Step 4: Create the HomepageBlock model**

```php
// aroma-api/app/Models/HomepageBlock.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HomepageBlock extends Model
{
    protected $fillable = ['type', 'position', 'enabled', 'config'];
    protected $casts    = ['enabled' => 'boolean', 'config' => 'array'];
}
```

- [x] **Step 5: Run migrations**

```bash
cd aroma-api && php artisan migrate
```

Expected: two new tables `settings` and `homepage_blocks` created with no errors.

- [x] **Step 6: Commit**

```bash
git add aroma-api/database/migrations/2026_05_24_000001_create_settings_table.php \
        aroma-api/database/migrations/2026_05_24_000002_create_homepage_blocks_table.php \
        aroma-api/app/Models/Setting.php \
        aroma-api/app/Models/HomepageBlock.php
git commit -m "feat: add settings and homepage_blocks migrations and models"
```

---

## Task 2: Rewrite HomeService + HomeController

**Files:**
- Modify: `aroma-api/app/Services/HomeService.php`
- Modify: `aroma-api/app/Http/Controllers/Api/HomeController.php`
- Create: `aroma-api/tests/Feature/HomeTest.php`

- [x] **Step 1: Write the failing test**

```php
// aroma-api/tests/Feature/HomeTest.php
<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\HomepageBlock;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HomeTest extends TestCase
{
    use RefreshDatabase;

    public function test_home_returns_hero_and_blocks(): void
    {
        Setting::set('homepage_hero', [
            'headline'            => 'Test Headline',
            'subtext'             => 'Test Subtext',
            'cta_primary_label'   => 'Shop',
            'cta_primary_url'     => '/search',
            'cta_secondary_label' => 'Brands',
            'cta_secondary_url'   => '/brands',
            'bg_image_path'       => null,
        ]);

        HomepageBlock::create([
            'type'     => 'bestsellers',
            'position' => 1,
            'enabled'  => true,
            'config'   => ['label' => 'Best', 'title' => 'Bestsellers', 'limit' => 2],
        ]);

        Product::factory()->count(2)->create(['is_bestseller' => true]);

        $response = $this->getJson('/api/home');

        $response->assertOk()
            ->assertJsonStructure([
                'hero' => ['headline', 'subtext', 'cta_primary_label', 'cta_primary_url',
                           'cta_secondary_label', 'cta_secondary_url', 'bg_image_url'],
                'blocks' => [['id', 'type', 'config', 'data']],
            ])
            ->assertJsonPath('hero.headline', 'Test Headline')
            ->assertJsonPath('blocks.0.type', 'bestsellers')
            ->assertJsonCount(2, 'blocks.0.data.products');
    }

    public function test_home_excludes_disabled_blocks(): void
    {
        Setting::set('homepage_hero', [
            'headline' => 'H', 'subtext' => 'S',
            'cta_primary_label' => 'A', 'cta_primary_url' => '/',
            'cta_secondary_label' => 'B', 'cta_secondary_url' => '/',
            'bg_image_path' => null,
        ]);

        HomepageBlock::create(['type' => 'bestsellers', 'position' => 1, 'enabled' => false, 'config' => ['limit' => 3]]);

        $this->getJson('/api/home')
            ->assertOk()
            ->assertJsonCount(0, 'blocks');
    }

    public function test_home_orders_blocks_by_position(): void
    {
        Setting::set('homepage_hero', [
            'headline' => 'H', 'subtext' => 'S',
            'cta_primary_label' => 'A', 'cta_primary_url' => '/',
            'cta_secondary_label' => 'B', 'cta_secondary_url' => '/',
            'bg_image_path' => null,
        ]);

        HomepageBlock::create(['type' => 'offers',      'position' => 2, 'enabled' => true, 'config' => ['limit' => 1]]);
        HomepageBlock::create(['type' => 'bestsellers', 'position' => 1, 'enabled' => true, 'config' => ['limit' => 1]]);

        $this->getJson('/api/home')
            ->assertOk()
            ->assertJsonPath('blocks.0.type', 'bestsellers')
            ->assertJsonPath('blocks.1.type', 'offers');
    }
}
```

- [x] **Step 2: Run test to verify it fails**

```bash
cd aroma-api && php artisan test tests/Feature/HomeTest.php
```

Expected: All 3 tests FAIL — `hero` and `blocks` keys don't exist in response yet.

- [x] **Step 3: Rewrite HomeService**

```php
// aroma-api/app/Services/HomeService.php
<?php

namespace App\Services;

use App\Models\Brand;
use App\Models\Category;
use App\Models\HomepageBlock;
use App\Models\Product;
use App\Models\Setting;

class HomeService
{
    private const DEFAULT_HERO = [
        'headline'            => 'حيث تبدأ الحكايات',
        'subtext'             => 'عطور مختارة من أرقى دور العطور في العالم — كلٌّ منها حكاية تنتظر أن تبدأ.',
        'cta_primary_label'   => 'استكشف المجموعة',
        'cta_primary_url'     => '/search',
        'cta_secondary_label' => 'تصفح الماركات',
        'cta_secondary_url'   => '/brands',
        'bg_image_path'       => null,
    ];

    public function getHero(): array
    {
        $hero = Setting::get('homepage_hero', self::DEFAULT_HERO);
        $bgPath = $hero['bg_image_path'] ?? null;

        return array_merge($hero, [
            'bg_image_url' => $bgPath ? asset('storage/' . $bgPath) : null,
        ]);
    }

    public function getBlocks(): array
    {
        return HomepageBlock::where('enabled', true)
            ->orderBy('position')
            ->get()
            ->map(fn ($block) => [
                'id'     => $block->id,
                'type'   => $block->type,
                'config' => $block->config ?? [],
                'data'   => $this->hydrateBlock($block),
            ])
            ->all();
    }

    private function hydrateBlock(HomepageBlock $block): array
    {
        $config = $block->config ?? [];

        return match ($block->type) {
            'bestsellers'   => ['products' => $this->products(['is_bestseller' => true],  $config['limit'] ?? 3)],
            'new_arrivals'  => ['products' => $this->products(['is_new' => true],          $config['limit'] ?? 4)],
            'offers'        => ['products' => $this->products(['is_offer' => true],        $config['limit'] ?? 3)],
            'categories'    => ['categories' => Category::withCount('products')->get()->toArray()],
            'featured_brand' => $this->hydrateFeaturedBrand($config),
            default         => [],
        };
    }

    private function products(array $where, int $limit): array
    {
        return Product::where($where)
            ->with(['brand', 'category', 'variants.specValues.specType', 'notes', 'tags'])
            ->limit($limit)
            ->get()
            ->toArray();
    }

    private function hydrateFeaturedBrand(array $config): array
    {
        $brandId = $config['brand_id'] ?? null;
        $brand   = $brandId ? Brand::find($brandId) : Brand::first();

        if (!$brand) return ['brand' => null, 'products' => []];

        $products = Product::where('brand_id', $brand->id)
            ->with(['brand', 'category', 'variants.specValues.specType', 'notes', 'tags'])
            ->limit($config['product_limit'] ?? 2)
            ->get()
            ->toArray();

        return ['brand' => $brand->toArray(), 'products' => $products];
    }
}
```

- [x] **Step 4: Update HomeController**

```php
// aroma-api/app/Http/Controllers/Api/HomeController.php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\HomeService;

class HomeController extends Controller
{
    public function index(HomeService $homeService)
    {
        return response()->json([
            'hero'   => $homeService->getHero(),
            'blocks' => $homeService->getBlocks(),
        ]);
    }
}
```

- [x] **Step 5: Run tests to verify they pass**

```bash
cd aroma-api && php artisan test tests/Feature/HomeTest.php
```

Expected: All 3 tests PASS.

- [x] **Step 6: Commit**

```bash
git add aroma-api/app/Services/HomeService.php \
        aroma-api/app/Http/Controllers/Api/HomeController.php \
        aroma-api/tests/Feature/HomeTest.php
git commit -m "feat: rewrite HomeService to read hero and blocks from DB"
```

---

## Task 3: HomepageAdminService + Controller + Routes

**Files:**
- Create: `aroma-api/app/Services/HomepageAdminService.php`
- Create: `aroma-api/app/Http/Controllers/Api/Admin/AdminHomepageController.php`
- Modify: `aroma-api/routes/api.php`
- Create: `aroma-api/tests/Feature/AdminHomepageTest.php`

- [x] **Step 1: Write the failing tests**

```php
// aroma-api/tests/Feature/AdminHomepageTest.php
<?php

namespace Tests\Feature;

use App\Models\HomepageBlock;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminHomepageTest extends TestCase
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

    // ── GET /api/admin/homepage ───────────────────────────────────────

    public function test_get_homepage_returns_hero_and_all_blocks(): void
    {
        Setting::set('homepage_hero', ['headline' => 'Hello', 'subtext' => 'Sub',
            'cta_primary_label' => 'A', 'cta_primary_url' => '/',
            'cta_secondary_label' => 'B', 'cta_secondary_url' => '/',
            'bg_image_path' => null]);

        HomepageBlock::create(['type' => 'bestsellers', 'position' => 1, 'enabled' => true,  'config' => ['limit' => 3]]);
        HomepageBlock::create(['type' => 'offers',      'position' => 2, 'enabled' => false, 'config' => ['limit' => 3]]);

        $this->asAdmin()->getJson('/api/admin/homepage')
            ->assertOk()
            ->assertJsonStructure(['hero', 'blocks'])
            ->assertJsonCount(2, 'blocks')
            ->assertJsonPath('hero.headline', 'Hello');
    }

    public function test_get_homepage_requires_auth(): void
    {
        $this->getJson('/api/admin/homepage')->assertUnauthorized();
    }

    // ── PUT /api/admin/homepage/hero ──────────────────────────────────

    public function test_update_hero_saves_text_fields(): void
    {
        $this->asAdmin()->putJson('/api/admin/homepage/hero', [
            'headline'            => 'New Headline',
            'subtext'             => 'New Subtext',
            'cta_primary_label'   => 'Shop Now',
            'cta_primary_url'     => '/search',
            'cta_secondary_label' => 'Brands',
            'cta_secondary_url'   => '/brands',
        ])->assertOk();

        $hero = Setting::get('homepage_hero');
        $this->assertEquals('New Headline', $hero['headline']);
        $this->assertEquals('Shop Now',     $hero['cta_primary_label']);
    }

    public function test_update_hero_stores_uploaded_image(): void
    {
        Storage::fake('public');

        $this->asAdmin()->putJson('/api/admin/homepage/hero', [
            'headline'            => 'H',
            'subtext'             => 'S',
            'cta_primary_label'   => 'A',
            'cta_primary_url'     => '/',
            'cta_secondary_label' => 'B',
            'cta_secondary_url'   => '/',
            'bg_image'            => UploadedFile::fake()->image('hero.jpg'),
        ])->assertOk();

        $hero = Setting::get('homepage_hero');
        $this->assertStringStartsWith('homepage/', $hero['bg_image_path']);
        Storage::disk('public')->assertExists($hero['bg_image_path']);
    }

    // ── POST /api/admin/homepage/blocks ───────────────────────────────

    public function test_add_block_creates_record(): void
    {
        $this->asAdmin()->postJson('/api/admin/homepage/blocks', [
            'type'    => 'bestsellers',
            'config'  => ['label' => 'Top', 'title' => 'Best', 'limit' => 3],
            'enabled' => true,
        ])->assertCreated()->assertJsonStructure(['id', 'type', 'position', 'enabled', 'config']);

        $this->assertDatabaseHas('homepage_blocks', ['type' => 'bestsellers']);
    }

    // ── PUT /api/admin/homepage/blocks/{id} ───────────────────────────

    public function test_update_block_changes_config(): void
    {
        $block = HomepageBlock::create(['type' => 'bestsellers', 'position' => 1, 'enabled' => true, 'config' => ['limit' => 3]]);

        $this->asAdmin()->putJson("/api/admin/homepage/blocks/{$block->id}", [
            'config'  => ['limit' => 6],
            'enabled' => false,
        ])->assertOk();

        $block->refresh();
        $this->assertEquals(6,     $block->config['limit']);
        $this->assertFalse($block->enabled);
    }

    // ── DELETE /api/admin/homepage/blocks/{id} ────────────────────────

    public function test_delete_block_removes_record(): void
    {
        $block = HomepageBlock::create(['type' => 'offers', 'position' => 1, 'enabled' => true, 'config' => []]);

        $this->asAdmin()->deleteJson("/api/admin/homepage/blocks/{$block->id}")
            ->assertOk();

        $this->assertDatabaseMissing('homepage_blocks', ['id' => $block->id]);
    }

    // ── PUT /api/admin/homepage/blocks/reorder ────────────────────────

    public function test_reorder_updates_positions(): void
    {
        $a = HomepageBlock::create(['type' => 'bestsellers', 'position' => 1, 'enabled' => true, 'config' => []]);
        $b = HomepageBlock::create(['type' => 'offers',      'position' => 2, 'enabled' => true, 'config' => []]);

        $this->asAdmin()->putJson('/api/admin/homepage/blocks/reorder', [
            'order' => [
                ['id' => $a->id, 'position' => 2],
                ['id' => $b->id, 'position' => 1],
            ],
        ])->assertOk();

        $this->assertEquals(2, $a->fresh()->position);
        $this->assertEquals(1, $b->fresh()->position);
    }
}
```

- [x] **Step 2: Run tests to verify they fail**

```bash
cd aroma-api && php artisan test tests/Feature/AdminHomepageTest.php
```

Expected: All tests FAIL — routes don't exist yet.

- [x] **Step 3: Create HomepageAdminService**

```php
// aroma-api/app/Services/HomepageAdminService.php
<?php

namespace App\Services;

use App\Models\HomepageBlock;
use App\Models\Setting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class HomepageAdminService
{
    public function getConfig(): array
    {
        return [
            'hero'   => Setting::get('homepage_hero', []),
            'blocks' => HomepageBlock::orderBy('position')->get()->toArray(),
        ];
    }

    public function updateHero(array $fields, ?UploadedFile $image): void
    {
        $existing  = Setting::get('homepage_hero', []);
        $bgPath    = $existing['bg_image_path'] ?? null;

        if ($image) {
            if ($bgPath) Storage::disk('public')->delete($bgPath);
            $bgPath = $image->store('homepage', 'public');
        }

        Setting::set('homepage_hero', array_merge($fields, ['bg_image_path' => $bgPath]));
    }

    public function addBlock(string $type, array $config, bool $enabled): HomepageBlock
    {
        $maxPosition = HomepageBlock::max('position') ?? 0;

        return HomepageBlock::create([
            'type'     => $type,
            'position' => $maxPosition + 1,
            'enabled'  => $enabled,
            'config'   => $config,
        ]);
    }

    public function updateBlock(HomepageBlock $block, array $data): void
    {
        $block->update($data);
    }

    public function deleteBlock(HomepageBlock $block): void
    {
        $block->delete();
    }

    public function reorder(array $order): void
    {
        foreach ($order as $item) {
            HomepageBlock::where('id', $item['id'])->update(['position' => $item['position']]);
        }
    }
}
```

- [x] **Step 4: Create AdminHomepageController**

```php
// aroma-api/app/Http/Controllers/Api/Admin/AdminHomepageController.php
<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\HomepageBlock;
use App\Services\HomepageAdminService;
use Illuminate\Http\Request;

class AdminHomepageController extends Controller
{
    public function __construct(private HomepageAdminService $service) {}

    public function show(): \Illuminate\Http\JsonResponse
    {
        return response()->json($this->service->getConfig());
    }

    public function updateHero(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'headline'            => 'required|string|max:255',
            'subtext'             => 'required|string|max:1000',
            'cta_primary_label'   => 'required|string|max:100',
            'cta_primary_url'     => 'required|string|max:255',
            'cta_secondary_label' => 'required|string|max:100',
            'cta_secondary_url'   => 'required|string|max:255',
            'bg_image'            => 'nullable|image|max:4096',
        ]);

        $this->service->updateHero(
            $request->only(['headline', 'subtext', 'cta_primary_label', 'cta_primary_url',
                            'cta_secondary_label', 'cta_secondary_url']),
            $request->file('bg_image'),
        );

        return response()->json(['message' => 'Hero updated']);
    }

    public function storeBlock(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'type'    => 'required|in:bestsellers,new_arrivals,offers,categories,featured_brand',
            'config'  => 'nullable|array',
            'enabled' => 'boolean',
        ]);

        $block = $this->service->addBlock(
            $request->type,
            $request->input('config', []),
            $request->boolean('enabled', true),
        );

        return response()->json($block, 201);
    }

    public function updateBlock(Request $request, HomepageBlock $block): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'config'  => 'nullable|array',
            'enabled' => 'nullable|boolean',
        ]);

        $this->service->updateBlock($block, $request->only(['config', 'enabled']));

        return response()->json($block->fresh());
    }

    public function destroyBlock(HomepageBlock $block): \Illuminate\Http\JsonResponse
    {
        $this->service->deleteBlock($block);

        return response()->json(['message' => 'Block deleted']);
    }

    public function reorder(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'order'             => 'required|array',
            'order.*.id'        => 'required|integer|exists:homepage_blocks,id',
            'order.*.position'  => 'required|integer|min:1',
        ]);

        $this->service->reorder($request->input('order'));

        return response()->json(['message' => 'Reordered']);
    }
}
```

- [x] **Step 5: Add routes to api.php**

In `aroma-api/routes/api.php`, add this import at the top of the admin use statement:

```php
use App\Http\Controllers\Api\Admin\{
    AdminDashboardController, AdminOrderController, AdminProductController,
    AdminBrandController, AdminCategoryController, AdminUserController,
    AdminProductVariantController, AdminProductImageController,
    AdminUserDetailController, AdminCouponController, AdminSpecTypeController,
    AdminProductSpecController, AdminProductVariantGenerateController,
    AdminProductDiscountController, AdminAdminsController, AdminRolesController,
    AdminNotificationController, AdminOrderPaymentController,
    AdminHomepageController,
};
```

Then inside the `Route::middleware(['auth:sanctum', 'is_admin'])->prefix('admin')` group, add these routes (place after the notifications routes at the end):

```php
Route::get('/homepage',                              [AdminHomepageController::class, 'show']);
Route::put('/homepage/hero',                         [AdminHomepageController::class, 'updateHero']);
Route::post('/homepage/blocks',                      [AdminHomepageController::class, 'storeBlock']);
Route::put('/homepage/blocks/reorder',               [AdminHomepageController::class, 'reorder']);
Route::put('/homepage/blocks/{block}',               [AdminHomepageController::class, 'updateBlock']);
Route::delete('/homepage/blocks/{block}',            [AdminHomepageController::class, 'destroyBlock']);
```

Note: `/reorder` must be declared before `/{block}` so Laravel doesn't treat "reorder" as a block ID.

- [x] **Step 6: Run tests to verify they pass**

```bash
cd aroma-api && php artisan test tests/Feature/AdminHomepageTest.php
```

Expected: All 8 tests PASS.

- [x] **Step 7: Commit**

```bash
git add aroma-api/app/Services/HomepageAdminService.php \
        aroma-api/app/Http/Controllers/Api/Admin/AdminHomepageController.php \
        aroma-api/routes/api.php \
        aroma-api/tests/Feature/AdminHomepageTest.php
git commit -m "feat: add admin homepage API — hero update, block CRUD, reorder"
```

---

## Task 4: Homepage Seeder

**Files:**
- Create: `aroma-api/database/seeders/HomepageBlockSeeder.php`
- Modify: `aroma-api/database/seeders/DatabaseSeeder.php`

- [x] **Step 1: Create HomepageBlockSeeder**

```php
// aroma-api/database/seeders/HomepageBlockSeeder.php
<?php

namespace Database\Seeders;

use App\Models\HomepageBlock;
use App\Models\Setting;
use Illuminate\Database\Seeder;

class HomepageBlockSeeder extends Seeder
{
    public function run(): void
    {
        Setting::set('homepage_hero', [
            'headline'            => 'حيث تبدأ الحكايات',
            'subtext'             => 'عطور مختارة من أرقى دور العطور في العالم — كلٌّ منها حكاية تنتظر أن تبدأ.',
            'cta_primary_label'   => 'استكشف المجموعة',
            'cta_primary_url'     => '/search',
            'cta_secondary_label' => 'تصفح الماركات',
            'cta_secondary_url'   => '/brands',
            'bg_image_path'       => null,
        ]);

        $blocks = [
            ['type' => 'bestsellers',   'position' => 1, 'config' => ['label' => 'أكثر العطور طلبًا', 'title' => 'الأكثر مبيعًا',   'limit' => 3]],
            ['type' => 'categories',    'position' => 2, 'config' => ['label' => 'تسوق حسب',          'title' => 'الفئة']],
            ['type' => 'new_arrivals',  'position' => 3, 'config' => ['label' => 'وصل حديثًا',         'title' => 'كل ماهو جديد',    'limit' => 4]],
            ['type' => 'featured_brand','position' => 4, 'config' => ['label' => 'دار مميزة',          'title' => 'Parfums de Marly', 'brand_id' => 'parfums-de-marly', 'product_limit' => 2]],
            ['type' => 'offers',        'position' => 5, 'config' => ['label' => 'وقت محدود',          'title' => 'العروض الحالية',   'limit' => 3]],
        ];

        foreach ($blocks as $block) {
            HomepageBlock::create(array_merge($block, ['enabled' => true]));
        }
    }
}
```

- [x] **Step 2: Call seeder from DatabaseSeeder**

In `aroma-api/database/seeders/DatabaseSeeder.php`, add the call at the end of `run()`:

```php
$this->call(HomepageBlockSeeder::class);
```

The full method should look like:

```php
public function run(): void
{
    $this->call(AdminUserSeeder::class);
    $this->call(BrandSeeder::class);
    $this->call(CategorySeeder::class);
    $this->call(ProductSeeder::class);

    if (!User::where('email', 'test@example.com')->exists()) {
        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);
    }

    $this->call(HomepageBlockSeeder::class);
}
```

- [x] **Step 3: Run the seeder against the dev DB**

```bash
cd aroma-api && php artisan db:seed --class=HomepageBlockSeeder
```

Expected: No errors. Check `homepage_blocks` table has 5 rows and `settings` has 1 row with key `homepage_hero`.

- [x] **Step 4: Verify the API response**

```bash
curl -s http://localhost:8000/api/home | python3 -m json.tool | head -40
```

Expected: JSON with `hero` object containing `headline`, and `blocks` array with 5 items (assuming products with `is_bestseller`, `is_new`, `is_offer` flags exist in the DB).

- [x] **Step 5: Commit**

```bash
git add aroma-api/database/seeders/HomepageBlockSeeder.php \
        aroma-api/database/seeders/DatabaseSeeder.php
git commit -m "feat: seed default homepage blocks and hero config"
```

---

## Task 5: Storefront — Types + Dynamic Rendering + Remove TrustStrip

**Files:**
- Modify: `aroma/src/types/index.ts`
- Modify: `aroma/src/features/home/HeroSection.tsx`
- Modify: `aroma/src/features/home/HomeSection.tsx`
- Modify: `aroma/src/features/home/HomePageClient.tsx`
- Delete: `aroma/src/features/home/TrustStrip.tsx`

- [x] **Step 1: Update HomePageData types in `aroma/src/types/index.ts`**

Find the existing `HomePageData` interface and replace it with the following (keep all other types in the file untouched):

```ts
export interface HeroConfig {
  headline: string
  subtext: string
  cta_primary_label: string
  cta_primary_url: string
  cta_secondary_label: string
  cta_secondary_url: string
  bg_image_url: string | null
}

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

export interface HomePageData {
  hero: HeroConfig
  blocks: HomeBlock[]
}
```

- [x] **Step 2: Update HeroSection to accept props**

Replace the entire contents of `aroma/src/features/home/HeroSection.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import type { HeroConfig } from '@/types'

const SCENT_WORDS = [
  { word: 'وردة',    top: '12%', left: '10%', delay: 0,   size: 11 },
  { word: 'عود',     top: '22%', left: '72%', delay: 1.2, size: 10 },
  { word: 'عنبر',    top: '55%', left: '8%',  delay: 2.1, size: 10 },
  { word: 'زعفران',  top: '72%', left: '68%', delay: 0.8, size: 9  },
  { word: 'فيتيفر',  top: '85%', left: '20%', delay: 1.7, size: 9  },
  { word: 'مسك',     top: '38%', left: '80%', delay: 0.4, size: 10 },
  { word: 'نيرولي',  top: '65%', left: '42%', delay: 2.5, size: 9  },
]

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 22 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
})

export function HeroSection({ hero }: { hero: HeroConfig }) {
  const router = useRouter()

  return (
    <div
      className="h-screen min-h-[640px] relative overflow-hidden grid grid-cols-1 md:grid-cols-2"
      style={{ background: '#120F0C' }}
    >
      {/* ── Left: Editorial copy ─────────────────────────────── */}
      <div className="flex flex-col justify-center px-8 md:px-16 pt-24 pb-12 relative z-10">
        <div className="w-9 h-px bg-aroma-accent mb-7" />

        <motion.p {...fadeUp(0)} className="font-sans text-[11px] tracking-[0.18em] text-aroma-accent mb-8">
          SMELL GOOD, FEEL GOOD
        </motion.p>

        <motion.div {...fadeUp(0.12)}>
          <h1
            className="leading-[1.12] mb-9"
            style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontWeight: 300,
              fontSize:   'clamp(40px, 4.5vw, 72px)',
              color:      '#F4EFE8',
            }}
          >
            {hero.headline.split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </h1>
        </motion.div>

        <motion.p {...fadeUp(0.24)} className="font-sans text-[15px] font-light text-[rgba(244,239,232,0.5)] leading-[1.8] max-w-[340px] mb-11">
          {hero.subtext}
        </motion.p>

        <motion.div {...fadeUp(0.36)} className="flex gap-3 flex-wrap">
          <button
            onClick={() => router.push(hero.cta_primary_url)}
            className="bg-aroma-accent text-aroma-dark font-sans text-[12px] font-semibold
                       px-8 py-3.5 rounded-sm transition-opacity hover:opacity-90"
          >
            {hero.cta_primary_label}
          </button>
          <button
            onClick={() => router.push(hero.cta_secondary_url)}
            className="border border-[rgba(244,239,232,0.2)] text-[rgba(244,239,232,0.7)]
                       font-sans text-[12px] px-8 py-3.5 rounded-sm
                       hover:bg-white/5 transition-colors"
          >
            {hero.cta_secondary_label}
          </button>
        </motion.div>
      </div>

      {/* ── Right: image or animated bottle ──────────────────── */}
      <div className="hidden md:block relative overflow-hidden">
        {hero.bg_image_url ? (
          <>
            <img
              src={hero.bg_image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-[#120F0C]/50" />
          </>
        ) : (
          <>
            {/* Ambient glow */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: '20%', left: '30%',
                width: 420, height: 420,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(184,150,110,0.18) 0%, transparent 70%)',
              }}
            />

            {/* Floating scent words */}
            {SCENT_WORDS.map(({ word, top, left, delay, size }) => (
              <motion.div
                key={word}
                animate={{ opacity: [0.18, 0.32, 0.18] }}
                transition={{ duration: 4, delay, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', top, left, fontSize: size }}
                className="font-display italic text-aroma-accent tracking-[0.14em] pointer-events-none select-none"
              >
                {word}
              </motion.div>
            ))}

            {/* Bottle composition */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[54%]">
              <motion.div
                animate={{ y: [0, -22, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ width: 320, height: 320, borderRadius: '50%', border: '1px solid rgba(184,150,110,0.12)' }}
              />
              <motion.div
                animate={{ y: [0, -22, 0] }}
                transition={{ duration: 9, delay: 1, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ width: 240, height: 240, borderRadius: '50%', border: '1px solid rgba(184,150,110,0.08)' }}
              />
              <motion.div
                animate={{ y: [0, -18, 0], rotate: [-2, 2, -2] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 110, height: 200,
                  background: 'linear-gradient(155deg, rgba(184,150,110,0.55) 0%, rgba(120,90,60,0.35) 50%, rgba(80,55,30,0.45) 100%)',
                  borderRadius: '40% 40% 30% 30% / 20% 20% 40% 40%',
                  border: '1px solid rgba(184,150,110,0.4)',
                  boxShadow: '0 0 60px rgba(184,150,110,0.15), inset 0 1px 0 rgba(255,255,255,0.12)',
                  position: 'relative',
                }}
              >
                <div style={{
                  position: 'absolute', top: '8%', left: '20%',
                  width: 12, height: '55%', borderRadius: 6,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)',
                }} />
                <div style={{
                  position: 'absolute', bottom: '22%', left: '12%', right: '12%',
                  height: 50, border: '1px solid rgba(184,150,110,0.3)',
                  borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="font-display text-[10px] tracking-[0.2em] text-[rgba(244,239,232,0.6)]">أروما</span>
                </div>
              </motion.div>
              <motion.div
                animate={{ y: [0, -18, 0], rotate: [-2, 2, -2] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 38, height: 42, margin: '-2px auto 0',
                  background: 'linear-gradient(155deg, rgba(184,150,110,0.5), rgba(100,70,40,0.4))',
                  borderRadius: '4px 4px 0 0',
                  border: '1px solid rgba(184,150,110,0.3)',
                  borderBottom: 'none',
                }}
              />
              <motion.div
                animate={{ y: [0, -18, 0], rotate: [-2, 2, -2] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 52, height: 28, margin: '0 auto',
                  background: 'linear-gradient(135deg, rgba(220,190,150,0.7), rgba(140,100,60,0.6))',
                  borderRadius: '3px 3px 1px 1px',
                  border: '1px solid rgba(184,150,110,0.5)',
                  boxShadow: '0 4px 20px rgba(184,150,110,0.2)',
                }}
              />
              <motion.div
                animate={{ y: [0, -12, 0], rotate: [3, -1, 3] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', top: 60, left: -80,
                  width: 60, height: 110,
                  background: 'linear-gradient(155deg, rgba(184,150,110,0.25), rgba(80,55,30,0.2))',
                  borderRadius: '35% 35% 25% 25% / 18% 18% 35% 35%',
                  border: '1px solid rgba(184,150,110,0.18)',
                }}
              />
              <motion.div
                animate={{ y: [0, -18, 0], rotate: [-2, 2, -2] }}
                transition={{ duration: 9, delay: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', top: 80, right: -65,
                  width: 45, height: 90,
                  background: 'linear-gradient(155deg, rgba(184,150,110,0.2), rgba(80,55,30,0.15))',
                  borderRadius: '35% 35% 25% 25% / 18% 18% 35% 35%',
                  border: '1px solid rgba(184,150,110,0.14)',
                }}
              />
            </div>
          </>
        )}

        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#120F0C] pointer-events-none" />
        <div className="absolute top-0 bottom-0 left-0 w-20 bg-gradient-to-r from-[#120F0C] pointer-events-none" />
      </div>

      {/* Divider */}
      <div className="hidden md:block absolute top-0 bottom-0 left-1/2 w-px pointer-events-none"
           style={{ background: 'linear-gradient(to bottom, transparent, rgba(184,150,110,0.15) 30%, rgba(184,150,110,0.15) 70%, transparent)' }}
      />

      {/* Scroll hint */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-35 pointer-events-none">
        <p className="font-sans text-[9px] text-[#F4EFE8]">مرر</p>
        <div className="w-px h-8 bg-[#F4EFE8]" />
      </div>
    </div>
  )
}
```

- [x] **Step 3: Update HomeSections to dynamic block rendering in `aroma/src/features/home/HomeSection.tsx`**

Replace only the `HomeSections` function at the bottom of the file (keep all individual section components unchanged):

```tsx
// Replace the HomeSections function at the bottom of HomeSection.tsx
import type { HomeBlock } from '@/types'

export function HomeSections({ blocks }: { blocks: HomeBlock[] }) {
  return (
    <>
      {blocks.map((block) => {
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
          default:
            return null
        }
      })}
    </>
  )
}
```

Also update each section component to accept an optional `config` prop for label/title overrides. Add `config` to each one — example for `BestsellersSection`:

```tsx
export function BestsellersSection({
  products,
  config,
}: {
  products: Product[]
  config?: { label?: string; title?: string }
}) {
  const router = useRouter()
  return (
    <RevealSection className="px-6 md:px-12 py-16 md:py-[72px]">
      <SectionHeader
        label={config?.label ?? 'أكثر العطور طلبًا'}
        title={config?.title ?? 'الأكثر مبيعًا'}
        action="عرض الكل"
        onAction={() => router.push('/search?filter=bestseller')}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-7">
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </RevealSection>
  )
}
```

Apply the same `config` prop pattern to `NewArrivalsSection`, `OffersSection`, `CategoriesStrip`, and `FeaturedBrandBanner`.

- [x] **Step 4: Update HomePageClient to pass hero props and remove TrustStrip**

Replace the entire contents of `aroma/src/features/home/HomePageClient.tsx`:

```tsx
'use client'

import { HeroSection }  from './HeroSection'
import { HomeSections } from './HomeSection'
import { SkeletonGrid } from '@/components/feedback/SkeletonCard'
import { useHomeData }  from '@/lib/api/queries'

export function HomePageClient() {
  const { data, isPending, isError } = useHomeData()

  return (
    <>
      {data ? (
        <HeroSection hero={data.hero} />
      ) : (
        <div className="h-screen min-h-[640px] bg-[#120F0C]" />
      )}

      {isPending && (
        <div className="px-12 py-16 space-y-16">
          <SkeletonGrid count={3} cols="grid-cols-3" />
          <SkeletonGrid count={4} cols="grid-cols-4" compact />
        </div>
      )}
      {isError && (
        <p className="text-center py-20 text-aroma-muted font-sans text-sm">
          Failed to load content. Please refresh.
        </p>
      )}
      {data && <HomeSections blocks={data.blocks} />}
    </>
  )
}
```

- [x] **Step 5: Delete TrustStrip.tsx**

```bash
rm aroma/src/features/home/TrustStrip.tsx
```

If `TrustStrip` is imported anywhere else, search and remove those imports:

```bash
grep -r "TrustStrip" aroma/src/
```

Expected: no remaining references (it was only used in `HomePageClient.tsx` which we've already rewritten).

- [x] **Step 6: Verify the storefront builds**

```bash
cd aroma && npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no TypeScript errors.

- [x] **Step 7: Commit**

```bash
git add aroma/src/types/index.ts \
        aroma/src/features/home/HeroSection.tsx \
        aroma/src/features/home/HomeSection.tsx \
        aroma/src/features/home/HomePageClient.tsx
git rm aroma/src/features/home/TrustStrip.tsx
git commit -m "feat: storefront homepage reads hero+blocks from API, removes TrustStrip"
```

---

## Task 6: Admin — TypeScript Types + API Methods

**Files:**
- Modify: `aroma-admin/src/types/index.ts`
- Modify: `aroma-admin/src/api/admin.ts`

- [x] **Step 1: Add homepage types to `aroma-admin/src/types/index.ts`**

Append at the end of the file:

```ts
// ── Homepage ──────────────────────────────────────────────────────────
export type HomepageBlockType =
  | 'bestsellers'
  | 'new_arrivals'
  | 'offers'
  | 'categories'
  | 'featured_brand'

export interface HeroConfig {
  headline: string
  subtext: string
  cta_primary_label: string
  cta_primary_url: string
  cta_secondary_label: string
  cta_secondary_url: string
  bg_image_path: string | null
}

export interface HomepageBlock {
  id: number
  type: HomepageBlockType
  position: number
  enabled: boolean
  config: {
    label?: string
    title?: string
    limit?: number
    product_limit?: number
    brand_id?: string
  }
}

export interface HomepageConfig {
  hero: HeroConfig
  blocks: HomepageBlock[]
}

export interface NewBlockPayload {
  type: HomepageBlockType
  config: HomepageBlock['config']
  enabled: boolean
}

export interface ReorderItem {
  id: number
  position: number
}
```

- [x] **Step 2: Add API functions to `aroma-admin/src/api/admin.ts`**

Append at the end of the file, after the last export:

```ts
// ── Homepage ──────────────────────────────────────────────────────────
import type {
  HomepageConfig, HomepageBlock, NewBlockPayload, ReorderItem,
} from '../types'

export const apiGetHomepage = () =>
  client.get<HomepageConfig>('/admin/homepage')

export const apiUpdateHero = (data: FormData) =>
  client.put<void>('/admin/homepage/hero', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const apiAddBlock = (payload: NewBlockPayload) =>
  client.post<HomepageBlock>('/admin/homepage/blocks', payload)

export const apiUpdateBlock = (id: number, data: Partial<Pick<HomepageBlock, 'config' | 'enabled'>>) =>
  client.put<HomepageBlock>(`/admin/homepage/blocks/${id}`, data)

export const apiDeleteBlock = (id: number) =>
  client.delete<void>(`/admin/homepage/blocks/${id}`)

export const apiReorderBlocks = (order: ReorderItem[]) =>
  client.put<void>('/admin/homepage/blocks/reorder', { order })
```

Note: The `import` for `HomepageConfig` etc. must be added at the top of `admin.ts` alongside existing imports. Move the import line above to the top of the file with the other type imports.

Correct placement — in the import block at the top of `admin.ts`:

```ts
import type {
  AdminUser, DashboardStats, AdminOrder, AdminProduct,
  AdminBrand, AdminCategory, AdminUserRow, PageMeta, ProductVariant, ProductImage,
  AdminCartItem, AdminWishlistProduct, ProductType, AdminCoupon, CouponOrder,
  SpecType, ProductSpec, AdminUserOrder, AdminMember, AdminRole, AdminNotification,
  OrderPaymentsResponse,
  HomepageConfig, HomepageBlock, NewBlockPayload, ReorderItem,
} from '../types'
```

Then only the function bodies remain at the bottom (no inline import).

- [x] **Step 3: Verify TypeScript compiles**

```bash
cd aroma-admin && npm run build 2>&1 | tail -10
```

Expected: Build succeeds with no errors.

- [x] **Step 4: Commit**

```bash
git add aroma-admin/src/types/index.ts aroma-admin/src/api/admin.ts
git commit -m "feat: add admin homepage TypeScript types and API functions"
```

---

## Task 7: Admin — HeroEditor.vue

**Files:**
- Create: `aroma-admin/src/components/homepage/HeroEditor.vue`

- [x] **Step 1: Create the HeroEditor component**

```vue
<!-- aroma-admin/src/components/homepage/HeroEditor.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import type { HeroConfig } from '../../types'
import AInput from '../ui/AInput.vue'
import AButton from '../ui/AButton.vue'

const props = defineProps<{
  modelValue: HeroConfig
  saving: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [HeroConfig]
  save: []
  'remove-image': []
}>()

const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
  emit('update:modelValue', { ...props.modelValue })
}

function removeImage() {
  imageFile.value = null
  imagePreview.value = null
  emit('remove-image')
}

defineExpose({ imageFile })
</script>

<template>
  <div class="rounded-lg border border-dash-border bg-dash-paper-2 p-5 space-y-4">
    <h2 class="text-[13px] font-semibold text-dash-text mb-1">Hero Section</h2>

    <div class="grid grid-cols-2 gap-3">
      <AInput
        label="Headline"
        dir="rtl"
        :model-value="modelValue.headline"
        @update:model-value="emit('update:modelValue', { ...modelValue, headline: $event })"
      />
      <AInput
        label="Subtext"
        dir="rtl"
        :model-value="modelValue.subtext"
        @update:model-value="emit('update:modelValue', { ...modelValue, subtext: $event })"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <AInput
        label="Primary CTA — Label"
        dir="rtl"
        :model-value="modelValue.cta_primary_label"
        @update:model-value="emit('update:modelValue', { ...modelValue, cta_primary_label: $event })"
      />
      <AInput
        label="Primary CTA — URL"
        :model-value="modelValue.cta_primary_url"
        @update:model-value="emit('update:modelValue', { ...modelValue, cta_primary_url: $event })"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <AInput
        label="Secondary CTA — Label"
        dir="rtl"
        :model-value="modelValue.cta_secondary_label"
        @update:model-value="emit('update:modelValue', { ...modelValue, cta_secondary_label: $event })"
      />
      <AInput
        label="Secondary CTA — URL"
        :model-value="modelValue.cta_secondary_url"
        @update:model-value="emit('update:modelValue', { ...modelValue, cta_secondary_url: $event })"
      />
    </div>

    <!-- Hero image -->
    <div>
      <p class="text-[11px] font-medium text-dash-muted mb-2 uppercase tracking-wide">Hero Image</p>
      <div v-if="imagePreview || modelValue.bg_image_path" class="relative w-48 h-28 rounded overflow-hidden mb-2">
        <img
          :src="imagePreview ?? '/storage/' + modelValue.bg_image_path"
          class="w-full h-full object-cover"
          alt="Hero preview"
        />
        <button
          type="button"
          @click="removeImage"
          class="absolute top-1 right-1 bg-black/60 text-white rounded px-1.5 py-0.5 text-[10px]"
        >
          Remove
        </button>
      </div>
      <label class="flex items-center gap-2 cursor-pointer">
        <span class="text-[12px] px-3 py-1.5 rounded border border-dash-border bg-dash-paper text-dash-text hover:bg-dash-bg transition-colors">
          {{ imagePreview || modelValue.bg_image_path ? 'Replace image' : 'Upload image' }}
        </span>
        <span class="text-[11px] text-dash-muted">Replaces animated bottle. Leave empty to keep default.</span>
        <input type="file" accept="image/*" class="hidden" @change="onFileChange" />
      </label>
    </div>

    <div class="flex justify-end pt-1">
      <AButton :loading="saving" @click="emit('save')">Save Hero</AButton>
    </div>
  </div>
</template>
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/components/homepage/HeroEditor.vue
git commit -m "feat: add HeroEditor admin component"
```

---

## Task 8: Admin — BlockEditor.vue

**Files:**
- Create: `aroma-admin/src/components/homepage/BlockEditor.vue`

- [x] **Step 1: Create the BlockEditor drawer component**

```vue
<!-- aroma-admin/src/components/homepage/BlockEditor.vue -->
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { HomepageBlock, HomepageBlockType, NewBlockPayload } from '../../types'
import AInput from '../ui/AInput.vue'
import AButton from '../ui/AButton.vue'
import ASelect from '../ui/ASelect.vue'

const props = defineProps<{
  open: boolean
  block: HomepageBlock | null  // null = creating new
  brands: { id: string; name: string }[]
  saving: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [payload: Partial<HomepageBlock> | NewBlockPayload]
}>()

const BLOCK_TYPES: { value: HomepageBlockType; label: string }[] = [
  { value: 'bestsellers',    label: 'Bestsellers' },
  { value: 'new_arrivals',   label: 'New Arrivals' },
  { value: 'offers',         label: 'Offers' },
  { value: 'categories',     label: 'Categories' },
  { value: 'featured_brand', label: 'Featured Brand' },
]

const type    = ref<HomepageBlockType>('bestsellers')
const label   = ref('')
const title   = ref('')
const limit   = ref(3)
const brandId = ref('')
const productLimit = ref(2)
const enabled = ref(true)

const isNew = computed(() => !props.block)

watch(() => props.block, (b) => {
  if (b) {
    type.value         = b.type
    label.value        = b.config.label  ?? ''
    title.value        = b.config.title  ?? ''
    limit.value        = b.config.limit  ?? 3
    brandId.value      = b.config.brand_id      ?? ''
    productLimit.value = b.config.product_limit ?? 2
    enabled.value      = b.enabled
  } else {
    type.value = 'bestsellers'
    label.value = title.value = brandId.value = ''
    limit.value = 3
    productLimit.value = 2
    enabled.value = true
  }
}, { immediate: true })

function submit() {
  const config: HomepageBlock['config'] = { label: label.value, title: title.value }

  if (['bestsellers', 'new_arrivals', 'offers'].includes(type.value)) {
    config.limit = limit.value
  }

  if (type.value === 'featured_brand') {
    config.brand_id      = brandId.value
    config.product_limit = productLimit.value
  }

  if (isNew.value) {
    emit('save', { type: type.value, config, enabled: enabled.value } as NewBlockPayload)
  } else {
    emit('save', { config, enabled: enabled.value })
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex"
      @click.self="emit('close')"
    >
      <div class="absolute inset-0 bg-black/50" @click="emit('close')" />
      <div class="relative ms-auto h-full w-[380px] bg-dash-paper border-s border-dash-border flex flex-col shadow-2xl">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-dash-border flex items-center justify-between">
          <h3 class="text-[14px] font-semibold text-dash-text">
            {{ isNew ? 'Add Block' : 'Edit Block' }}
          </h3>
          <button @click="emit('close')" class="text-dash-muted hover:text-dash-text transition-colors text-lg">✕</button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-5 space-y-4">
          <!-- Type selector (only for new blocks) -->
          <ASelect
            v-if="isNew"
            label="Block Type"
            :model-value="type"
            :options="BLOCK_TYPES.map(t => ({ value: t.value, label: t.label }))"
            @update:model-value="type = $event as HomepageBlockType"
          />

          <AInput
            label="Label (small uppercase above title)"
            dir="rtl"
            v-model="label"
          />

          <AInput
            label="Title"
            dir="rtl"
            v-model="title"
          />

          <!-- Product limit (for product blocks) -->
          <div v-if="['bestsellers', 'new_arrivals', 'offers'].includes(type)">
            <label class="block text-[11px] font-medium text-dash-muted uppercase tracking-wide mb-1">
              Products to show (1–12)
            </label>
            <input
              type="number"
              v-model.number="limit"
              min="1"
              max="12"
              class="w-full rounded border border-dash-border bg-dash-paper-2 px-3 py-2 text-[13px] text-dash-text focus:outline-none focus:border-dash-primary"
            />
          </div>

          <!-- Featured brand fields -->
          <template v-if="type === 'featured_brand'">
            <ASelect
              label="Brand"
              :model-value="brandId"
              :options="brands.map(b => ({ value: b.id, label: b.name }))"
              @update:model-value="brandId = $event"
            />
            <div>
              <label class="block text-[11px] font-medium text-dash-muted uppercase tracking-wide mb-1">
                Products to show (1–4)
              </label>
              <input
                type="number"
                v-model.number="productLimit"
                min="1"
                max="4"
                class="w-full rounded border border-dash-border bg-dash-paper-2 px-3 py-2 text-[13px] text-dash-text focus:outline-none focus:border-dash-primary"
              />
            </div>
          </template>

          <!-- Enabled toggle -->
          <div class="flex items-center gap-3 pt-1">
            <button
              type="button"
              role="switch"
              :aria-checked="enabled"
              @click="enabled = !enabled"
              class="relative w-10 h-5 rounded-full transition-colors"
              :class="enabled ? 'bg-dash-primary' : 'bg-dash-border'"
            >
              <span
                class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                :class="enabled ? 'left-[22px]' : 'left-0.5'"
              />
            </button>
            <span class="text-[13px] text-dash-text">{{ enabled ? 'Visible' : 'Hidden' }}</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-5 py-4 border-t border-dash-border space-y-2">
          <p v-if="error" class="text-xs text-dash-danger">{{ error }}</p>
          <div class="flex gap-2 justify-end">
            <AButton variant="ghost" @click="emit('close')">Cancel</AButton>
            <AButton :loading="saving" @click="submit">
              {{ isNew ? 'Add Block' : 'Save Changes' }}
            </AButton>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/components/homepage/BlockEditor.vue
git commit -m "feat: add BlockEditor drawer component"
```

---

## Task 9: Admin — BlockList.vue with vuedraggable

**Files:**
- Modify: `aroma-admin/package.json` (install vuedraggable)
- Create: `aroma-admin/src/components/homepage/BlockList.vue`

- [x] **Step 1: Install vuedraggable**

```bash
cd aroma-admin && npm install vuedraggable@next
```

Expected: `vuedraggable` added to `dependencies` in `package.json`.

- [x] **Step 2: Create BlockList component**

```vue
<!-- aroma-admin/src/components/homepage/BlockList.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import draggable from 'vuedraggable'
import type { HomepageBlock } from '../../types'
import {
  Trophy, Sparkles, Tag, LayoutGrid, BadgePercent,
  GripVertical, Pencil, Trash2,
} from 'lucide-vue-next'

const props = defineProps<{
  blocks: HomepageBlock[]
}>()

const emit = defineEmits<{
  'update:blocks': [HomepageBlock[]]
  edit: [block: HomepageBlock]
  delete: [block: HomepageBlock]
  toggle: [block: HomepageBlock]
  'add-block': []
}>()

const ICONS: Record<string, any> = {
  bestsellers:    Trophy,
  new_arrivals:   Sparkles,
  offers:         BadgePercent,
  categories:     LayoutGrid,
  featured_brand: Tag,
}

const TYPE_LABELS: Record<string, string> = {
  bestsellers:    'Bestsellers',
  new_arrivals:   'New Arrivals',
  offers:         'Offers',
  categories:     'Categories',
  featured_brand: 'Featured Brand',
}

const list = computed({
  get: () => props.blocks,
  set: (val) => emit('update:blocks', val),
})

function blockMeta(block: HomepageBlock): string {
  if (['bestsellers', 'new_arrivals', 'offers'].includes(block.type)) {
    return `Showing ${block.config.limit ?? '?'} products`
  }
  if (block.type === 'featured_brand') {
    return block.config.brand_id ?? 'No brand selected'
  }
  if (block.type === 'categories') return 'All categories'
  return ''
}
</script>

<template>
  <div>
    <draggable
      v-model="list"
      item-key="id"
      handle=".drag-handle"
      class="space-y-2"
    >
      <template #item="{ element: block }">
        <div
          class="flex items-center gap-3 rounded-lg border border-dash-border bg-dash-paper-2 px-3 py-2.5"
          :class="{ 'opacity-50': !block.enabled }"
        >
          <!-- Drag handle -->
          <GripVertical :size="16" class="drag-handle cursor-grab text-dash-faint shrink-0" />

          <!-- Icon -->
          <div class="w-8 h-8 rounded-md bg-dash-bg flex items-center justify-center shrink-0">
            <component :is="ICONS[block.type]" :size="15" class="text-dash-primary" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="text-[10px] font-semibold uppercase tracking-[0.08em] text-dash-muted">
              {{ TYPE_LABELS[block.type] }}
            </p>
            <p class="text-[13px] text-dash-text truncate" dir="rtl">
              {{ block.config.title || '—' }}
            </p>
            <p class="text-[11px] text-dash-faint">{{ blockMeta(block) }}</p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 shrink-0">
            <!-- Toggle -->
            <button
              type="button"
              role="switch"
              :aria-checked="block.enabled"
              @click="emit('toggle', block)"
              class="relative w-8 h-4 rounded-full transition-colors"
              :class="block.enabled ? 'bg-dash-primary' : 'bg-dash-border'"
            >
              <span
                class="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all"
                :class="block.enabled ? 'left-[18px]' : 'left-0.5'"
              />
            </button>

            <button
              @click="emit('edit', block)"
              class="p-1 text-dash-faint hover:text-dash-text transition-colors"
            >
              <Pencil :size="14" />
            </button>

            <button
              @click="emit('delete', block)"
              class="p-1 text-dash-faint hover:text-dash-danger transition-colors"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </template>
    </draggable>

    <!-- Add block button -->
    <button
      type="button"
      @click="emit('add-block')"
      class="mt-2 w-full rounded-lg border border-dashed border-dash-border py-3 text-[12px]
             text-dash-muted hover:border-dash-primary hover:text-dash-primary transition-colors
             flex items-center justify-center gap-1.5"
    >
      + Add Block
    </button>
  </div>
</template>
```

- [x] **Step 3: Commit**

```bash
git add aroma-admin/package.json aroma-admin/package-lock.json \
        aroma-admin/src/components/homepage/BlockList.vue
git commit -m "feat: add BlockList component with drag-and-drop reordering"
```

---

## Task 10: Admin — HomepageView + Router + Sidebar + i18n

**Files:**
- Create: `aroma-admin/src/views/HomepageView.vue`
- Modify: `aroma-admin/src/router/index.ts`
- Modify: `aroma-admin/src/components/layout/Sidebar.vue`
- Modify: `aroma-admin/src/locales/en.ts`
- Modify: `aroma-admin/src/locales/ar.ts`

- [x] **Step 1: Create HomepageView.vue**

```vue
<!-- aroma-admin/src/views/HomepageView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  apiGetHomepage, apiUpdateHero, apiAddBlock,
  apiUpdateBlock, apiDeleteBlock, apiReorderBlocks,
  apiGetBrands,
} from '../api/admin'
import type { HomepageConfig, HomepageBlock, NewBlockPayload } from '../types'
import HeroEditor  from '../components/homepage/HeroEditor.vue'
import BlockList   from '../components/homepage/BlockList.vue'
import BlockEditor from '../components/homepage/BlockEditor.vue'

const config       = ref<HomepageConfig | null>(null)
const loading      = ref(true)
const loadError    = ref('')
const heroSaving   = ref(false)
const heroSuccess  = ref(false)
const blockSaving  = ref(false)
const blockError   = ref('')
const editorOpen   = ref(false)
const editingBlock = ref<HomepageBlock | null>(null)
const brands       = ref<{ id: string; name: string }[]>([])

const heroEditorRef = ref<InstanceType<typeof HeroEditor> | null>(null)

async function load() {
  loadError.value = ''
  try {
    const [homepageRes, brandsRes] = await Promise.all([
      apiGetHomepage(),
      apiGetBrands(),
    ])
    config.value = homepageRes.data
    brands.value = brandsRes.data.map((b: any) => ({ id: b.id, name: b.name }))
  } catch {
    loadError.value = 'Failed to load homepage config.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function saveHero() {
  if (!config.value) return
  heroSaving.value  = true
  heroSuccess.value = false
  try {
    const form = new FormData()
    const h = config.value.hero
    form.append('headline',            h.headline)
    form.append('subtext',             h.subtext)
    form.append('cta_primary_label',   h.cta_primary_label)
    form.append('cta_primary_url',     h.cta_primary_url)
    form.append('cta_secondary_label', h.cta_secondary_label)
    form.append('cta_secondary_url',   h.cta_secondary_url)

    const imageFile = heroEditorRef.value?.imageFile
    if (imageFile) form.append('bg_image', imageFile)

    await apiUpdateHero(form)
    heroSuccess.value = true
    setTimeout(() => { heroSuccess.value = false }, 3000)
  } catch {
    // error shown inline by HeroEditor
  } finally {
    heroSaving.value = false
  }
}

function openAddBlock() {
  editingBlock.value = null
  editorOpen.value   = true
}

function openEditBlock(block: HomepageBlock) {
  editingBlock.value = block
  editorOpen.value   = true
}

async function onToggleBlock(block: HomepageBlock) {
  if (!config.value) return
  try {
    await apiUpdateBlock(block.id, { enabled: !block.enabled })
    block.enabled = !block.enabled
  } catch { /* silently ignore — user can retry */ }
}

async function onDeleteBlock(block: HomepageBlock) {
  if (!config.value) return
  if (!confirm('Delete this block?')) return
  try {
    await apiDeleteBlock(block.id)
    config.value.blocks = config.value.blocks.filter(b => b.id !== block.id)
  } catch { /* silently ignore */ }
}

async function onSaveBlock(payload: Partial<HomepageBlock> | NewBlockPayload) {
  if (!config.value) return
  blockSaving.value = true
  blockError.value  = ''
  try {
    if (editingBlock.value) {
      const res = await apiUpdateBlock(editingBlock.value.id, payload as Partial<HomepageBlock>)
      const idx = config.value.blocks.findIndex(b => b.id === editingBlock.value!.id)
      if (idx !== -1) config.value.blocks[idx] = res.data
    } else {
      const res = await apiAddBlock(payload as NewBlockPayload)
      config.value.blocks.push(res.data)
    }
    editorOpen.value = false
  } catch {
    blockError.value = 'Failed to save block.'
  } finally {
    blockSaving.value = false
  }
}

async function onReorder(blocks: HomepageBlock[]) {
  if (!config.value) return
  config.value.blocks = blocks
  try {
    await apiReorderBlocks(blocks.map((b, i) => ({ id: b.id, position: i + 1 })))
  } catch { /* silently ignore — UI already reflects new order */ }
}

function onRemoveHeroImage() {
  if (config.value) config.value.hero.bg_image_path = null
}
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto space-y-6">
    <h1 class="text-[18px] font-semibold text-dash-text">Homepage Editor</h1>

    <p v-if="loadError" class="text-xs text-dash-danger">{{ loadError }}</p>
    <div v-if="loading" class="text-dash-muted text-[13px]">Loading…</div>

    <template v-else-if="config">
      <!-- Hero editor -->
      <div class="space-y-2">
        <HeroEditor
          ref="heroEditorRef"
          v-model="config.hero"
          :saving="heroSaving"
          @save="saveHero"
          @remove-image="onRemoveHeroImage"
        />
        <p v-if="heroSuccess" class="text-xs text-green-600 text-right">Hero saved ✓</p>
      </div>

      <!-- Block list -->
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-dash-faint mb-3">
          Page Blocks — drag to reorder
        </p>
        <BlockList
          :blocks="config.blocks"
          @update:blocks="onReorder"
          @edit="openEditBlock"
          @delete="onDeleteBlock"
          @toggle="onToggleBlock"
          @add-block="openAddBlock"
        />
      </div>
    </template>

    <!-- Block editor drawer -->
    <BlockEditor
      :open="editorOpen"
      :block="editingBlock"
      :brands="brands"
      :saving="blockSaving"
      :error="blockError"
      @close="editorOpen = false"
      @save="onSaveBlock"
    />
  </div>
</template>
```

- [x] **Step 2: Add route to `aroma-admin/src/router/index.ts`**

Inside the `children` array of the layout route, add after the `notifications` route:

```ts
{ path: 'homepage', name: 'homepage', component: () => import('../views/HomepageView.vue') },
```

- [x] **Step 3: Add Homepage to Sidebar nav**

In `aroma-admin/src/components/layout/Sidebar.vue`, add the import for the `Home` icon at the top with the other lucide imports:

```ts
import {
  LayoutDashboard, ShoppingBag, Users, Package, SlidersHorizontal,
  Tag, Grid3X3, Ticket, ShieldCheck, Search, LogOut, Home,
} from 'lucide-vue-next'
```

Then in the `groups` computed, add a new group for Storefront (between catalog and settings):

```ts
{
  label: t('nav.storefront'),
  items: [
    { key: 'homepage', label: t('nav.homepage'), icon: Home, path: 'homepage', badge: null },
  ],
},
```

- [x] **Step 4: Add i18n strings to `aroma-admin/src/locales/en.ts`**

In the `nav` object, add:

```ts
storefront: 'Storefront',
homepage: 'Homepage',
```

- [x] **Step 5: Add Arabic i18n strings to `aroma-admin/src/locales/ar.ts`**

In the `nav` object, add:

```ts
storefront: 'الواجهة',
homepage: 'الصفحة الرئيسية',
```

- [x] **Step 6: Verify the admin builds**

```bash
cd aroma-admin && npm run build 2>&1 | tail -10
```

Expected: Build succeeds with no TypeScript or template errors.

- [x] **Step 7: Commit**

```bash
git add aroma-admin/src/views/HomepageView.vue \
        aroma-admin/src/router/index.ts \
        aroma-admin/src/components/layout/Sidebar.vue \
        aroma-admin/src/locales/en.ts \
        aroma-admin/src/locales/ar.ts
git commit -m "feat: add HomepageView, router entry, sidebar nav, and i18n strings"
```

---

## Task 11: End-to-End Verification

- [x] **Step 1: Run all backend tests**

```bash
cd aroma-api && php artisan test
```

Expected: All tests pass including `HomeTest` and `AdminHomepageTest`.

- [x] **Step 2: Start the API server**

```bash
cd aroma-api && php artisan serve
```

- [x] **Step 3: Start the admin**

```bash
cd aroma-admin && npm run dev
```

Open `http://localhost:5173`, log in as admin, navigate to **Homepage** in the sidebar.

Verify:
- Hero editor shows current headline and subtext
- 5 blocks are listed in order
- Toggling a block off and refreshing the page shows it as disabled
- Drag a block to a new position — refresh to confirm order persisted
- Click "+ Add Block", choose "Featured Brand", pick a brand, save — block appears in the list
- Upload a hero image — save — preview appears

- [x] **Step 4: Start the storefront**

```bash
cd aroma && npm run dev
```

Open `http://localhost:3000`, verify:
- Homepage hero text matches what's in the admin
- If you uploaded a hero image, it appears instead of the animated bottle
- Sections render in the order set in the admin
- Disabled sections do not appear
- Trust Strip is gone

- [x] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: homepage admin control — complete implementation"
```
