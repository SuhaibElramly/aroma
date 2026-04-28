<?php
namespace App\Services;

use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;

class ProductService
{
    public function search(array $filters): Builder
    {
        $query = Product::with(['brand', 'category', 'variants', 'notes', 'tags', 'images']);

        if (!empty($filters['query'])) {
            $search = strtolower($filters['query']);
            $query->where(function (Builder $q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', ["%{$search}%"])
                  ->orWhereRaw('LOWER(COALESCE(name_en, \'\')) LIKE ?', ["%{$search}%"])
                  ->orWhereHas('brand', fn($b) => $b->whereRaw('LOWER(name) LIKE ?', ["%{$search}%"])
                                                    ->orWhereRaw('LOWER(COALESCE(name_en, \'\')) LIKE ?', ["%{$search}%"]))
                  ->orWhereHas('notes', fn($n) => $n->whereRaw('LOWER(note) LIKE ?', ["%{$search}%"]))
                  ->orWhereHas('tags', fn($t) => $t->whereRaw('LOWER(tag) LIKE ?', ["%{$search}%"]));
            });
        }

        if (!empty($filters['category'])) {
            $query->where('category_id', $filters['category']);
        }

        if (!empty($filters['brand'])) {
            $query->where('brand_id', $filters['brand']);
        }

        if (!empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        if (($filters['special'] ?? null) === 'new') {
            $query->where('is_new', true);
        } elseif (($filters['special'] ?? null) === 'offer') {
            $query->where('is_offer', true);
        } elseif (($filters['special'] ?? null) === 'bestseller') {
            $query->where('is_bestseller', true);
        }

        if (!empty($filters['min_price'])) {
            $query->whereHas('variants', fn($v) => $v->where('price', '>=', $filters['min_price']));
        }

        if (!empty($filters['max_price'])) {
            $query->whereHas('variants', fn($v) => $v->where('price', '<=', $filters['max_price']));
        }

        $sort = $filters['sort'] ?? null;
        if ($sort === 'newest') {
            $query->orderBy('is_new', 'desc')->orderBy('created_at', 'desc');
        } elseif ($sort === 'price_asc') {
            $query->join('product_variants', 'products.id', '=', 'product_variants.product_id')
                  ->groupBy('products.id')
                  ->orderBy('price', 'asc');
        } elseif ($sort === 'price_desc') {
            $query->join('product_variants', 'products.id', '=', 'product_variants.product_id')
                  ->groupBy('products.id')
                  ->orderBy('price', 'desc');
        } elseif ($sort === 'rating') {
            $query->orderBy('rating', 'desc');
        }

        return $query;
    }

    public function getSimilar(int $productId, int $limit = 4): mixed
    {
        $product = Product::find($productId);
        if (!$product) return collect();

        return Product::where('id', '!=', $productId)
            ->where(function (Builder $q) use ($product) {
                $q->where('brand_id', $product->brand_id)
                  ->orWhere('category_id', $product->category_id);
            })
            ->with(['brand', 'category', 'variants', 'notes', 'tags', 'images'])
            ->limit($limit)
            ->get();
    }
}
