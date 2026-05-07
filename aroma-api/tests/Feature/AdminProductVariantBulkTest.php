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

class AdminProductVariantBulkTest extends TestCase
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

    public function test_bulk_update_returns_updated_variants(): void
    {
        $product  = Product::factory()->create();
        $variantA = ProductVariant::factory()->create(['product_id' => $product->id, 'price' => 0, 'quantity' => 0]);
        $variantB = ProductVariant::factory()->create(['product_id' => $product->id, 'price' => 0, 'quantity' => 0]);

        $response = $this->asAdmin()->putJson("/api/admin/products/{$product->id}/variants/bulk", [
            'variants' => [
                ['id' => $variantA->id, 'price' => 89.00, 'original_price' => null,   'quantity' => 50, 'low_stock_threshold' => 5],
                ['id' => $variantB->id, 'price' => 149.00, 'original_price' => 199.00, 'quantity' => 30, 'low_stock_threshold' => 3],
            ],
        ]);

        $response->assertOk();
        $data = $response->json();
        $this->assertCount(2, $data);

        $this->assertEquals('89.00',  $data[0]['price']);
        $this->assertEquals(50,        $data[0]['quantity']);
        $this->assertNull(             $data[0]['originalPrice']);

        $this->assertEquals('149.00', $data[1]['price']);
        $this->assertEquals('199.00', $data[1]['originalPrice']);
        $this->assertEquals(3,         $data[1]['lowStockThreshold']);
    }

    public function test_bulk_update_persists_to_database(): void
    {
        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->create(['product_id' => $product->id, 'price' => 0, 'quantity' => 0]);

        $this->asAdmin()->putJson("/api/admin/products/{$product->id}/variants/bulk", [
            'variants' => [
                ['id' => $variant->id, 'price' => 75.50, 'original_price' => null, 'quantity' => 10, 'low_stock_threshold' => 2],
            ],
        ])->assertOk();

        $this->assertDatabaseHas('product_variants', [
            'id'       => $variant->id,
            'price'    => 75.50,
            'quantity' => 10,
        ]);
    }

    public function test_bulk_update_rejects_variant_from_another_product(): void
    {
        $product      = Product::factory()->create();
        $otherProduct = Product::factory()->create();
        $otherVariant = ProductVariant::factory()->create(['product_id' => $otherProduct->id]);

        $this->asAdmin()->putJson("/api/admin/products/{$product->id}/variants/bulk", [
            'variants' => [
                ['id' => $otherVariant->id, 'price' => 50, 'original_price' => null, 'quantity' => 5, 'low_stock_threshold' => 1],
            ],
        ])->assertNotFound();
    }

    public function test_bulk_update_requires_price_and_quantity(): void
    {
        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->create(['product_id' => $product->id]);

        $this->asAdmin()->putJson("/api/admin/products/{$product->id}/variants/bulk", [
            'variants' => [
                ['id' => $variant->id, 'original_price' => null],
            ],
        ])->assertUnprocessable();
    }

    public function test_bulk_update_requires_admin(): void
    {
        $user    = User::factory()->create(['is_admin' => false]);
        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->create(['product_id' => $product->id]);

        $this->actingAs($user, 'sanctum')
            ->putJson("/api/admin/products/{$product->id}/variants/bulk", [
                'variants' => [['id' => $variant->id, 'price' => 50, 'original_price' => null, 'quantity' => 5, 'low_stock_threshold' => 1]],
            ])->assertForbidden();
    }
}
