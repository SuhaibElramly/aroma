<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminCategoryTest extends TestCase
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

    public function test_index_returns_all_categories_with_no_filters(): void
    {
        Category::factory()->count(3)->create();

        $this->asAdmin()->getJson('/api/admin/categories')
            ->assertOk()
            ->assertJsonCount(3);
    }

    public function test_filters_categories_by_label(): void
    {
        Category::factory()->create(['label' => 'Women', 'slug' => 'women']);
        Category::factory()->create(['label' => 'Men',   'slug' => 'men']);

        $this->asAdmin()->getJson('/api/admin/categories?label=Wom')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.slug', 'women');
    }

    public function test_min_products_one_excludes_categories_with_no_products(): void
    {
        Category::factory()->count(2)->create();

        $this->asAdmin()->getJson('/api/admin/categories?min_products=1')
            ->assertOk()
            ->assertJsonCount(0);
    }

    public function test_min_products_zero_returns_all_categories(): void
    {
        Category::factory()->count(2)->create();

        $this->asAdmin()->getJson('/api/admin/categories?min_products=0')
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_max_products_zero_returns_categories_with_no_products(): void
    {
        Category::factory()->count(2)->create();

        $this->asAdmin()->getJson('/api/admin/categories?max_products=0')
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_store_auto_generates_slug_from_label(): void
    {
        $this->asAdmin()->postJson('/api/admin/categories', [
            'label' => 'Body Care',
            'bg'    => '#F4EFE8',
        ])->assertCreated();

        $this->assertDatabaseHas('categories', ['slug' => 'body-care']);
    }

    public function test_store_appends_suffix_when_slug_already_exists(): void
    {
        Category::factory()->create(['slug' => 'body-care', 'label' => 'Body Care']);

        $this->asAdmin()->postJson('/api/admin/categories', [
            'label' => 'Body Care',
            'bg'    => '#FFFFFF',
        ])->assertCreated();

        $this->assertDatabaseHas('categories', ['slug' => 'body-care-2']);
    }

    public function test_store_requires_label(): void
    {
        $this->asAdmin()->postJson('/api/admin/categories', ['bg' => '#F4EFE8'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['label']);
    }

    public function test_store_requires_bg(): void
    {
        $this->asAdmin()->postJson('/api/admin/categories', ['label' => 'Test'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['bg']);
    }
}
