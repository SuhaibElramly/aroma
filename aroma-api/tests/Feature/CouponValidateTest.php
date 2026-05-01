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
        \App\Models\Order::create([
            'id'              => 'ARM-0000-0000',
            'user_id'         => $this->user->id,
            'status'          => 'placed',
            'total'           => 100,
            'is_pickup'       => false,
            'placeholder_bg'  => '#ffffff',
            'placeholder_dot' => '#000000',
        ]);
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
