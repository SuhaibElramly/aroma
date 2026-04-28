<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->boolean('is_default')->default(false)->after('low_stock_threshold');
        });

        // Auto-promote the smallest variant of each product
        DB::statement("
            UPDATE product_variants
            SET is_default = 1
            WHERE id IN (
                SELECT MIN(id) FROM product_variants
                GROUP BY product_id
            )
        ");
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn('is_default');
        });
    }
};
