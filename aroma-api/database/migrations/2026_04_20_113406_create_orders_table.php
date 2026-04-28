<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->string('id', 20)->primary(); // ARM-xxxx-xxxx format
            $table->unsignedBigInteger('user_id');
            $table->string('status'); // placed, confirmed, preparing, ready, delivered, cancelled
            $table->decimal('total', 10, 2);
            $table->text('note')->nullable();
            $table->text('admin_note')->nullable();
            $table->boolean('is_pickup')->default(false);
            $table->string('placeholder_bg'); // hex color
            $table->string('placeholder_dot'); // hex color
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
