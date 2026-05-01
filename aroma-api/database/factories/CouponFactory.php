<?php

namespace Database\Factories;

use App\Models\Coupon;
use Illuminate\Database\Eloquent\Factories\Factory;

class CouponFactory extends Factory
{
    protected $model = Coupon::class;

    public function definition(): array
    {
        return [
            'code'             => strtoupper(fake()->unique()->lexify('????')),
            'type'             => fake()->randomElement(['percentage', 'fixed']),
            'value'            => fake()->randomFloat(2, 1, 50),
            'min_order_amount' => null,
            'max_uses'         => null,
            'uses_count'       => 0,
            'expires_at'       => null,
            'is_active'        => true,
        ];
    }

    public function percentage(float $value = 20): static
    {
        return $this->state(['type' => 'percentage', 'value' => $value]);
    }

    public function fixed(float $value = 5): static
    {
        return $this->state(['type' => 'fixed', 'value' => $value]);
    }

    public function expired(): static
    {
        return $this->state(['expires_at' => now()->subDay()]);
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }

    public function withMinOrder(float $amount): static
    {
        return $this->state(['min_order_amount' => $amount]);
    }

    public function maxedOut(): static
    {
        return $this->state(fn($attrs) => ['max_uses' => 1, 'uses_count' => 1]);
    }
}
