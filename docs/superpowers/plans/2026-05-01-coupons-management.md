# Coupons Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full coupon management (admin CRUD + storefront apply/display) with percentage and fixed discounts, expiry, per-user limits, usage caps, and minimum order enforcement.

**Architecture:** A `coupons` table + `coupon_usages` audit table on the backend; a `/coupons/validate` endpoint for preview without consuming a use; coupon revalidated and applied atomically inside `OrderService::createOrder`. Admin dashboard gets a `CouponsView.vue`, storefront checkout gets a coupon input row, order detail pages show the discount breakdown.

**Tech Stack:** Laravel 11 (API), Vue 3 + Vite (admin), Next.js 14 / React (storefront), TanStack Query, Sanctum auth

---

## File Map

**Create:**
- `aroma-api/database/migrations/2026_05_01_000002_create_coupons_table.php`
- `aroma-api/database/migrations/2026_05_01_000003_create_coupon_usages_table.php`
- `aroma-api/database/migrations/2026_05_01_000004_add_coupon_to_orders_table.php`
- `aroma-api/app/Models/Coupon.php`
- `aroma-api/app/Models/CouponUsage.php`
- `aroma-api/database/factories/CouponFactory.php`
- `aroma-api/app/Http/Controllers/Api/CouponController.php`
- `aroma-api/app/Http/Controllers/Api/Admin/AdminCouponController.php`
- `aroma-api/tests/Feature/AdminCouponTest.php`
- `aroma-api/tests/Feature/CouponValidateTest.php`
- `aroma-admin/src/views/CouponsView.vue`

**Modify:**
- `aroma-api/app/Models/Order.php` — add coupon fields to `$fillable` and `$casts`
- `aroma-api/app/Http/Requests/Order/CreateOrderRequest.php` — add `coupon_code` rule
- `aroma-api/app/Services/OrderService.php` — apply coupon inside `createOrder`
- `aroma-api/app/Http/Resources/OrderResource.php` — expose `couponCode`, `discountAmount`
- `aroma-api/app/Http/Controllers/Api/Admin/AdminOrderController.php` — include coupon in `formatOrder`
- `aroma-api/routes/api.php` — register coupon routes
- `aroma-admin/src/types/index.ts` — add `AdminCoupon`, extend `AdminOrder`
- `aroma-admin/src/api/admin.ts` — add coupon API functions
- `aroma-admin/src/router/index.ts` — add `/coupons` route
- `aroma-admin/src/components/layout/Sidebar.vue` — add Coupons sidebar link
- `aroma/src/types/index.ts` — add `couponCode`/`discountAmount` to `Order`, `couponCode` to `CheckoutPayload`
- `aroma/src/mocks/services.ts` — add `validateCoupon`, update `createOrder`
- `aroma/src/lib/api/queries.ts` — add `useValidateCoupon` mutation
- `aroma/src/features/checkout/CheckoutPageClient.tsx` — coupon input + summary breakdown
- `aroma/src/features/orders/OrderDetailClient.tsx` — discount line in price breakdown
- `aroma-admin/src/views/OrderDetailView.vue` — discount line in order summary

---

## Task 1: Database migrations

**Files:**
- Create: `aroma-api/database/migrations/2026_05_01_000002_create_coupons_table.php`
- Create: `aroma-api/database/migrations/2026_05_01_000003_create_coupon_usages_table.php`
- Create: `aroma-api/database/migrations/2026_05_01_000004_add_coupon_to_orders_table.php`

- [ ] **Step 1: Create the coupons migration**

```php
// aroma-api/database/migrations/2026_05_01_000002_create_coupons_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->enum('type', ['percentage', 'fixed']);
            $table->decimal('value', 8, 2);
            $table->decimal('min_order_amount', 8, 2)->nullable();
            $table->unsignedInteger('max_uses')->nullable();
            $table->unsignedInteger('uses_count')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('coupons');
    }
};
```

- [ ] **Step 2: Create the coupon_usages migration**

```php
// aroma-api/database/migrations/2026_05_01_000003_create_coupon_usages_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('coupon_usages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('coupon_id');
            $table->unsignedBigInteger('user_id');
            $table->string('order_id', 20);
            $table->timestamps();

            $table->foreign('coupon_id')->references('id')->on('coupons')->onDelete('restrict');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
        });
    }

    public function down(): void {
        Schema::dropIfExists('coupon_usages');
    }
};
```

- [ ] **Step 3: Create the migration adding coupon columns to orders**

```php
// aroma-api/database/migrations/2026_05_01_000004_add_coupon_to_orders_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('coupon_code')->nullable()->after('admin_note');
            $table->decimal('discount_amount', 8, 2)->nullable()->after('coupon_code');
        });
    }

    public function down(): void {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['coupon_code', 'discount_amount']);
        });
    }
};
```

- [ ] **Step 4: Run migrations**

```bash
cd aroma-api && php artisan migrate
```

Expected: `Migrating: 2026_05_01_000002_create_coupons_table` ... `Migrated` (three migrations run successfully)

- [ ] **Step 5: Commit**

```bash
git add aroma-api/database/migrations/2026_05_01_000002_create_coupons_table.php \
        aroma-api/database/migrations/2026_05_01_000003_create_coupon_usages_table.php \
        aroma-api/database/migrations/2026_05_01_000004_add_coupon_to_orders_table.php
git commit -m "feat: add coupons, coupon_usages migrations and coupon columns to orders"
```

---

## Task 2: Coupon and CouponUsage models + factory

**Files:**
- Create: `aroma-api/app/Models/Coupon.php`
- Create: `aroma-api/app/Models/CouponUsage.php`
- Create: `aroma-api/database/factories/CouponFactory.php`
- Modify: `aroma-api/app/Models/Order.php`

- [ ] **Step 1: Create the Coupon model**

```php
// aroma-api/app/Models/Coupon.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    use HasFactory;

    protected $fillable = [
        'code', 'type', 'value', 'min_order_amount',
        'max_uses', 'uses_count', 'expires_at', 'is_active',
    ];

    protected $casts = [
        'value'            => 'decimal:2',
        'min_order_amount' => 'decimal:2',
        'is_active'        => 'boolean',
        'expires_at'       => 'datetime',
    ];

    public function usages()
    {
        return $this->hasMany(CouponUsage::class);
    }

    public function computeDiscount(float $orderTotal): float
    {
        if ($this->type === 'percentage') {
            return round($orderTotal * ($this->value / 100), 2);
        }
        return min((float) $this->value, $orderTotal);
    }
}
```

- [ ] **Step 2: Create the CouponUsage model**

```php
// aroma-api/app/Models/CouponUsage.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CouponUsage extends Model
{
    protected $fillable = ['coupon_id', 'user_id', 'order_id'];

    public function coupon()
    {
        return $this->belongsTo(Coupon::class);
    }
}
```

- [ ] **Step 3: Create the CouponFactory**

