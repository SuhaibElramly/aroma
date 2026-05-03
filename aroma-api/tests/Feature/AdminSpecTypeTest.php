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

    public function test_store_rejects_duplicate_name(): void
    {
        SpecType::factory()->create(['name' => 'Size']);

        $this->asAdmin()->postJson('/api/admin/spec-types', ['name' => 'Size', 'unit' => 'ml'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }

    public function test_update_rejects_name_taken_by_another_spec(): void
    {
        SpecType::factory()->create(['name' => 'Size']);
        $color = SpecType::factory()->create(['name' => 'Color']);

        // Trying to rename Color to Size (already taken) — should fail
        $this->asAdmin()->putJson("/api/admin/spec-types/{$color->id}", ['name' => 'Size'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        // Updating Color with its own name — should succeed (unique-except-self)
        $this->asAdmin()->putJson("/api/admin/spec-types/{$color->id}", ['name' => 'Color'])
            ->assertOk();
    }
}
