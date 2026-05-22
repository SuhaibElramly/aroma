<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60);
            $table->string('slug', 80)->unique();
            $table->string('color', 100);
            $table->json('permissions');
            $table->timestamps();
        });

        DB::table('roles')->insertOrIgnore([
            [
                'name'        => 'Owner',
                'slug'        => 'owner',
                'color'       => 'oklch(26% 0.04 250)',
                'permissions' => json_encode(['products'=>[1,1,1],'orders'=>[1,1,1],'coupons'=>[1,1,1],'customers'=>[1,1,1],'brands'=>[1,1,1],'specs'=>[1,1,1],'admins'=>[1,1,1]]),
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'name'        => 'Admin',
                'slug'        => 'admin',
                'color'       => 'oklch(46% 0.075 210)',
                'permissions' => json_encode(['products'=>[1,1,1],'orders'=>[1,1,1],'coupons'=>[1,1,1],'customers'=>[1,1,0],'brands'=>[1,1,1],'specs'=>[1,1,1],'admins'=>[1,0,0]]),
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'name'        => 'Catalog Manager',
                'slug'        => 'catalog_manager',
                'color'       => 'oklch(56% 0.10 340)',
                'permissions' => json_encode(['products'=>[1,1,1],'orders'=>[1,0,0],'coupons'=>[1,1,0],'customers'=>[1,0,0],'brands'=>[1,1,1],'specs'=>[1,1,1],'admins'=>[0,0,0]]),
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'name'        => 'Sales',
                'slug'        => 'sales',
                'color'       => 'oklch(58% 0.10 32)',
                'permissions' => json_encode(['products'=>[1,0,0],'orders'=>[1,1,0],'coupons'=>[1,0,0],'customers'=>[1,1,0],'brands'=>[1,0,0],'specs'=>[1,0,0],'admins'=>[0,0,0]]),
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'name'        => 'Support',
                'slug'        => 'support',
                'color'       => 'oklch(52% 0.045 145)',
                'permissions' => json_encode(['products'=>[1,0,0],'orders'=>[1,1,0],'coupons'=>[1,0,0],'customers'=>[1,1,0],'brands'=>[1,0,0],'specs'=>[1,0,0],'admins'=>[0,0,0]]),
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'name'        => 'Read Only',
                'slug'        => 'read_only',
                'color'       => 'oklch(56% 0.035 240)',
                'permissions' => json_encode(['products'=>[1,0,0],'orders'=>[1,0,0],'coupons'=>[1,0,0],'customers'=>[1,0,0],'brands'=>[1,0,0],'specs'=>[1,0,0],'admins'=>[0,0,0]]),
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
