<?php

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Order;
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
        // Need a real order for the FK
        $order = Order::create([
            'id' => 'ARM-0000-0001',
            'user_id' => $this->admin->id,
            'status' => 'placed',
            'total' => 50,
            'is_pickup' => true,
            'placeholder_bg' => '#F2E8E5',
            'placeholder_dot' => '#C9A0A0',
        ]);
        CouponUsage::create(['coupon_id' => $coupon->id, 'user_id' => $this->admin->id, 'order_id' => $order->id]);

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