```php
// aroma-api/database/factories/CouponFactory.php
<?php

namespace Database\Factories;

use App\Models\Coupon;
use Illuminate\Database\Eloquent\Factories\Factory;

class CouponFactory extends Factory
{
    protected $model = Coupon::class;

    public function definition(): array
    {
        return [
            'code'             => strtoupper(fake()->unique()->lexify('????')),
            'type'             => fake()->randomElement(['percentage', 'fixed']),
            'value'            => fake()->randomFloat(2, 1, 50),
            'min_order_amount' => null,
            'max_uses'         => null,
            'uses_count'       => 0,
            'expires_at'       => null,
            'is_active'        => true,
        ];
    }

    public function percentage(float $value = 20): static
    {
        return $this->state(['type' => 'percentage', 'value' => $value]);
    }

    public function fixed(float $value = 5): static
    {
        return $this->state(['type' => 'fixed', 'value' => $value]);
    }

    public function expired(): static
    {
        return $this->state(['expires_at' => now()->subDay()]);
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }

    public function withMinOrder(float $amount): static
    {
        return $this->state(['min_order_amount' => $amount]);
    }

    public function maxedOut(): static
    {
        return $this->state(fn($attrs) => ['max_uses' => 1, 'uses_count' => 1]);
    }
}
```

- [ ] **Step 4: Update Order model with coupon fields**

Open `aroma-api/app/Models/Order.php`. Add `coupon_code` and `discount_amount` to `$fillable` and add `discount_amount` to `$casts`:

```php
protected $fillable = [
    'id', 'user_id', 'status', 'total', 'note', 'admin_note',
    'is_pickup', 'address_id', 'delivery_city', 'delivery_description',
    'placeholder_bg', 'placeholder_dot',
    'coupon_code', 'discount_amount',
];

protected $casts = [
    'status'          => OrderStatus::class,
    'total'           => 'decimal:2',
    'is_pickup'       => 'boolean',
    'discount_amount' => 'decimal:2',
];
```

- [ ] **Step 5: Commit**

```bash
git add aroma-api/app/Models/Coupon.php \
        aroma-api/app/Models/CouponUsage.php \
        aroma-api/database/factories/CouponFactory.php \
        aroma-api/app/Models/Order.php
git commit -m "feat: add Coupon and CouponUsage models, factory, update Order fillable"
```

---

## Task 3: CouponController (validate endpoint) + tests

**Files:**
- Create: `aroma-api/app/Http/Controllers/Api/CouponController.php`
- Create: `aroma-api/tests/Feature/CouponValidateTest.php`
- Modify: `aroma-api/routes/api.php`

- [ ] **Step 1: Write the failing tests**

```php
// aroma-api/tests/Feature/CouponValidateTest.php
<?php

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CouponValidateTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    private function asUser(): static
    {
        return $this->actingAs($this->user, 'sanctum');
    }

    public function test_valid_percentage_coupon_returns_discount(): void
    {
        $coupon = Coupon::factory()->percentage(20)->create(['code' => 'SAVE20']);

        $this->asUser()->postJson('/api/coupons/validate', [
            'code'        => 'SAVE20',
            'order_total' => 100,
        ])->assertOk()->assertJson([
            'valid'          => true,
            'type'           => 'percentage',
            'value'          => '20.00',
            'discountAmount' => '20.00',
            'finalTotal'     => '80.00',
        ]);
    }

    public function test_valid_fixed_coupon_returns_discount(): void
    {
        Coupon::factory()->fixed(5)->create(['code' => 'FIVE']);

        $this->asUser()->postJson('/api/coupons/validate', [
            'code'        => 'FIVE',
            'order_total' => 50,
        ])->assertOk()->assertJson([
            'valid'          => true,
            'discountAmount' => '5.00',
            'finalTotal'     => '45.00',
        ]);
    }

    public function test_unknown_coupon_returns_not_found_error(): void
    {
        $this->asUser()->postJson('/api/coupons/validate', [
            'code'        => 'NOPE',
            'order_total' => 100,
        ])->assertOk()->assertJson(['valid' => false, 'error' => 'coupon_not_found']);
    }

    public function test_inactive_coupon_returns_error(): void
    {
        Coupon::factory()->inactive()->create(['code' => 'OFF']);

        $this->asUser()->postJson('/api/coupons/validate', [
            'code'        => 'OFF',
            'order_total' => 100,
        ])->assertOk()->assertJson(['valid' => false, 'error' => 'coupon_inactive']);
    }

    public function test_expired_coupon_returns_error(): void
    {
        Coupon::factory()->expired()->create(['code' => 'OLD']);

        $this->asUser()->postJson('/api/coupons/validate', [
            'code'        => 'OLD',
            'order_total' => 100,
        ])->assertOk()->assertJson(['valid' => false, 'error' => 'coupon_expired']);
    }

    public function test_min_order_not_met_returns_error(): void
    {
        Coupon::factory()->withMinOrder(100)->create(['code' => 'BIG']);

        $this->asUser()->postJson('/api/coupons/validate', [
            'code'        => 'BIG',
            'order_total' => 50,
        ])->assertOk()->assertJson(['valid' => false, 'error' => 'min_order_not_met']);
    }

    public function test_maxed_out_coupon_returns_error(): void
    {
        Coupon::factory()->maxedOut()->create(['code' => 'FULL']);

        $this->asUser()->postJson('/api/coupons/validate', [
            'code'        => 'FULL',
            'order_total' => 100,
        ])->assertOk()->assertJson(['valid' => false, 'error' => 'max_uses_reached']);
    }

    public function test_already_used_coupon_returns_error(): void
    {
        $coupon = Coupon::factory()->create(['code' => 'ONCE']);
        CouponUsage::create(['coupon_id' => $coupon->id, 'user_id' => $this->user->id, 'order_id' => 'ARM-0000-0000']);

        $this->asUser()->postJson('/api/coupons/validate', [
            'code'        => 'ONCE',
            'order_total' => 100,
        ])->assertOk()->assertJson(['valid' => false, 'error' => 'already_used']);
    }

    public function test_guest_cannot_validate(): void
    {
        $this->postJson('/api/coupons/validate', ['code' => 'X', 'order_total' => 100])
            ->assertUnauthorized();
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd aroma-api && php artisan test tests/Feature/CouponValidateTest.php
```

Expected: FAIL — "Route [POST /api/coupons/validate] not found" or similar

- [ ] **Step 3: Create the CouponController**

