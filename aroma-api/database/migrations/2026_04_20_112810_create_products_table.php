<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('brand_id', 36);
            $table->string('category_id', 36);
            $table->string('name');
            $table->text('description');
            $table->string('type'); // EDP, EDT, Parfum, EDC
            $table->decimal('rating', 3, 2)->default(0);
            $table->integer('reviews_count')->default(0);
            $table->boolean('is_new')->default(false);
            $table->boolean('is_bestseller')->default(false);
            $table->boolean('is_offer')->default(false);
            $table->string('placeholder_bg'); // hex color
            $table->string('placeholder_dot'); // hex color
            $table->timestamps();

            $table->index('brand_id');
            $table->index('category_id');
            $table->foreign('brand_id')->references('id')->on('brands')->onDelete('cascade');
            $table->foreign('category_id')->references('id')->on('categories')->onDelete('cascade');
        });
    }

    public function down(): void {
        Schema::dropIfExists('products');
    }
};
