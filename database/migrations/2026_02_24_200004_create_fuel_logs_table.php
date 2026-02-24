<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fuel_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('litres', 8, 3);
            $table->decimal('cost_per_litre', 8, 4);
            $table->decimal('odometer_km', 10, 2)->nullable();
            $table->boolean('full_tank')->default(true);
            $table->string('station')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('filled_at');
            $table->timestamps();

            $table->index(['vehicle_id', 'filled_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fuel_logs');
    }
};
