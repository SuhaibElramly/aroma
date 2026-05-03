<?php
namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\VariantSpecValue;
use Illuminate\Support\Facades\DB;

class VariantGeneratorService
{
    public function generate(Product $product): array
    {
        $assignments = $product->specAssignments()
            ->orderBy('sort_order')
            ->get();

        // Build value sets per spec, in assignment order
        $sets = [];
        foreach ($assignments as $assignment) {
            $values = $product->specValues()
                ->where('spec_type_id', $assignment->spec_type_id)
                ->orderBy('sort_order')
                ->pluck('value')
                ->toArray();

            if (empty($values)) {
                throw new \InvalidArgumentException(
                    'All assigned specs must have at least one value before generating.'
                );
            }

            $sets[] = [
                'spec_type_id' => $assignment->spec_type_id,
                'values'       => $values,
            ];
        }

        // Compute cartesian product of values
        $valueSets    = array_column($sets, 'values');
        $specTypeIds  = array_column($sets, 'spec_type_id');
        $combinations = $this->cartesian($valueSets);

        $variants = [];
        DB::transaction(function () use ($product, $combinations, $specTypeIds, &$variants) {
            foreach ($combinations as $combo) {
                $variant = ProductVariant::create([
                    'product_id' => $product->id,
                    'price'      => 0,
                    'quantity'   => 0,
                    'low_stock_threshold' => 5,
                ]);

                foreach ($combo as $idx => $value) {
                    VariantSpecValue::create([
                        'variant_id'  => $variant->id,
                        'spec_type_id' => $specTypeIds[$idx],
                        'value'        => $value,
                    ]);
                }

                $variants[] = $variant->load('specValues.specType');
            }
        });

        return $variants;
    }

    // Returns [[]] for empty input (one combination with no specs — for spec-less products)
    private function cartesian(array $sets): array
    {
        $result = [[]];
        foreach ($sets as $set) {
            $append = [];
            foreach ($result as $existing) {
                foreach ($set as $item) {
                    $append[] = array_merge($existing, [$item]);
                }
            }
            $result = $append;
        }
        return $result;
    }
}
