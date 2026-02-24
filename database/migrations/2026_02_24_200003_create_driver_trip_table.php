<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_trip', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained()->cascadeOnDelete();
            $table->foreignId('trip_id')->constrained()->cascadeOnDelete();
            $table->string('role')->default('primary');
            $table->timestamps();

            $table->unique(['driver_id', 'trip_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_trip');
    }
};
