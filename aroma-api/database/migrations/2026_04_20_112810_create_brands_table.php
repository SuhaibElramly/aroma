<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('brands', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('name');
            $table->string('origin');
            $table->string('tagline');
            $table->string('bg'); // hex color
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('brands');
    }
};
