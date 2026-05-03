<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\VariantGeneratorService;
use Illuminate\Http\Request;

class AdminProductVariantGenerateController extends Controller
{
    public function __construct(private VariantGeneratorService $generator) {}

    public function __invoke(Request $request, int $productId)
    {
        $product       = Product::findOrFail($productId);
        $existingCount = ProductVariant::where('product_id', $productId)->count();
        $force         = filter_var($request->query('force', 'false'), FILTER_VALIDATE_BOOLEAN);

        if ($existingCount > 0 && !$force) {
            return response()->json(['existing_count' => $existingCount], 409);
        }

        if ($existingCount > 0 && $force) {
            ProductVariant::where('product_id', $productId)->delete();
        }

        try {
            $variants = $this->generator->generate($product);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $specOrder = $product->specAssignments()->orderBy('sort_order')->pluck('spec_type_id')->toArray();

        return response()->json(
            collect($variants)->map(fn($v) => $this->fmt($v, $specOrder))
        );
    }

    private function fmt($variant, array $specOrder): array
    {
        $specs = $variant->specValues
            ->sortBy(fn($sv) => array_search($sv->spec_type_id, $specOrder) ?? 999)
            ->map(fn($sv) => [
                'name'  => $sv->specType->name,
                'unit'  => $sv->specType->unit,
                'value' => $sv->value,
            ])->values()->toArray();

        return [
            'id'                => $variant->id,
            'productId'         => $variant->product_id,
            'price'             => $variant->price,
            'originalPrice'     => $variant->original_price,
            'quantity'          => $variant->quantity,
            'lowStockThreshold' => $variant->low_stock_threshold,
            'stock'             => $variant->stock?->value,
            'isDefault'         => (bool) $variant->is_default,
            'specs'             => $specs,
        ];
    }
}