```php
// aroma-api/app/Http/Controllers/Api/CouponController.php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    public function validate(Request $request)
    {
        $request->validate([
            'code'        => 'required|string',
            'order_total' => 'required|numeric|min:0',
        ]);

        $coupon = Coupon::where('code', strtoupper($request->code))->first();

        if (! $coupon) {
            return response()->json(['valid' => false, 'error' => 'coupon_not_found']);
        }

        if (! $coupon->is_active) {
            return response()->json(['valid' => false, 'error' => 'coupon_inactive']);
        }

        if ($coupon->expires_at && $coupon->expires_at->isPast()) {
            return response()->json(['valid' => false, 'error' => 'coupon_expired']);
        }

        if ($coupon->min_order_amount && $request->order_total < $coupon->min_order_amount) {
            return response()->json(['valid' => false, 'error' => 'min_order_not_met']);
        }

        if ($coupon->max_uses !== null && $coupon->uses_count >= $coupon->max_uses) {
            return response()->json(['valid' => false, 'error' => 'max_uses_reached']);
        }

        $alreadyUsed = $coupon->usages()->where('user_id', $request->user()->id)->exists();
        if ($alreadyUsed) {
            return response()->json(['valid' => false, 'error' => 'already_used']);
        }

        $discount   = $coupon->computeDiscount((float) $request->order_total);
        $finalTotal = max(0, $request->order_total - $discount);

        return response()->json([
            'valid'          => true,
            'type'           => $coupon->type,
            'value'          => number_format($coupon->value, 2),
            'discountAmount' => number_format($discount, 2),
            'finalTotal'     => number_format($finalTotal, 2),
        ]);
    }
}
```

- [ ] **Step 4: Register the route in `routes/api.php`**

In `aroma-api/routes/api.php`, add the import and the route inside the `auth:sanctum` group. Find the existing imports block and add:

```php
use App\Http\Controllers\Api\CouponController;
```

Then inside `Route::middleware('auth:sanctum')->group(...)`, add after the wishlist routes:

```php
Route::post('/coupons/validate', [CouponController::class, 'validate']);
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd aroma-api && php artisan test tests/Feature/CouponValidateTest.php
```

Expected: All 8 tests PASS

- [ ] **Step 6: Commit**

```bash
git add aroma-api/app/Http/Controllers/Api/CouponController.php \
        aroma-api/tests/Feature/CouponValidateTest.php \
        aroma-api/routes/api.php
git commit -m "feat: add POST /coupons/validate endpoint with all validation rules"
```

---

## Task 4: AdminCouponController + tests

**Files:**
- Create: `aroma-api/app/Http/Controllers/Api/Admin/AdminCouponController.php`
- Create: `aroma-api/tests/Feature/AdminCouponTest.php`
- Modify: `aroma-api/routes/api.php`

- [ ] **Step 1: Write the failing tests**

```php
// aroma-api/tests/Feature/AdminCouponTest.php
<?php

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminCouponTest extends TestCase
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

    public function test_index_lists_all_coupons(): void
    {
        Coupon::factory()->count(3)->create();

        $this->asAdmin()->getJson('/api/admin/coupons')
            ->assertOk()
            ->assertJsonCount(3);
    }

    public function test_index_filters_by_code(): void
    {
        Coupon::factory()->create(['code' => 'HELLO']);
        Coupon::factory()->create(['code' => 'WORLD']);

        $this->asAdmin()->getJson('/api/admin/coupons?search=HEL')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.code', 'HELLO');
    }

    public function test_store_creates_coupon_with_uppercased_code(): void
    {
        $this->asAdmin()->postJson('/api/admin/coupons', [
            'code'  => 'save10',
            'type'  => 'percentage',
            'value' => 10,
        ])->assertCreated()->assertJsonPath('code', 'SAVE10');

        $this->assertDatabaseHas('coupons', ['code' => 'SAVE10', 'type' => 'percentage', 'value' => 10]);
    }

    public function test_store_rejects_code_shorter_than_4_chars(): void
    {
        $this->asAdmin()->postJson('/api/admin/coupons', [
            'code'  => 'AB',
            'type'  => 'fixed',
            'value' => 5,
        ])->assertUnprocessable()->assertJsonValidationErrors('code');
    }

    public function test_store_rejects_duplicate_code(): void
    {
        Coupon::factory()->create(['code' => 'DUPE']);

        $this->asAdmin()->postJson('/api/admin/coupons', [
            'code'  => 'DUPE',
            'type'  => 'fixed',
            'value' => 5,
        ])->assertUnprocessable()->assertJsonValidationErrors('code');
    }

    public function test_store_rejects_percentage_over_100(): void
    {
        $this->asAdmin()->postJson('/api/admin/coupons', [
            'code'  => 'OVER',
            'type'  => 'percentage',
            'value' => 150,
        ])->assertUnprocessable()->assertJsonValidationErrors('value');
    }

    public function test_update_changes_coupon_value(): void
    {
        $coupon = Coupon::factory()->create(['code' => 'EDIT']);

        $this->asAdmin()->putJson("/api/admin/coupons/{$coupon->id}", [
            'value' => 30,
        ])->assertOk();

        $this->assertDatabaseHas('coupons', ['id' => $coupon->id, 'value' => 30]);
    }

    public function test_toggle_flips_is_active(): void
    {
        $coupon = Coupon::factory()->create(['is_active' => true]);

        $this->asAdmin()->patchJson("/api/admin/coupons/{$coupon->id}/toggle")
            ->assertOk()
            ->assertJsonPath('isActive', false);

        $this->assertDatabaseHas('coupons', ['id' => $coupon->id, 'is_active' => false]);
    }

    public function test_destroy_deletes_coupon_with_no_usages(): void
    {
        $coupon = Coupon::factory()->create();

        $this->asAdmin()->deleteJson("/api/admin/coupons/{$coupon->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('coupons', ['id' => $coupon->id]);
    }

    public function test_destroy_blocks_coupon_with_usages(): void
    {
        $coupon = Coupon::factory()->create();
        CouponUsage::create(['coupon_id' => $coupon->id, 'user_id' => $this->admin->id, 'order_id' => 'ARM-0000-0000']);

        $this->asAdmin()->deleteJson("/api/admin/coupons/{$coupon->id}")
            ->assertUnprocessable();

        $this->assertDatabaseHas('coupons', ['id' => $coupon->id]);
    }

    public function test_non_admin_cannot_access(): void
    {
        $user = User::factory()->create(['is_admin' => false]);
        $this->actingAs($user, 'sanctum')->getJson('/api/admin/coupons')->assertForbidden();
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd aroma-api && php artisan test tests/Feature/AdminCouponTest.php
```

Expected: FAIL — routes not found

- [ ] **Step 3: Create AdminCouponController**

