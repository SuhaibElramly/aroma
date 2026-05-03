<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductSpecAssignment;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminProductVariantController extends Controller
{
    public function index(int $productId)
    {
        $product   = Product::findOrFail($productId);
        $specOrder = $this->getSpecOrder($productId);

        return response()->json(
            $product->variants()
                ->with('specValues.specType')
                ->orderBy('id')
                ->get()
                ->map(fn($v) => $this->fmt($v, $specOrder))
        );
    }

    public function update(Request $request, int $productId, int $variantId)
    {
        $variant = ProductVariant::where('product_id', $productId)->findOrFail($variantId);
        $data = $request->validate([
            'price'               => 'sometimes|numeric|min:0',
            'original_price'      => 'nullable|numeric|min:0',
            'quantity'            => 'sometimes|integer|min:0',
            'low_stock_threshold' => 'sometimes|integer|min:0',
        ]);
        $variant->update($data);
        $specOrder = $this->getSpecOrder($productId);
        return response()->json($this->fmt($variant->fresh()->load('specValues.specType'), $specOrder));
    }

    public function setDefault(int $productId, int $variantId)
    {
        $variant = ProductVariant::where('product_id', $productId)->findOrFail($variantId);
        DB::transaction(function () use ($variant, $productId) {
            ProductVariant::where('product_id', $productId)->update(['is_default' => false]);
            $variant->updateQuietly(['is_default' => true]);
        });
        $specOrder = $this->getSpecOrder($productId);
        return response()->json($this->fmt($variant->fresh()->load('specValues.specType'), $specOrder));
    }

    public function destroy(int $productId, int $variantId)
    {
        $variant    = ProductVariant::where('product_id', $productId)->findOrFail($variantId);
        $wasDefault = $variant->is_default;
        $variant->delete();

        if ($wasDefault) {
            $next = ProductVariant::where('product_id', $productId)->orderBy('id')->first();
            $next?->updateQuietly(['is_default' => true]);
        }

        return response()->json(null, 204);
    }

    private function getSpecOrder(int $productId): array
    {
        return ProductSpecAssignment::where('product_id', $productId)
            ->orderBy('sort_order')
            ->pluck('spec_type_id')
            ->toArray();
    }

    private function fmt(ProductVariant $v, array $specOrder): array
    {
        if (!$v->relationLoaded('specValues')) {
            $v->load('specValues.specType');
        }

        $specs = $v->specValues
            ->sortBy(fn($sv) => array_search($sv->spec_type_id, $specOrder) !== false
                ? array_search($sv->spec_type_id, $specOrder)
                : 999
            )
            ->map(fn($sv) => [
                'name'  => $sv->specType->name,
                'unit'  => $sv->specType->unit,
                'value' => $sv->value,
            ])->values()->toArray();

        return [
            'id'                => $v->id,
            'productId'         => $v->product_id,
            'price'             => $v->price,
            'originalPrice'     => $v->original_price,
            'quantity'          => $v->quantity,
            'lowStockThreshold' => $v->low_stock_threshold,
            'stock'             => $v->stock?->value,
            'isDefault'         => (bool) $v->is_default,
            'specs'             => $specs,
        ];
    }
}
