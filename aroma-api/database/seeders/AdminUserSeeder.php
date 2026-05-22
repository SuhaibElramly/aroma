<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // WARNING: Set ADMIN_PASSWORD env var before seeding in production
        User::updateOrCreate(
            ['email' => 'admin@aroma.ly'],
            [
                'name'         => 'Admin',
                'phone'        => '0910000000',
                'password'     => Hash::make(env('ADMIN_PASSWORD', 'password')),
                'is_admin'     => true,
                'role'         => 'owner',
                'admin_status' => 'active',
            ]
        );
    }
}
