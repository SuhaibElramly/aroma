<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductSpecAssignment;
use App\Models\ProductSpecValue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminProductSpecController extends Controller
{
    public function show(int $productId)
    {
        Product::findOrFail($productId);

        $assignments = ProductSpecAssignment::with('specType')
            ->where('product_id', $productId)
            ->orderBy('sort_order')
            ->get();

        $specs = $assignments->map(function ($assignment) use ($productId) {
            $values = ProductSpecValue::where('product_id', $productId)
                ->where('spec_type_id', $assignment->spec_type_id)
                ->orderBy('sort_order')
                ->get(['id', 'value', 'sort_order']);

            return [
                'spec_type_id' => $assignment->spec_type_id,
                'name'         => $assignment->specType->name,
                'unit'         => $assignment->specType->unit,
                'sort_order'   => $assignment->sort_order,
                'values'       => $values,
            ];
        });

        return response()->json(['specs' => $specs]);
    }

    public function update(Request $request, int $productId)
    {
        Product::findOrFail($productId);

        $data = $request->validate([
            'specs'                => 'present|array',
            'specs.*.spec_type_id' => 'required|integer|exists:spec_types,id|distinct',
            'specs.*.values'       => 'required|array|min:1',
            'specs.*.values.*'     => 'required|string|max:100',
        ]);

        DB::transaction(function () use ($data, $productId) {
            ProductSpecAssignment::where('product_id', $productId)->delete();
            ProductSpecValue::where('product_id', $productId)->delete();

            foreach ($data['specs'] as $idx => $spec) {
                ProductSpecAssignment::create([
                    'product_id'   => $productId,
                    'spec_type_id' => $spec['spec_type_id'],
                    'sort_order'   => $idx,
                ]);

                foreach ($spec['values'] as $valueIdx => $value) {
                    ProductSpecValue::create([
                        'product_id'   => $productId,
                        'spec_type_id' => $spec['spec_type_id'],
                        'value'        => $value,
                        'sort_order'   => $valueIdx,
                    ]);
                }
            }
        });

        return response()->json(['ok' => true]);
    }
}
