<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminBrandTest extends TestCase
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

    public function test_index_returns_all_brands_with_no_filters(): void
    {
        Brand::factory()->count(3)->create();

        $this->asAdmin()->getJson('/api/admin/brands')
            ->assertOk()
            ->assertJsonCount(3);
    }

    public function test_filters_brands_by_arabic_name(): void
    {
        Brand::factory()->create(['name' => 'شانيل', 'id' => 'chanel', 'name_en' => 'Chanel']);
        Brand::factory()->create(['name' => 'ديور',  'id' => 'dior',   'name_en' => 'Dior']);

        $this->asAdmin()->getJson('/api/admin/brands?name=' . urlencode('شانيل'))
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', 'chanel');
    }

    public function test_filters_brands_by_english_name(): void
    {
        Brand::factory()->create(['name' => 'شانيل', 'id' => 'chanel', 'name_en' => 'Chanel']);
        Brand::factory()->create(['name' => 'ديور',  'id' => 'dior',   'name_en' => 'Dior']);

        $this->asAdmin()->getJson('/api/admin/brands?name=Chanel')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', 'chanel');
    }

    public function test_filters_brands_by_origin(): void
    {
        Brand::factory()->create(['id' => 'chanel', 'origin' => 'France']);
        Brand::factory()->create(['id' => 'gucci',  'origin' => 'Italy']);

        $this->asAdmin()->getJson('/api/admin/brands?origin=France')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', 'chanel');
    }

    public function test_filters_brands_by_tagline(): void
    {
        Brand::factory()->create(['id' => 'brand-a', 'tagline' => 'Life is Beautiful']);
        Brand::factory()->create(['id' => 'brand-b', 'tagline' => 'Just Do It']);

        $this->asAdmin()->getJson('/api/admin/brands?tagline=Beautiful')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', 'brand-a');
    }

    public function test_min_products_one_excludes_brands_with_no_products(): void
    {
        Brand::factory()->count(2)->create();

        // No products exist, so no brand has >= 1 product
        $this->asAdmin()->getJson('/api/admin/brands?min_products=1')
            ->assertOk()
            ->assertJsonCount(0);
    }

    public function test_min_products_zero_returns_all_brands(): void
    {
        Brand::factory()->count(2)->create();

        $this->asAdmin()->getJson('/api/admin/brands?min_products=0')
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_max_products_zero_returns_brands_with_no_products(): void
    {
        Brand::factory()->count(2)->create();

        // All brands have 0 products, so all satisfy <= 0
        $this->asAdmin()->getJson('/api/admin/brands?max_products=0')
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_show_returns_brand(): void
    {
        $brand = Brand::factory()->create();

        $this->asAdmin()->getJson("/api/admin/brands/{$brand->id}")
            ->assertOk()
            ->assertJsonPath('id', $brand->id)
            ->assertJsonPath('name', $brand->name)
            ->assertJsonStructure(['id', 'name', 'nameEn', 'origin', 'tagline', 'bg', 'productCount']);
    }

    public function test_show_returns_404_for_nonexistent_brand(): void
    {
        $this->asAdmin()->getJson('/api/admin/brands/nonexistent')
            ->assertNotFound();
    }
}
