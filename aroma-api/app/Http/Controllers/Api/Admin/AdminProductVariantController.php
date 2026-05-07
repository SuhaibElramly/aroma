<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductSpecAssignment;
use App\Models\ProductVariant;
use App\Models\VariantSpecValue;
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

    public function store(Request $request, int $productId)
    {
        Product::findOrFail($productId);
        $data = $request->validate([
            'price'                => 'required|numeric|min:0',
            'original_price'       => 'nullable|numeric|min:0',
            'quantity'             => 'required|integer|min:0',
            'low_stock_threshold'  => 'sometimes|integer|min:0',
            'specs'                => 'present|array',
            'specs.*.spec_type_id' => 'required|integer|exists:spec_types,id',
            'specs.*.value'        => 'required|string|max:100',
        ]);

        $variant = DB::transaction(function () use ($data, $productId) {
            $variant = ProductVariant::create([
                'product_id'          => $productId,
                'price'               => $data['price'],
                'original_price'      => $data['original_price'] ?? null,
                'quantity'            => $data['quantity'],
                'low_stock_threshold' => $data['low_stock_threshold'] ?? 5,
            ]);
            foreach ($data['specs'] as $spec) {
                VariantSpecValue::create([
                    'variant_id'   => $variant->id,
                    'spec_type_id' => $spec['spec_type_id'],
                    'value'        => $spec['value'],
                ]);
            }
            return $variant;
        });

        $specOrder = $this->getSpecOrder($productId);
        return response()->json(
            $this->fmt($variant->fresh()->load('specValues.specType'), $specOrder),
            201
        );
    }

    public function update(Request $request, int $productId, int $variantId)
    {
        $variant = ProductVariant::where('product_id', $productId)->findOrFail($variantId);
        $data = $request->validate([
            'price'                => 'sometimes|numeric|min:0',
            'original_price'       => 'nullable|numeric|min:0',
            'quantity'             => 'sometimes|integer|min:0',
            'low_stock_threshold'  => 'sometimes|integer|min:0',
            'specs'                => 'sometimes|array',
            'specs.*.spec_type_id' => 'required_with:specs|integer|exists:spec_types,id',
            'specs.*.value'        => 'required_with:specs|string|max:100',
        ]);

        DB::transaction(function () use ($data, $variant) {
            $variant->update(collect($data)->except('specs')->toArray());
            if (array_key_exists('specs', $data)) {
                $variant->specValues()->delete();
                foreach ($data['specs'] as $spec) {
                    VariantSpecValue::create([
                        'variant_id'   => $variant->id,
                        'spec_type_id' => $spec['spec_type_id'],
                        'value'        => $spec['value'],
                    ]);
                }
            }
        });

        $specOrder = $this->getSpecOrder($productId);
        return response()->json($this->fmt($variant->fresh()->load('specValues.specType'), $specOrder));
    }

    public function bulkUpdate(Request $request, int $productId)
    {
        Product::findOrFail($productId);

        $data = $request->validate([
            'variants'                       => 'required|array|min:1',
            'variants.*.id'                  => [
                'required', 'integer',
                \Illuminate\Validation\Rule::exists('product_variants', 'id')
                    ->where('product_id', $productId),
            ],
            'variants.*.price'               => 'required|numeric|min:0',
            'variants.*.original_price'      => 'nullable|numeric|min:0',
            'variants.*.quantity'            => 'required|integer|min:0',
            'variants.*.low_stock_threshold' => 'sometimes|integer|min:0',
        ]);

        $ids = collect($data['variants'])->pluck('id')->all();

        $variantMap = ProductVariant::where('product_id', $productId)
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        DB::transaction(function () use ($data, $variantMap) {
            foreach ($data['variants'] as $item) {
                $variantMap[$item['id']]->update([
                    'price'               => $item['price'],
                    'original_price'      => $item['original_price'] ?? null,
                    'quantity'            => $item['quantity'],
                    'low_stock_threshold' => $item['low_stock_threshold'] ?? $variantMap[$item['id']]->low_stock_threshold,
                ]);
            }
        });

        $specOrder = $this->getSpecOrder($productId);

        $updated = ProductVariant::where('product_id', $productId)
            ->whereIn('id', $ids)
            ->with('specValues.specType')
            ->get()
            ->map(fn($v) => $this->fmt($v, $specOrder))
            ->values()
            ->toArray();

        return response()->json($updated);
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
