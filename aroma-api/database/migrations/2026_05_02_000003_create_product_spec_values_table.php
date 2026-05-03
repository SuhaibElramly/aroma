<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('product_spec_values', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('spec_type_id');
            $table->string('value');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('spec_type_id')->references('id')->on('spec_types')->onDelete('restrict');
        });
    }
    public function down(): void {
        Schema::dropIfExists('product_spec_values');
    }
};