```php
// aroma-api/app/Http/Controllers/Api/Admin/AdminCouponController.php
<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\Request;

class AdminCouponController extends Controller
{
    public function index(Request $request)
    {
        $query = Coupon::orderByDesc('created_at');

        if ($request->filled('search')) {
            $query->where('code', 'like', '%' . strtoupper($request->search) . '%');
        }

        return response()->json($query->get()->map(fn($c) => $this->format($c)));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code'             => 'required|string|min:4|unique:coupons,code',
            'type'             => 'required|in:percentage,fixed',
            'value'            => [
                'required', 'numeric', 'min:0.01',
                function ($attr, $val, $fail) use ($request) {
                    if ($request->type === 'percentage' && $val > 100) {
                        $fail('Percentage value cannot exceed 100.');
                    }
                },
            ],
            'min_order_amount' => 'nullable|numeric|min:0',
            'max_uses'         => 'nullable|integer|min:1',
            'expires_at'       => 'nullable|date|after:today',
            'is_active'        => 'boolean',
        ]);

        $data['code'] = strtoupper($data['code']);
        $coupon = Coupon::create($data);

        return response()->json($this->format($coupon), 201);
    }

    public function update(Request $request, int $id)
    {
        $coupon = Coupon::findOrFail($id);

        $data = $request->validate([
            'code'             => "sometimes|string|min:4|unique:coupons,code,{$id}",
            'type'             => 'sometimes|in:percentage,fixed',
            'value'            => [
                'sometimes', 'numeric', 'min:0.01',
                function ($attr, $val, $fail) use ($request, $coupon) {
                    $type = $request->type ?? $coupon->type;
                    if ($type === 'percentage' && $val > 100) {
                        $fail('Percentage value cannot exceed 100.');
                    }
                },
            ],
            'min_order_amount' => 'nullable|numeric|min:0',
            'max_uses'         => 'nullable|integer|min:1',
            'expires_at'       => 'nullable|date',
            'is_active'        => 'boolean',
        ]);

        if (isset($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }

        $coupon->update($data);

        return response()->json($this->format($coupon->fresh()));
    }

    public function toggle(int $id)
    {
        $coupon = Coupon::findOrFail($id);
        $coupon->update(['is_active' => ! $coupon->is_active]);

        return response()->json($this->format($coupon->fresh()));
    }

    public function destroy(int $id)
    {
        $coupon = Coupon::findOrFail($id);

        if ($coupon->usages()->exists()) {
            return response()->json([
                'message' => 'Cannot delete a coupon that has been used. Deactivate it instead.',
            ], 422);
        }

        $coupon->delete();
        return response()->json(null, 204);
    }

    private function format(Coupon $c): array
    {
        return [
            'id'             => $c->id,
            'code'           => $c->code,
            'type'           => $c->type,
            'value'          => $c->value,
            'minOrderAmount' => $c->min_order_amount,
            'maxUses'        => $c->max_uses,
            'usesCount'      => $c->uses_count,
            'expiresAt'      => $c->expires_at?->toISOString(),
            'isActive'       => $c->is_active,
            'createdAt'      => $c->created_at->toISOString(),
        ];
    }
}
```

- [ ] **Step 4: Register admin coupon routes**

In `aroma-api/routes/api.php`, add the import:

```php
use App\Http\Controllers\Api\Admin\AdminCouponController;
```

Inside the admin middleware group (`Route::middleware(['auth:sanctum', 'is_admin'])->prefix('admin')`), add:

```php
Route::get('/coupons',                [AdminCouponController::class, 'index']);
Route::post('/coupons',               [AdminCouponController::class, 'store']);
Route::put('/coupons/{id}',           [AdminCouponController::class, 'update']);
Route::delete('/coupons/{id}',        [AdminCouponController::class, 'destroy']);
Route::patch('/coupons/{id}/toggle',  [AdminCouponController::class, 'toggle']);
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd aroma-api && php artisan test tests/Feature/AdminCouponTest.php
```

Expected: All 10 tests PASS

- [ ] **Step 6: Run all tests to check for regressions**

```bash
cd aroma-api && php artisan test
```

Expected: All existing tests still pass

- [ ] **Step 7: Commit**

```bash
git add aroma-api/app/Http/Controllers/Api/Admin/AdminCouponController.php \
        aroma-api/tests/Feature/AdminCouponTest.php \
        aroma-api/routes/api.php
git commit -m "feat: add admin coupon CRUD + toggle endpoints with tests"
```

---

## Task 5: Apply coupon in OrderService + update OrderResource

**Files:**
- Modify: `aroma-api/app/Http/Requests/Order/CreateOrderRequest.php`
- Modify: `aroma-api/app/Services/OrderService.php`
- Modify: `aroma-api/app/Http/Resources/OrderResource.php`
- Modify: `aroma-api/app/Http/Controllers/Api/Admin/AdminOrderController.php`

- [ ] **Step 1: Add `coupon_code` to CreateOrderRequest**

Open `aroma-api/app/Http/Requests/Order/CreateOrderRequest.php`. Add to the `rules()` array:

```php
'coupon_code' => ['nullable', 'string'],
```

- [ ] **Step 2: Update OrderService to apply the coupon**

Open `aroma-api/app/Services/OrderService.php`. Add the import at the top:

```php
use App\Models\Coupon;
use App\Models\CouponUsage;
use Illuminate\Validation\ValidationException;
```

Replace the `createOrder` method with this updated version (all other code stays identical, only the Order::create call and the block before it changes):

```php
public function createOrder(User $user, array $data): Order
{
    $deliveryCity        = null;
    $deliveryDescription = null;
    $addressId           = null;

    if (! $data['is_pickup'] && ! empty($data['address_id'])) {
        $address = Address::find($data['address_id']);
        if (! $address || $address->user_id !== $user->id) {
            throw ValidationException::withMessages([
                'address_id' => ['العنوان المحدد غير صالح.'],
            ]);
        }
        $addressId           = $address->id;
        $deliveryCity        = $address->city;
        $deliveryDescription = $address->description;
    }

    // Resolve coupon
    $coupon         = null;
    $discountAmount = 0;
    $couponCode     = null;

    if (! empty($data['coupon_code'])) {
        $coupon = Coupon::where('code', strtoupper($data['coupon_code']))->first();

        if (! $coupon || ! $coupon->is_active) {
            throw ValidationException::withMessages(['coupon_code' => ['coupon_inactive']]);
        }
        if ($coupon->expires_at && $coupon->expires_at->isPast()) {
            throw ValidationException::withMessages(['coupon_code' => ['coupon_expired']]);
        }
        if ($coupon->min_order_amount && $data['total'] < $coupon->min_order_amount) {
            throw ValidationException::withMessages(['coupon_code' => ['min_order_not_met']]);
        }
        if ($coupon->max_uses !== null && $coupon->uses_count >= $coupon->max_uses) {
            throw ValidationException::withMessages(['coupon_code' => ['max_uses_reached']]);
        }
        if ($coupon->usages()->where('user_id', $user->id)->exists()) {
            throw ValidationException::withMessages(['coupon_code' => ['already_used']]);
        }

        $discountAmount = $coupon->computeDiscount((float) $data['total']);
        $couponCode     = $coupon->code;
    }

    $finalTotal = max(0, $data['total'] - $discountAmount);
    $orderId    = $this->generateOrderId();

    $order = Order::create([
        'id'                   => $orderId,
        'user_id'              => $user->id,
        'status'               => OrderStatus::Placed,
        'total'                => $finalTotal,
        'note'                 => $data['note'] ?? null,
        'is_pickup'            => $data['is_pickup'],
        'address_id'           => $addressId,
        'delivery_city'        => $deliveryCity,
        'delivery_description' => $deliveryDescription,
        'placeholder_bg'       => '#F2E8E5',
        'placeholder_dot'      => '#C9A0A0',
        'coupon_code'          => $couponCode,
        'discount_amount'      => $discountAmount > 0 ? $discountAmount : null,
    ]);

    foreach ($data['items'] as $item) {
        $variant = \App\Models\ProductVariant::find($item['product_variant_id']);
        $order->items()->create([
            'product_variant_id' => $variant->id,
            'product_name'       => $variant->product->name,
            'brand'              => $variant->product->brand->name,
            'size'               => $variant->size,
            'qty'                => $item['quantity'],
            'unit_price'         => $variant->price,
        ]);
    }

    // Record coupon usage and increment count
    if ($coupon) {
        CouponUsage::create([
            'coupon_id' => $coupon->id,
            'user_id'   => $user->id,
            'order_id'  => $orderId,
        ]);
        $coupon->increment('uses_count');
    }

    $statuses = ['Order Placed', 'Confirmed', 'Preparing', 'Ready for Pickup', 'Delivered'];
    foreach ($statuses as $index => $status) {
        \App\Models\OrderTimeline::create([
            'order_id'   => $orderId,
            'status'     => $status,
            'done'       => $index === 0,
            'sort_order' => $index,
        ]);
    }

    return $order->load(['items', 'timeline']);
}
```

