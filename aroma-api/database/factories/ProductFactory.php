<?php
namespace Database\Factories;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Product> */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $nameEn = fake()->words(2, true);
        return [
            'name'            => fake()->words(2, true),
            'name_en'         => $nameEn,
            'slug'            => Str::slug($nameEn) . '-' . fake()->unique()->numberBetween(1, 99999),
            'brand_id'        => Brand::factory(),
            'category_id'     => Category::factory(),
            'type'            => 'EDP',
            'placeholder_bg'  => '#F2E8E5',
            'placeholder_dot' => '#C9A0A0',
        ];
    }
}
