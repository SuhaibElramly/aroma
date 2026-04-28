<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->dropColumn(['name', 'phone', 'street', 'country']);
            $table->text('description')->nullable()->after('city');
        });
    }

    public function down(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->dropColumn('description');
            $table->string('name')->after('label')->default('');
            $table->string('phone', 20)->nullable()->after('name');
            $table->string('street')->after('city')->default('');
            $table->string('country', 100)->after('street')->default('');
        });
    }
};