- [ ] **Step 3: Update OrderResource to expose coupon fields**

Open `aroma-api/app/Http/Resources/OrderResource.php`. Add these two fields inside the `toArray` return array:

```php
'couponCode'     => $this->coupon_code,
'discountAmount' => $this->discount_amount ? (float) $this->discount_amount : null,
```

- [ ] **Step 4: Update AdminOrderController formatOrder to include coupon fields**

Open `aroma-api/app/Http/Controllers/Api/Admin/AdminOrderController.php`. In the `formatOrder` method, add to the `$base` array:

```php
'couponCode'     => $order->coupon_code,
'discountAmount' => $order->discount_amount ? (float) $order->discount_amount : null,
```

- [ ] **Step 5: Run all tests**

```bash
cd aroma-api && php artisan test
```

Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add aroma-api/app/Http/Requests/Order/CreateOrderRequest.php \
        aroma-api/app/Services/OrderService.php \
        aroma-api/app/Http/Resources/OrderResource.php \
        aroma-api/app/Http/Controllers/Api/Admin/AdminOrderController.php
git commit -m "feat: apply coupon in OrderService, expose coupon fields in order responses"
```

---

## Task 6: Admin dashboard — types, API, router, sidebar

**Files:**
- Modify: `aroma-admin/src/types/index.ts`
- Modify: `aroma-admin/src/api/admin.ts`
- Modify: `aroma-admin/src/router/index.ts`
- Modify: `aroma-admin/src/components/layout/Sidebar.vue`

- [ ] **Step 1: Add AdminCoupon type and extend AdminOrder**

Open `aroma-admin/src/types/index.ts`. Add after the existing `AdminOrder` interface:

```ts
// ── Coupons ───────────────────────────────────────────────────────────
export interface AdminCoupon {
  id: number
  code: string
  type: 'percentage' | 'fixed'
  value: number
  minOrderAmount: number | null
  maxUses: number | null
  usesCount: number
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}
```

In the existing `AdminOrder` interface, add:

```ts
couponCode?: string | null
discountAmount?: number | null
```

- [ ] **Step 2: Add coupon API functions**

Open `aroma-admin/src/api/admin.ts`. Add the import to the top `import type { ... }` line — add `AdminCoupon` to the existing type import. Then append at the bottom of the file:

```ts
// ── Coupons ───────────────────────────────────────────────────────────
export const apiGetCoupons = (params?: { search?: string }) =>
  client.get<AdminCoupon[]>('/admin/coupons', { params })

export const apiCreateCoupon = (data: {
  code: string
  type: 'percentage' | 'fixed'
  value: number
  min_order_amount?: number | null
  max_uses?: number | null
  expires_at?: string | null
  is_active?: boolean
}) =>
  client.post<AdminCoupon>('/admin/coupons', data)

export const apiUpdateCoupon = (id: number, data: Partial<{
  code: string
  type: 'percentage' | 'fixed'
  value: number
  min_order_amount: number | null
  max_uses: number | null
  expires_at: string | null
  is_active: boolean
}>) =>
  client.put<AdminCoupon>(`/admin/coupons/${id}`, data)

export const apiDeleteCoupon = (id: number) =>
  client.delete(`/admin/coupons/${id}`)

export const apiToggleCoupon = (id: number) =>
  client.patch<AdminCoupon>(`/admin/coupons/${id}/toggle`)
```

- [ ] **Step 3: Add the /coupons route to router**

Open `aroma-admin/src/router/index.ts`. Inside the `children` array (alongside `brands`, `categories`), add:

```ts
{ path: 'coupons', name: 'coupons', component: () => import('../views/CouponsView.vue') },
```

- [ ] **Step 4: Add Coupons to the sidebar**

Open `aroma-admin/src/components/layout/Sidebar.vue`. In the `<script setup>` block, add `Ticket` to the import:

```ts
import { LayoutDashboard, ShoppingBag, Package, Tag, Grid3X3, Users, Ticket } from 'lucide-vue-next'
```

Add a new `marketingItems` array (or append to `catalogItems` — appending to `catalogItems` is simpler):

```ts
const catalogItems = [
  { to: '/products',   label: 'Products',   icon: Package },
  { to: '/brands',     label: 'Brands',     icon: Tag },
  { to: '/categories', label: 'Categories', icon: Grid3X3 },
  { to: '/coupons',    label: 'Coupons',    icon: Ticket },
]
```

- [ ] **Step 5: Commit**

```bash
git add aroma-admin/src/types/index.ts \
        aroma-admin/src/api/admin.ts \
        aroma-admin/src/router/index.ts \
        aroma-admin/src/components/layout/Sidebar.vue
