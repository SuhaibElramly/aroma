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

    public function test_non_admin_cannot_access(): void
    {
        $product = Product::factory()->create();
        $user = User::factory()->create(['is_admin' => false]);
        $this->actingAs($user, 'sanctum')
            ->getJson("/api/admin/products/{$product->id}/specs")
            ->assertForbidden();
    }
}
