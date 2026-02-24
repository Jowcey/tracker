<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('geofences', function (Blueprint $table) {
            $table->unsignedInteger('speed_limit_kmh')->nullable()->after('is_active');
        });
    }
    public function down(): void {
        Schema::table('geofences', function (Blueprint $table) {
            $table->dropColumn('speed_limit_kmh');
        });
    }
};
