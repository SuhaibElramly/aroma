<?php

namespace Tests\Feature;

use App\Models\HomepageBlock;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminHomepageTest extends TestCase
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

    public function test_get_homepage_returns_hero_and_all_blocks(): void
    {
        Setting::set('homepage_hero', [
            'headline' => 'Hello', 'subtext' => 'Sub',
            'cta_primary_label' => 'A', 'cta_primary_url' => '/',
            'cta_secondary_label' => 'B', 'cta_secondary_url' => '/',
            'bg_image_path' => null,
        ]);

        HomepageBlock::create(['type' => 'bestsellers', 'position' => 1, 'enabled' => true,  'config' => ['limit' => 3]]);
        HomepageBlock::create(['type' => 'offers',      'position' => 2, 'enabled' => false, 'config' => ['limit' => 3]]);

        $this->asAdmin()->getJson('/api/admin/homepage')
            ->assertOk()
            ->assertJsonStructure(['hero', 'blocks'])
            ->assertJsonCount(2, 'blocks')
            ->assertJsonPath('hero.headline', 'Hello');
    }

    public function test_get_homepage_requires_auth(): void
    {
        $this->getJson('/api/admin/homepage')->assertUnauthorized();
    }

    public function test_update_hero_saves_text_fields(): void
    {
        $this->asAdmin()->putJson('/api/admin/homepage/hero', [
            'headline'            => 'New Headline',
            'subtext'             => 'New Subtext',
            'cta_primary_label'   => 'Shop Now',
            'cta_primary_url'     => '/search',
            'cta_secondary_label' => 'Brands',
            'cta_secondary_url'   => '/brands',
        ])->assertOk();

        $hero = Setting::get('homepage_hero');
        $this->assertEquals('New Headline', $hero['headline']);
        $this->assertEquals('Shop Now',     $hero['cta_primary_label']);
    }

    public function test_update_hero_stores_uploaded_image(): void
    {
        Storage::fake('public');

        $this->asAdmin()->putJson('/api/admin/homepage/hero', [
            'headline'            => 'H',
            'subtext'             => 'S',
            'cta_primary_label'   => 'A',
            'cta_primary_url'     => '/',
            'cta_secondary_label' => 'B',
            'cta_secondary_url'   => '/',
            'bg_image'            => UploadedFile::fake()->image('hero.jpg'),
        ])->assertOk();

        $hero = Setting::get('homepage_hero');
        $this->assertStringStartsWith('homepage/', $hero['bg_image_path']);
        Storage::disk('public')->assertExists($hero['bg_image_path']);
    }

    public function test_add_block_creates_record(): void
    {
        $this->asAdmin()->postJson('/api/admin/homepage/blocks', [
            'type'    => 'bestsellers',
            'config'  => ['label' => 'Top', 'title' => 'Best', 'limit' => 3],
            'enabled' => true,
        ])->assertCreated()->assertJsonStructure(['id', 'type', 'position', 'enabled', 'config']);

        $this->assertDatabaseHas('homepage_blocks', ['type' => 'bestsellers']);
    }

    public function test_update_block_changes_config(): void
    {
        $block = HomepageBlock::create(['type' => 'bestsellers', 'position' => 1, 'enabled' => true, 'config' => ['limit' => 3]]);

        $this->asAdmin()->putJson("/api/admin/homepage/blocks/{$block->id}", [
            'config'  => ['limit' => 6],
            'enabled' => false,
        ])->assertOk();

        $block->refresh();
        $this->assertEquals(6,     $block->config['limit']);
        $this->assertFalse($block->enabled);
    }

    public function test_delete_block_removes_record(): void
    {
        $block = HomepageBlock::create(['type' => 'offers', 'position' => 1, 'enabled' => true, 'config' => []]);

        $this->asAdmin()->deleteJson("/api/admin/homepage/blocks/{$block->id}")
            ->assertOk();

        $this->assertDatabaseMissing('homepage_blocks', ['id' => $block->id]);
    }

    public function test_reorder_updates_positions(): void
    {
        $a = HomepageBlock::create(['type' => 'bestsellers', 'position' => 1, 'enabled' => true, 'config' => []]);
        $b = HomepageBlock::create(['type' => 'offers',      'position' => 2, 'enabled' => true, 'config' => []]);

        $this->asAdmin()->putJson('/api/admin/homepage/blocks/reorder', [
            'order' => [
                ['id' => $a->id, 'position' => 2],
                ['id' => $b->id, 'position' => 1],
            ],
        ])->assertOk();

        $this->assertEquals(2, $a->fresh()->position);
        $this->assertEquals(1, $b->fresh()->position);
    }
}
