<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class AdminProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['brand', 'category', 'variants', 'images'])
            ->orderBy('name');

        if ($request->filled('search')) {
            $term = "%{$request->search}%";
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                  ->orWhere('name_en', 'like', $term);
            });
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->brand_id);
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', (int) $request->category_id);
        }

        if ($request->filled('type') && in_array($request->type, ['EDP', 'EDT', 'Parfum', 'EDC'], true)) {
            $query->where('type', $request->type);
        }

        if ($request->filled('price_min')) {
            $query->whereRaw(
                '(SELECT MIN(price) FROM product_variants WHERE product_id = products.id) >= ?',
                [(float) $request->price_min]
            );
        }

        if ($request->filled('price_max')) {
            $query->whereRaw(
                '(SELECT MIN(price) FROM product_variants WHERE product_id = products.id) <= ?',
                [(float) $request->price_max]
            );
        }

        $products = $query->paginate(20);

        return response()->json([
            'data' => $products->map(fn($p) => [
                'id'           => $p->id,
                'slug'         => $p->slug,
                'name'         => $p->name,
                'nameEn'       => $p->name_en,
                'brand'        => $p->brand?->name,
                'brandId'      => $p->brand_id,
                'category'     => $p->category?->label,
                'categoryId'   => $p->category_id,
                'type'         => $p->type?->value,
                'isNew'        => $p->is_new,
                'isBestseller' => $p->is_bestseller,
                'isOffer'      => $p->is_offer,
                'variantCount' => $p->variants->count(),
                'price'        => $p->variants->min('price'),
                'thumbnailUrl' => $p->images->firstWhere('is_thumbnail', true)?->url
                               ?? $p->images->first()?->url,
            ]),
            'meta' => [
                'total'       => $products->total(),
                'currentPage' => $products->currentPage(),
                'lastPage'    => $products->lastPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'slug' => 'required|string|unique:products,slug',
            'name' => 'required|string',
            'name_en' => 'nullable|string',
            'brand_id' => 'required|string|exists:brands,id',
            'category_id' => 'required|integer|exists:categories,id',
            'type' => 'required|in:EDP,EDT,Parfum,EDC',
            'description' => 'nullable|string',
            'is_new' => 'boolean',
            'is_bestseller' => 'boolean',
            'is_offer' => 'boolean',
            'placeholder_bg' => 'required|string',
            'placeholder_dot' => 'required|string',
        ]);
        $product = Product::create($data);
        return response()->json(['id' => $product->id], 201);
    }

    public function update(Request $request, int $id)
    {
        $product = Product::findOrFail($id);
        $data = $request->validate([
            'slug' => "sometimes|string|unique:products,slug,{$id}",
            'name' => 'sometimes|string',
            'name_en' => 'nullable|string',
            'brand_id' => 'sometimes|string|exists:brands,id',
            'category_id' => 'sometimes|integer|exists:categories,id',
            'type' => 'sometimes|in:EDP,EDT,Parfum,EDC',
            'description' => 'nullable|string',
            'is_new' => 'boolean',
            'is_bestseller' => 'boolean',
            'is_offer' => 'boolean',
            'placeholder_bg' => 'sometimes|string',
            'placeholder_dot' => 'sometimes|string',
        ]);
        $product->update($data);
        return response()->json(['id' => $product->id]);
    }

    public function destroy(int $id)
    {
        Product::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
