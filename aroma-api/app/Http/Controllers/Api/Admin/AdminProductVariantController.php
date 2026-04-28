<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminProductVariantController extends Controller
{
    public function index(int $productId)
    {
        $product = Product::findOrFail($productId);
        return response()->json(
            $product->variants()->orderBy('size')->get()->map(fn($v) => $this->fmt($v))
        );
    }

    public function store(Request $request, int $productId)
    {
        Product::findOrFail($productId);
        $data = $request->validate([
            'size'                => 'required|integer|min:1',
            'price'               => 'required|numeric|min:0',
            'original_price'      => 'nullable|numeric|min:0',
            'quantity'            => 'required|integer|min:0',
            'low_stock_threshold' => 'required|integer|min:0',
        ]);
        $variant = ProductVariant::create(array_merge($data, ['product_id' => $productId]));
        return response()->json($this->fmt($variant), 201);
    }

    public function update(Request $request, int $productId, int $variantId)
    {
        $variant = ProductVariant::where('product_id', $productId)->findOrFail($variantId);
        $data = $request->validate([
            'size'                => 'sometimes|integer|min:1',
            'price'               => 'sometimes|numeric|min:0',
            'original_price'      => 'nullable|numeric|min:0',
            'quantity'            => 'sometimes|integer|min:0',
            'low_stock_threshold' => 'sometimes|integer|min:0',
        ]);
        $variant->update($data);
        return response()->json($this->fmt($variant->fresh()));
    }

    public function setDefault(int $productId, int $variantId)
    {
        $variant = ProductVariant::where('product_id', $productId)->findOrFail($variantId);
        DB::transaction(function () use ($variant, $productId) {
            ProductVariant::where('product_id', $productId)->update(['is_default' => false]);
            $variant->updateQuietly(['is_default' => true]);
        });
        return response()->json($this->fmt($variant->fresh()));
    }

    public function destroy(int $productId, int $variantId)
    {
        $variant = ProductVariant::where('product_id', $productId)->findOrFail($variantId);
        $wasDefault = $variant->is_default;
        $variant->delete();

        if ($wasDefault) {
            $next = ProductVariant::where('product_id', $productId)->orderBy('id')->first();
            $next?->updateQuietly(['is_default' => true]);
        }

        return response()->json(null, 204);
    }

    private function fmt(ProductVariant $v): array
    {
        return [
            'id'                => $v->id,
            'productId'         => $v->product_id,
            'size'              => $v->size,
            'price'             => $v->price,
            'originalPrice'     => $v->original_price,
            'quantity'          => $v->quantity,
            'lowStockThreshold' => $v->low_stock_threshold,
            'stock'             => $v->stock?->value,
            'isDefault'         => (bool) $v->is_default,
        ];
    }
}
