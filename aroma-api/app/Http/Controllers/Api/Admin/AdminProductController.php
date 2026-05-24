<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['brand', 'category', 'variants', 'images'])
            ->orderBy('name');

        if ($request->filled('ids')) {
            $ids = array_filter(array_map('intval', explode(',', $request->ids)));
            if (!empty($ids)) {
                $query->whereIn('id', $ids);
            }
            // Skip all other filters when ids is present
        } else {
            if ($request->filled('search')) {
                $term = "%{$request->search}%";
                $query->where(function ($q) use ($term) {
                    $q->where('name', 'like', $term)
                      ->orWhere('name_en', 'like', $term);
                });
            }

            if ($request->filled('brand_id')) {
                $query->where('brand_id', (string) $request->brand_id);
            }

            if ($request->filled('category_id')) {
                $query->where('category_id', (int) $request->category_id);
            }

            if ($request->filled('type') && in_array($request->type, ['EDP', 'EDT', 'Parfum', 'EDC'], true)) {
                $query->where('type', $request->type);
            }

            if ($request->filled('price_min') || $request->filled('price_max')) {
                $conditions = [];
                $bindings   = [];
                if ($request->filled('price_min')) {
                    $conditions[] = 'MIN(price) >= ?';
                    $bindings[]   = (int) $request->price_min;
                }
                if ($request->filled('price_max')) {
                    $conditions[] = 'MIN(price) <= ?';
                    $bindings[]   = (int) $request->price_max;
                }
                $having = implode(' AND ', $conditions);
                // Single whereRaw keeps all bindings in the WHERE array — avoids
                // the Laravel binding-merge bug when using havingRaw inside a whereIn closure.
                $query->whereRaw(
                    "id IN (SELECT product_id FROM product_variants GROUP BY product_id HAVING {$having})",
                    $bindings
                );
            }
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
                'isNew'          => $p->is_new,
                'isBestseller'  => $p->is_bestseller,
                'isOffer'       => $p->is_offer,
                'variantCount'  => $p->variants->count(),
                'price'         => $p->variants->min('price'),
                'thumbnailUrl'  => $p->images->firstWhere('is_thumbnail', true)?->url
                                ?? $p->images->first()?->url,
                'placeholderBg'  => $p->placeholder_bg,
                'placeholderDot' => $p->placeholder_dot,
            ]),
            'meta' => [
                'total'       => $products->total(),
                'currentPage' => $products->currentPage(),
                'lastPage'    => $products->lastPage(),
            ],
        ]);
    }

    public function show(int $id)
    {
        $product = Product::with(['brand', 'category', 'variants', 'images'])->findOrFail($id);

        $salesData = DB::table('order_items as oi')
            ->join('orders as o', 'oi.order_id', '=', 'o.id')
            ->join('product_variants as pv', 'oi.product_variant_id', '=', 'pv.id')
            ->where('pv.product_id', $id)
            ->where('o.status', 'delivered')
            ->selectRaw('SUM(oi.qty) as units_sold, SUM(oi.unit_price * oi.qty) as revenue')
            ->first();

        return response()->json([
            'id'             => $product->id,
            'slug'           => $product->slug,
            'name'           => $product->name,
            'nameEn'         => $product->name_en,
            'name_en'        => $product->name_en,
            'brand'          => $product->brand?->name,
            'brandId'        => $product->brand_id,
            'category'       => $product->category?->label,
            'categoryId'     => $product->category_id,
            'type'           => $product->type?->value,
            'description'    => $product->description,
            'isNew'          => $product->is_new,
            'isBestseller'   => $product->is_bestseller,
            'isOffer'        => $product->is_offer,
            'placeholderBg'  => $product->placeholder_bg,
            'placeholderDot' => $product->placeholder_dot,
            'is_active'      => true,
            'revenue'        => $salesData->revenue ? round((float) $salesData->revenue / 1000, 1) : null,
            'sales_count'    => (int) ($salesData->units_sold ?? 0),
            'images'         => $product->images->map(fn($img) => [
                'id'           => $img->id,
                'url'          => $img->url,
                'isThumbnail'  => $img->is_thumbnail,
                'sortOrder'    => $img->sort_order,
                'originalName' => $img->original_name,
            ])->values(),
            'thumbnailUrl'   => $product->images->firstWhere('is_thumbnail', true)?->url
                              ?? $product->images->first()?->url,
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
