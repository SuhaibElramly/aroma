<?php
namespace App\Services;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;

class HomeService
{
    public function getHomeData(): array
    {
        $featuredBrandId = 'parfums-de-marly';
        $featuredBrand   = Brand::find($featuredBrandId) ?? Brand::first();

        return [
            'featuredBrand' => $featuredBrand,
            'featuredBrandProducts' => Product::where('brand_id', $featuredBrand?->id ?? $featuredBrandId)
                ->with(['brand', 'category', 'variants', 'notes', 'tags'])
                ->limit(2)->get(),
            'bestsellers' => Product::where('is_bestseller', true)
                ->with(['brand', 'category', 'variants', 'notes', 'tags'])
                ->limit(3)->get(),
            'newArrivals' => Product::where('is_new', true)
                ->with(['brand', 'category', 'variants', 'notes', 'tags'])
                ->limit(4)->get(),
            'offers' => Product::where('is_offer', true)
                ->with(['brand', 'category', 'variants', 'notes', 'tags'])
                ->limit(3)->get(),
            'categories' => Category::withCount('products')->get(),
            'brands' => Brand::withCount('products')->get(),
        ];
    }
}
