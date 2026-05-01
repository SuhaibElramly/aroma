<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Category> */
class CategoryFactory extends Factory
{
    protected $model = Category::class;

    public function definition(): array
    {
        $label = fake()->words(2, true);
        return [
            'slug' => Str::slug($label) . '-' . fake()->unique()->numberBetween(1, 9999),
            'label' => $label,
            'bg'    => fake()->hexColor(),
        ];
    }
}