git commit -m "feat: add AdminCoupon type, coupon API functions, router route and sidebar link"
```

---

## Task 7: Admin CouponsView.vue

**Files:**
- Create: `aroma-admin/src/views/CouponsView.vue`

- [ ] **Step 1: Create CouponsView.vue**

```vue
<!-- aroma-admin/src/views/CouponsView.vue -->
<template>
  <div class="space-y-4">
    <div v-if="loadError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ loadError }}
    </div>

    <div class="flex items-center gap-3">
      <AInput v-model="search" placeholder="Search by code…" class="w-56" @input="debouncedLoad" />
      <div class="ml-auto">
        <AButton size="sm" @click="openCreate"><Plus :size="14" /> New Coupon</AButton>
      </div>
    </div>

    <ATable :columns="cols" :rows="coupons" :loading="loading">
      <template #cell-code="{ value }">
        <span class="font-mono text-xs font-semibold tracking-wider">{{ value }}</span>
      </template>
      <template #cell-type="{ row }">
        <span class="text-xs">
          {{ (row as AdminCoupon).type === 'percentage' ? 'Percentage' : 'Fixed' }}
        </span>
      </template>
      <template #cell-value="{ row }">
        <span class="text-xs">
          {{ (row as AdminCoupon).type === 'percentage'
            ? `${(row as AdminCoupon).value}%`
            : `${(row as AdminCoupon).value} LYD` }}
        </span>
      </template>
      <template #cell-minOrderAmount="{ value }">
        <span class="text-xs text-dash-muted">{{ value ? `${value} LYD` : '—' }}</span>
      </template>
      <template #cell-uses="{ row }">
        <span class="text-xs">
          {{ (row as AdminCoupon).usesCount }} / {{ (row as AdminCoupon).maxUses ?? '∞' }}
        </span>
      </template>
      <template #cell-expiresAt="{ value }">
        <span class="text-xs text-dash-muted">{{ value ? value.slice(0, 10) : 'Never' }}</span>
      </template>
      <template #cell-isActive="{ value }">
        <span
          :class="value
            ? 'bg-dash-success-lt text-dash-success border-dash-success/20'
            : 'bg-dash-danger-lt text-dash-danger border-dash-danger/20'"
          class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold"
        >{{ value ? 'Active' : 'Inactive' }}</span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-1.5 justify-end">
          <AButton size="sm" variant="ghost" @click.stop="openEdit(row as AdminCoupon)">Edit</AButton>
          <AButton size="sm" variant="ghost" @click.stop="handleToggle(row as AdminCoupon)">
            {{ (row as AdminCoupon).isActive ? 'Disable' : 'Enable' }}
          </AButton>
          <AButton size="sm" variant="danger" @click.stop="confirmDelete(row as AdminCoupon)">Delete</AButton>
        </div>
      </template>
      <template #empty>
        <AEmptyState :icon="Ticket" heading="No coupons yet" />
      </template>
    </ATable>

    <!-- Create / Edit Modal -->
    <AModal :open="modalOpen" :title="editing ? 'Edit Coupon' : 'New Coupon'" @close="closeModal">
      <form class="space-y-3" @submit.prevent>
        <AInput
          v-model="form.code"
          label="Code (min 4 chars)"
          placeholder="e.g. SAVE20"
          :error="formErrors.code"
          @input="form.code = form.code.toUpperCase()"
        />
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-2xs font-semibold text-dash-muted uppercase tracking-wider mb-1">Type</label>
            <select
              v-model="form.type"
              class="w-full rounded-btn border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text focus:outline-none focus:ring-1 focus:ring-dash-primary"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (LYD)</option>
            </select>
          </div>
          <AInput
            v-model.number="form.value"
            :label="form.type === 'percentage' ? 'Value (%)' : 'Value (LYD)'"
            type="number"
            :placeholder="form.type === 'percentage' ? '20' : '5.00'"
            :error="formErrors.value"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <AInput
            v-model.number="form.min_order_amount"
            label="Min Order (LYD)"
            type="number"
            placeholder="Optional"
          />
          <AInput
            v-model.number="form.max_uses"
            label="Max Uses"
            type="number"
            placeholder="Optional (∞)"
          />
        </div>
        <AInput
          v-model="form.expires_at"
          label="Expires At"
          type="date"
          placeholder="Optional"
        />
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="form.is_active" type="checkbox" class="rounded" />
          <span class="text-sm text-dash-text">Active</span>
        </label>
        <p v-if="formErrors.general" class="text-xs text-dash-danger">{{ formErrors.general }}</p>
      </form>
      <template #footer>
        <AButton variant="secondary" size="sm" @click="closeModal">Cancel</AButton>
        <AButton size="sm" :loading="saving" @click="handleSave">{{ editing ? 'Save' : 'Create' }}</AButton>
      </template>
    </AModal>

    <!-- Delete confirm -->
    <AConfirmDialog
      :open="!!deletingCoupon"
      title="Delete coupon?"
      :message="`Delete &quot;${deletingCoupon?.code}&quot;? This cannot be undone.`"
      confirm-label="Delete"
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="deletingCoupon = null"
    />
    <div v-if="deleteError" class="rounded-lg bg-dash-danger-lt border border-dash-danger/20 px-3 py-2 text-xs text-dash-danger">
      {{ deleteError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Plus, Ticket } from 'lucide-vue-next'
import {
  apiGetCoupons, apiCreateCoupon, apiUpdateCoupon,
  apiDeleteCoupon, apiToggleCoupon,
} from '../api/admin'
import type { AdminCoupon } from '../types'
import ATable from '../components/ui/ATable.vue'
import AButton from '../components/ui/AButton.vue'
import AInput from '../components/ui/AInput.vue'
import AModal from '../components/ui/AModal.vue'
import AConfirmDialog from '../components/ui/AConfirmDialog.vue'
import AEmptyState from '../components/ui/AEmptyState.vue'

const cols = [
  { key: 'code',           label: 'Code' },
  { key: 'type',           label: 'Type' },
  { key: 'value',          label: 'Value' },
  { key: 'minOrderAmount', label: 'Min Order' },
  { key: 'uses',           label: 'Uses' },
  { key: 'expiresAt',      label: 'Expires' },
  { key: 'isActive',       label: 'Status' },
]

const coupons      = ref<AdminCoupon[]>([])
const loading      = ref(false)
const loadError    = ref('')
const search       = ref('')

const modalOpen    = ref(false)
const editing      = ref<AdminCoupon | null>(null)
const saving       = ref(false)
const formErrors   = ref<Record<string, string>>({})

const deletingCoupon = ref<AdminCoupon | null>(null)
const deleting       = ref(false)
const deleteError    = ref('')

const emptyForm = () => ({
  code:             '',
  type:             'percentage' as 'percentage' | 'fixed',
  value:            0,
  min_order_amount: null as number | null,
  max_uses:         null as number | null,
  expires_at:       '',
  is_active:        true,
})

const form = ref(emptyForm())

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(load, 300)
}

