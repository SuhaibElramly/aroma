<?php
namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ProductVariant> */
class ProductVariantFactory extends Factory
{
    protected $model = ProductVariant::class;

    public function definition(): array
    {
        return [
            'product_id'          => Product::factory(),
            'price'               => fake()->randomFloat(2, 10, 500),
            'original_price'      => null,
            'quantity'            => fake()->numberBetween(0, 100),
            'low_stock_threshold' => 5,
        ];
    }
}
