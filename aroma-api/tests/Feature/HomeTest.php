<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\HomepageBlock;
use App\Models\Product;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HomeTest extends TestCase
{
    use RefreshDatabase;

    private function heroDefaults(): array
    {
        return [
            'headline'            => 'Test Headline',
            'subtext'             => 'Test Subtext',
            'cta_primary_label'   => 'Shop',
            'cta_primary_url'     => '/search',
            'cta_secondary_label' => 'Brands',
            'cta_secondary_url'   => '/brands',
            'bg_image_path'       => null,
        ];
    }

    public function test_home_returns_hero_and_blocks(): void
    {
        Setting::set('homepage_hero', $this->heroDefaults());

        HomepageBlock::create([
            'type'     => 'bestsellers',
            'position' => 1,
            'enabled'  => true,
            'config'   => ['label' => 'Best', 'title' => 'Bestsellers', 'limit' => 2],
        ]);

        Product::factory()->count(2)->create(['is_bestseller' => true]);

        $response = $this->getJson('/api/home');

        $response->assertOk()
            ->assertJsonStructure([
                'hero' => ['headline', 'subtext', 'cta_primary_label', 'cta_primary_url',
                           'cta_secondary_label', 'cta_secondary_url', 'bg_image_url'],
                'blocks' => [['id', 'type', 'config', 'data']],
            ])
            ->assertJsonPath('hero.headline', 'Test Headline')
            ->assertJsonPath('blocks.0.type', 'bestsellers')
            ->assertJsonCount(2, 'blocks.0.data.products');
    }

    public function test_home_excludes_disabled_blocks(): void
    {
        Setting::set('homepage_hero', $this->heroDefaults());

        HomepageBlock::create([
            'type'     => 'bestsellers',
            'position' => 1,
            'enabled'  => false,
            'config'   => ['limit' => 3],
        ]);

        $this->getJson('/api/home')
            ->assertOk()
            ->assertJsonCount(0, 'blocks');
    }

    public function test_home_orders_blocks_by_position(): void
    {
        Setting::set('homepage_hero', $this->heroDefaults());

        HomepageBlock::create(['type' => 'offers',      'position' => 2, 'enabled' => true, 'config' => ['limit' => 1]]);
        HomepageBlock::create(['type' => 'bestsellers', 'position' => 1, 'enabled' => true, 'config' => ['limit' => 1]]);

        $this->getJson('/api/home')
            ->assertOk()
            ->assertJsonPath('blocks.0.type', 'bestsellers')
            ->assertJsonPath('blocks.1.type', 'offers');
    }

    public function test_home_returns_default_hero_when_no_setting_exists(): void
    {
        $this->getJson('/api/home')
            ->assertOk()
            ->assertJsonStructure(['hero' => ['headline', 'subtext', 'bg_image_url']])
            ->assertJsonPath('blocks', []);
    }
}
