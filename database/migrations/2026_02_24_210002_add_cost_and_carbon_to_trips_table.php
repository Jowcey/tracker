<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('trips', function (Blueprint $table) {
            $table->decimal('cost_km', 10, 4)->nullable()->after('driver_score');
            $table->decimal('co2_kg', 8, 3)->nullable()->after('cost_km');
        });
    }
    public function down(): void {
        Schema::table('trips', function (Blueprint $table) {
            $table->dropColumn(['cost_km', 'co2_kg']);
        });
    }
};
