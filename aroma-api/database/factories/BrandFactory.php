<?php

namespace Database\Factories;

use App\Models\Brand;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Brand> */
class BrandFactory extends Factory
{
    protected $model = Brand::class;

    public function definition(): array
    {
        $nameEn = fake()->words(2, true);
        return [
            'id'      => Str::slug($nameEn) . '-' . fake()->unique()->numberBetween(1, 9999),
            'name'    => fake()->words(2, true),
            'name_en' => $nameEn,
            'origin'  => fake()->country(),
            'tagline' => fake()->sentence(4),
            'bg'      => fake()->hexColor(),
        ];
    }
}
