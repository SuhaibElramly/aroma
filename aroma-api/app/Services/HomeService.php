<?php

namespace App\Services;

use App\Http\Resources\ProductResource;
use App\Models\Brand;
use App\Models\Category;
use App\Models\HomepageBlock;
use App\Models\Product;
use App\Models\Setting;

class HomeService
{
    private const DEFAULT_HERO = [
        'headline'            => 'حيث تبدأ الحكايات',
        'subtext'             => 'عطور مختارة من أرقى دور العطور في العالم — كلٌّ منها حكاية تنتظر أن تبدأ.',
        'cta_primary_label'   => 'استكشف المجموعة',
        'cta_primary_url'     => '/search',
        'cta_secondary_label' => 'تصفح الماركات',
        'cta_secondary_url'   => '/brands',
        'bg_image_path'       => null,
    ];

    public function getHero(): array
    {
        $hero   = Setting::get('homepage_hero', self::DEFAULT_HERO);
        $bgPath = $hero['bg_image_path'] ?? null;

        return array_merge($hero, [
            'bg_image_url' => $bgPath ? asset('storage/' . $bgPath) : null,
        ]);
    }

    public function getBlocks(): array
    {
        return HomepageBlock::where('enabled', true)
            ->orderBy('position')
            ->get()
            ->map(fn ($block) => [
                'id'     => $block->id,
                'type'   => $block->type,
                'config' => $block->config ?? [],
                'data'   => $this->hydrateBlock($block),
            ])
            ->all();
    }

    private function hydrateBlock(HomepageBlock $block): array
    {
        $config = $block->config ?? [];

        return match ($block->type) {
            'bestsellers'    => ['products' => $this->products(['is_bestseller' => true], $config['limit'] ?? 3)],
            'new_arrivals'   => ['products' => $this->products(['is_new' => true],         $config['limit'] ?? 4)],
            'offers'         => ['products' => $this->products(['is_offer' => true],       $config['limit'] ?? 3)],
            'categories'     => ['categories' => Category::withCount('products')->get()->toArray()],
            'featured_brand' => $this->hydrateFeaturedBrand($config),
            'curated'        => ['products' => $this->curatedProducts($config['product_ids'] ?? [])],
            default          => [],
        };
    }

    private function products(array $where, int $limit): array
    {
        $products = Product::where($where)
            ->with(['brand', 'category', 'variants.specValues.specType', 'notes', 'tags', 'images'])
            ->limit($limit)
            ->get();

        return ProductResource::collection($products)->resolve();
    }

    private function curatedProducts(array $ids): array
    {
        if (empty($ids)) return [];

        $byId = Product::whereIn('id', $ids)
            ->with(['brand', 'category', 'variants.specValues.specType', 'notes', 'tags', 'images'])
            ->get()
            ->keyBy('id');

        $ordered = collect($ids)
            ->map(fn ($id) => $byId->get($id))
            ->filter()
            ->values();

        return ProductResource::collection($ordered)->resolve();
    }

    private function hydrateFeaturedBrand(array $config): array
    {
        $brandId = $config['brand_id'] ?? null;
        $brand   = $brandId ? Brand::find($brandId) : Brand::first();

        if (!$brand) return ['brand' => null, 'products' => []];

        $products = Product::where('brand_id', $brand->id)
            ->with(['brand', 'category', 'variants.specValues.specType', 'notes', 'tags', 'images'])
            ->limit($config['product_limit'] ?? 2)
            ->get();

        return [
            'brand'    => $brand->toArray(),
            'products' => ProductResource::collection($products)->resolve(),
        ];
    }
}
