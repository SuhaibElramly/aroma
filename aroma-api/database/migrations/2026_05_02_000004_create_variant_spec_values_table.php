<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('variant_spec_values', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('variant_id');
            $table->unsignedBigInteger('spec_type_id');
            $table->string('value');
            $table->timestamps();
            $table->unique(['variant_id', 'spec_type_id']);
            $table->foreign('variant_id')->references('id')->on('product_variants')->onDelete('cascade');
            $table->foreign('spec_type_id')->references('id')->on('spec_types')->onDelete('restrict');
        });
    }
    public function down(): void {
        Schema::dropIfExists('variant_spec_values');
    }
};
