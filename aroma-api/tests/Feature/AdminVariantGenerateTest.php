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
