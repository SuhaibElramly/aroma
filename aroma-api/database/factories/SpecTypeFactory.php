<?php
namespace Database\Factories;

use App\Models\SpecType;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<SpecType> */
class SpecTypeFactory extends Factory
{
    protected $model = SpecType::class;

    public function definition(): array
    {
        return [
            'name' => fake()->unique()->word(),
            'unit' => null,
        ];
    }
}
