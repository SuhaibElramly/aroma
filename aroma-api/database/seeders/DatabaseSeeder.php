<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed admin user
        $this->call(AdminUserSeeder::class);

        // Seed brands first
        $this->call(BrandSeeder::class);

        // Seed categories
        $this->call(CategorySeeder::class);

        // Seed products with variants, notes, and tags
        $this->call(ProductSeeder::class);

        // Seed test user (only if not already exists)
        if (!User::where('email', 'test@example.com')->exists()) {
            User::factory()->create([
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);
        }

        // Seed homepage blocks and hero config
        $this->call(HomepageBlockSeeder::class);
    }
}