async function load() {
  loading.value  = true
  loadError.value = ''
  try {
    const res   = await apiGetCoupons({ search: search.value || undefined })
    coupons.value = res.data
  } catch {
    loadError.value = 'Failed to load coupons.'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value   = null
  form.value      = emptyForm()
  formErrors.value = {}
  modalOpen.value = true
}

function openEdit(coupon: AdminCoupon) {
  editing.value   = coupon
  form.value = {
    code:             coupon.code,
    type:             coupon.type,
    value:            coupon.value,
    min_order_amount: coupon.minOrderAmount,
    max_uses:         coupon.maxUses,
    expires_at:       coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
    is_active:        coupon.isActive,
  }
  formErrors.value = {}
  modalOpen.value  = true
}

function closeModal() {
  modalOpen.value = false
}

async function handleSave() {
  formErrors.value = {}
  saving.value     = true
  try {
    const payload = {
      ...form.value,
      min_order_amount: form.value.min_order_amount || null,
      max_uses:         form.value.max_uses || null,
      expires_at:       form.value.expires_at || null,
    }
    if (editing.value) {
      await apiUpdateCoupon(editing.value.id, payload)
    } else {
      await apiCreateCoupon(payload)
    }
    closeModal()
    await load()
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? {}
    formErrors.value = {
      code:    errors.code?.[0]    ?? '',
      value:   errors.value?.[0]   ?? '',
      general: errors.general?.[0] ?? (Object.keys(errors).length ? 'Please check the fields above.' : 'Something went wrong.'),
    }
  } finally {
    saving.value = false
  }
}

async function handleToggle(coupon: AdminCoupon) {
  try {
    const res = await apiToggleCoupon(coupon.id)
    const idx = coupons.value.findIndex(c => c.id === coupon.id)
    if (idx !== -1) coupons.value[idx] = res.data
  } catch {
    loadError.value = 'Failed to toggle coupon.'
  }
}

function confirmDelete(coupon: AdminCoupon) {
  deletingCoupon.value = coupon
  deleteError.value    = ''
}

async function handleDelete() {
  if (! deletingCoupon.value) return
  deleting.value = true
  try {
    await apiDeleteCoupon(deletingCoupon.value.id)
    deletingCoupon.value = null
    await load()
  } catch (err: any) {
    deleteError.value = err?.response?.data?.message ?? 'Failed to delete coupon.'
    deletingCoupon.value = null
  } finally {
    deleting.value = false
  }
}

onMounted(load)
onUnmounted(() => clearTimeout(debounceTimer))
</script>
```

- [ ] **Step 2: Commit**

```bash
git add aroma-admin/src/views/CouponsView.vue
git commit -m "feat: add CouponsView admin page with list, create, edit, toggle, delete"
```

---

## Task 8: Admin OrderDetailView — show coupon discount line

**Files:**
- Modify: `aroma-admin/src/views/OrderDetailView.vue`

- [ ] **Step 1: Find the price/total section in OrderDetailView.vue**

Open `aroma-admin/src/views/OrderDetailView.vue`. Find where the order `total` is displayed (search for `total`). It will be in the right sidebar panel. Add the coupon discount row just before the total line:

```vue
<!-- Discount row — only shown when a coupon was applied -->
<div v-if="order.discountAmount" class="flex justify-between text-sm text-dash-muted">
  <span>Coupon <span class="font-mono font-semibold text-dash-text">{{ order.couponCode }}</span></span>
  <span class="text-dash-success">−{{ order.discountAmount }} LYD</span>
</div>
```

Also add a subtotal row above the discount (if a coupon is applied), so the breakdown is clear. Wrap the existing total display to show subtotal when a coupon is present:

```vue
<div v-if="order.discountAmount" class="flex justify-between text-sm text-dash-muted">
  <span>Subtotal</span>
  <span>{{ (parseFloat(order.total) + parseFloat(String(order.discountAmount))).toFixed(2) }} LYD</span>
</div>
<div v-if="order.discountAmount" class="flex justify-between text-sm text-dash-muted">
  <span>Coupon <span class="font-mono font-semibold text-dash-text">{{ order.couponCode }}</span></span>
  <span class="text-dash-success">−{{ order.discountAmount }} LYD</span>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add aroma-admin/src/views/OrderDetailView.vue
git commit -m "feat: show coupon discount breakdown in admin order detail"
```

---

## Task 9: Storefront types + service + query hook

**Files:**
- Modify: `aroma/src/types/index.ts`
- Modify: `aroma/src/mocks/services.ts`
- Modify: `aroma/src/lib/api/queries.ts`

- [ ] **Step 1: Update Order type and CheckoutPayload**

Open `aroma/src/types/index.ts`. In the `Order` interface, add:

```ts
couponCode?: string | null
discountAmount?: number | null
```

In the `CheckoutPayload` interface, add:

```ts
couponCode?: string
```

- [ ] **Step 2: Add validateCoupon service and update createOrder**

Open `aroma/src/mocks/services.ts`. Add the `validateCoupon` function:

```ts
export type CouponValidation =
  | { valid: true; type: 'percentage' | 'fixed'; value: string; discountAmount: string; finalTotal: string }
  | { valid: false; error: string }

export async function validateCoupon(code: string, orderTotal: number): Promise<CouponValidation> {
  const res = await fetch(`${API_URL}/api/coupons/validate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body:    JSON.stringify({ code, order_total: orderTotal }),
  })
  if (!res.ok) throw new Error('Failed to validate coupon')
  return res.json()
}
```

Update the existing `createOrder` function to pass `coupon_code`:

```ts
export async function createOrder(payload: CheckoutPayload): Promise<Order> {
  const res = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      items:       payload.items.map(i => ({
        product_variant_id: i.variantId,
        quantity:           i.quantity,
      })),
      note:        payload.note ?? null,
      is_pickup:   payload.pickup,
      address_id:  payload.pickup ? null : (payload.addressId ?? null),
      total:       payload.total,
      coupon_code: payload.couponCode ?? null,
    }),
  })
  if (!res.ok) throw new Error('Failed to create order')
  const json = await res.json()
  return json.data || json
}
```

- [ ] **Step 3: Add useValidateCoupon mutation to queries.ts**

Open `aroma/src/lib/api/queries.ts`. Add the import at the top (alongside the existing `import * as services`):

```ts
import type { CouponValidation } from '@/mocks/services'
```

Then add the mutation after the existing order hooks:

```ts
export function useValidateCoupon() {
  return useMutation({
    mutationFn: ({ code, orderTotal }: { code: string; orderTotal: number }) =>
      services.validateCoupon(code, orderTotal),
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add aroma/src/types/index.ts \
        aroma/src/mocks/services.ts \
        aroma/src/lib/api/queries.ts
git commit -m "feat: add coupon fields to Order type, validateCoupon service, useValidateCoupon hook"
```

---

## Task 10: Checkout page — coupon input + discount summary

**Files:**
- Modify: `aroma/src/features/checkout/CheckoutPageClient.tsx`

- [ ] **Step 1: Add coupon state and logic to CheckoutPageClient**

Open `aroma/src/features/checkout/CheckoutPageClient.tsx`.

Add the import at the top alongside existing imports:

```tsx
import { useValidateCoupon } from '@/lib/api/queries'
import type { CouponValidation } from '@/mocks/services'
```

Inside the component function, add these state variables (after existing `useState` declarations):

```tsx
const validateCoupon = useValidateCoupon()
const [couponInput,   setCouponInput]   = useState('')
const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation & { valid: true } | null>(null)
const [couponError,   setCouponError]   = useState('')

const finalTotal = appliedCoupon
  ? subtotal - parseFloat(appliedCoupon.discountAmount)
  : subtotal

async function handleApplyCoupon() {
  if (!couponInput.trim()) return
  setCouponError('')
  try {
    const result = await validateCoupon.mutateAsync({
      code:       couponInput.trim().toUpperCase(),
      orderTotal: subtotal,
    })
    if (result.valid) {
      setAppliedCoupon(result)
      setCouponError('')
    } else {
      setAppliedCoupon(null)
      const messages: Record<string, string> = {
        coupon_not_found:   'الكوبون غير موجود',
        coupon_inactive:    'هذا الكوبون غير مفعّل',
        coupon_expired:     'انتهت صلاحية الكوبون',
        min_order_not_met:  'الطلب أقل من الحد الأدنى لتطبيق الكوبون',
        max_uses_reached:   'تم استنفاد استخدامات هذا الكوبون',
        already_used:       'لقد استخدمت هذا الكوبون من قبل',
      }
      setCouponError(messages[result.error] ?? 'الكوبون غير صالح')
    }
  } catch {
    setCouponError('حدث خطأ. حاول مرة أخرى.')
  }
}

function handleRemoveCoupon() {
  setAppliedCoupon(null)
  setCouponInput('')
  setCouponError('')
}
```

Update the `onSubmit` function to pass `couponCode` in the payload:

```tsx
await createOrder.mutateAsync({
  note:       data.note,
  pickup:     data.pickup,
  addressId:  data.pickup ? undefined : selectedAddressId,
  items:      cartItems,
  total:      subtotal,
  couponCode: appliedCoupon ? couponInput.trim().toUpperCase() : undefined,
})
```

- [ ] **Step 2: Add coupon UI to the checkout summary**

In the JSX of `CheckoutPageClient.tsx`, find where `subtotal` and the total/confirm button are displayed. Add the coupon row between them:

```tsx
{/* Coupon input */}
{!appliedCoupon ? (
  <div className="flex gap-2 mt-3">
    <input
      type="text"
      value={couponInput}
      onChange={e => setCouponInput(e.target.value.toUpperCase())}
      placeholder="كوبون الخصم"
      dir="rtl"
      className="flex-1 border border-aroma-border rounded px-3 py-2 font-sans text-[13px] bg-transparent focus:outline-none focus:border-aroma-text"
    />
    <button
      type="button"
      onClick={handleApplyCoupon}
      disabled={validateCoupon.isPending || !couponInput.trim()}
      className="border border-aroma-border rounded px-4 py-2 font-sans text-[13px] hover:border-aroma-text transition-colors disabled:opacity-40"
    >
      {validateCoupon.isPending ? '…' : 'تطبيق'}
    </button>
  </div>
) : (
  <div className="flex items-center justify-between mt-3 rounded bg-green-50 border border-green-200 px-3 py-2">
    <span className="font-sans text-[13px] text-green-700">
      كوبون <span className="font-mono font-bold">{appliedCoupon.discountAmount && `${couponInput}`}</span> — خصم {appliedCoupon.discountAmount} LYD
    </span>
    <button
      type="button"
      onClick={handleRemoveCoupon}
      className="text-[11px] text-green-600 hover:text-red-500 transition-colors ml-2"
    >✕</button>
  </div>
)}
{couponError && (
  <p className="mt-1 font-sans text-[12px] text-red-500" dir="rtl">{couponError}</p>
)}

{/* Price breakdown */}
{appliedCoupon && (
  <div className="flex justify-between font-sans text-[13px] text-aroma-muted mt-3">
    <span>المجموع الفرعي</span>
    <span>{formatPrice(subtotal)}</span>
  </div>
)}
{appliedCoupon && (
  <div className="flex justify-between font-sans text-[13px] text-green-600 mt-1">
    <span>كوبون {couponInput}</span>
    <span>−{appliedCoupon.discountAmount} LYD</span>
  </div>
)}
```

Also update any existing total display line to use `finalTotal` instead of `subtotal`.

- [ ] **Step 3: Handle coupon errors on order submit**

In the existing `onSubmit` catch block inside `CheckoutPageClient.tsx`, add coupon-specific error handling:

```tsx
} catch (err: any) {
  const couponErrors = err?.response?.data?.errors?.coupon_code
  if (couponErrors?.length) {
    const messages: Record<string, string> = {
      coupon_inactive:   'هذا الكوبون غير مفعّل',
      coupon_expired:    'انتهت صلاحية الكوبون',
      min_order_not_met: 'الطلب أقل من الحد الأدنى لتطبيق الكوبون',
      max_uses_reached:  'تم استنفاد استخدامات هذا الكوبون',
      already_used:      'لقد استخدمت هذا الكوبون من قبل',
    }
    setCouponError(messages[couponErrors[0]] ?? 'الكوبون غير صالح')
    handleRemoveCoupon()
  }
  // existing error handling continues...
}
```

- [ ] **Step 4: Commit**

```bash
git add aroma/src/features/checkout/CheckoutPageClient.tsx
git commit -m "feat: add coupon input and discount summary to checkout page"
```

---

## Task 11: Order detail — show coupon discount line

**Files:**
- Modify: `aroma/src/features/orders/OrderDetailClient.tsx`

- [ ] **Step 1: Add coupon discount breakdown to OrderDetailClient**

Open `aroma/src/features/orders/OrderDetailClient.tsx`. Find where the `order.total` is displayed (the price summary section). Add the discount rows above the total:

```tsx
{/* Coupon discount breakdown */}
{order.discountAmount && (
  <>
    <div className="flex justify-between font-sans text-[13px] text-aroma-muted">
      <span>المجموع الفرعي</span>
      <span>{formatPrice(order.total + order.discountAmount)}</span>
    </div>
    <div className="flex justify-between font-sans text-[13px] text-green-600">
      <span>كوبون <span className="font-mono font-semibold">{order.couponCode}</span></span>
      <span>−{order.discountAmount.toFixed(2)} LYD</span>
    </div>
  </>
)}
```

- [ ] **Step 2: Commit**

```bash
git add aroma/src/features/orders/OrderDetailClient.tsx
git commit -m "feat: show coupon discount breakdown in storefront order detail"
```

---

## Task 12: Smoke test end-to-end

- [ ] **Step 1: Start all three servers**

```bash
# Terminal 1
cd aroma-api && php artisan serve

# Terminal 2
cd aroma-admin && npm run dev

# Terminal 3
cd aroma && npm run dev
```

- [ ] **Step 2: Create a test coupon in the admin**

Navigate to `http://localhost:5173/coupons` (admin). Click "New Coupon", create:
- Code: `TEST20`
- Type: Percentage
- Value: 20
- Leave other fields empty
- Active: checked

Verify it appears in the list with "Active" badge and "20%" value.

- [ ] **Step 3: Test the storefront apply flow**

Log in to the storefront, add items to the cart, go to checkout. Enter `TEST20` in the coupon field and click تطبيق. Verify:
- Green confirmation row appears with discount amount
- Total updates to show 20% off
- Subtotal + coupon breakdown rows visible

- [ ] **Step 4: Place the order and verify coupon is recorded**

Complete checkout. Go to the order detail page. Verify the discount breakdown shows subtotal, coupon line, and final total.

- [ ] **Step 5: Check admin order detail**

In the admin, open the order. Verify the coupon code and discount amount appear in the order summary.

- [ ] **Step 6: Verify coupon usage tracking**

Back in admin Coupons list, verify `TEST20` now shows `1 / ∞` uses. Try applying `TEST20` again on the same user account — verify the error "لقد استخدمت هذا الكوبون من قبل" appears.

- [ ] **Step 7: Run full test suite**

```bash
cd aroma-api && php artisan test
```

Expected: All tests PASS

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: complete coupon management — admin, storefront checkout and order detail"
```
