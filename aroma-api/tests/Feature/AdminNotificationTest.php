<?php
namespace Tests\Feature;

use App\Models\AdminNotification;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminNotificationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['is_admin' => true, 'admin_status' => 'active']);
    }

    private function asAdmin(): static
    {
        return $this->actingAs($this->admin, 'sanctum');
    }

    public function test_index_returns_notifications_and_unread_count(): void
    {
        AdminNotification::create(['kind' => 'order', 'title' => 'New order #A-001', 'sub' => 'Alice · 100 LYD']);
        AdminNotification::create(['kind' => 'stock', 'title' => 'Low stock: Oud', 'sub' => 'Only 3 units left', 'read_at' => now()]);

        $this->asAdmin()->getJson('/api/admin/notifications')
            ->assertOk()
            ->assertJsonPath('unreadCount', 1)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.kind', 'order')
            ->assertJsonPath('data.0.read', false);
    }

    public function test_mark_read_marks_single_notification(): void
    {
        $n = AdminNotification::create(['kind' => 'order', 'title' => 'T', 'sub' => 'S']);

        $this->asAdmin()->patchJson("/api/admin/notifications/{$n->id}/read")
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertNotNull($n->fresh()->read_at);
    }

    public function test_mark_all_read_clears_all_unread(): void
    {
        AdminNotification::create(['kind' => 'order', 'title' => 'T1', 'sub' => 'S1']);
        AdminNotification::create(['kind' => 'stock', 'title' => 'T2', 'sub' => 'S2']);

        $this->asAdmin()->patchJson('/api/admin/notifications/read-all')
            ->assertOk();

        $this->assertEquals(0, AdminNotification::whereNull('read_at')->count());
    }

    public function test_creating_order_generates_notification(): void
    {
        $user = User::factory()->create(['name' => 'Layla']);
        Order::create([
            'id'              => 'ARM-0001-0001',
            'user_id'         => $user->id,
            'status'          => 'placed',
            'total'           => 432.00,
            'is_pickup'       => true,
            'placeholder_bg'  => '#F2E8E5',
            'placeholder_dot' => '#C9A0A0',
        ]);

        $this->assertDatabaseHas('admin_notifications', [
            'kind'  => 'order',
            'title' => 'New order #ARM-0001-0001',
        ]);
    }

    public function test_variant_stock_change_to_low_stock_generates_notification(): void
    {
        $variant = ProductVariant::factory()->create(['quantity' => 50, 'low_stock_threshold' => 5]);

        // Transition from in_stock → low_stock
        $variant->update(['quantity' => 3]);

        $this->assertDatabaseHas('admin_notifications', [
            'kind' => 'stock',
        ]);
    }

    public function test_variant_stock_staying_low_does_not_duplicate(): void
    {
        // Create already-low variant (quantity 3 ≤ threshold 5 → low_stock)
        $variant = ProductVariant::factory()->create(['quantity' => 3, 'low_stock_threshold' => 5]);
        // Variant created with low_stock — observer fires on created? No, observer is on UPDATED only.
        // So 0 notifications from creation.

        // Now update quantity staying in low_stock range
        $variant->update(['quantity' => 2]);

        // Still only 0 notifications (old stock = low_stock, new stock = low_stock → no notification)
        $this->assertEquals(0, AdminNotification::where('kind', 'stock')->count());
    }

    public function test_non_admin_cannot_access_notifications(): void
    {
        $customer = User::factory()->create(['is_admin' => false]);
        $this->actingAs($customer, 'sanctum')
             ->getJson('/api/admin/notifications')
             ->assertForbidden();
    }

    public function test_unauthenticated_cannot_access_notifications(): void
    {
        $this->getJson('/api/admin/notifications')->assertUnauthorized();
    }
}
