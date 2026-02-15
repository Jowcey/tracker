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
        Schema::create('locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('tracker_id')->constrained()->onDelete('cascade');
            $table->foreignId('vehicle_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->decimal('altitude', 8, 2)->nullable();
            $table->decimal('speed', 8, 2)->nullable(); // km/h
            $table->decimal('heading', 5, 2)->nullable(); // degrees 0-360
            $table->decimal('accuracy', 8, 2)->nullable(); // meters
            $table->integer('satellites')->nullable();
            $table->string('address')->nullable();
            $table->timestamp('recorded_at');
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['organization_id', 'tracker_id', 'recorded_at']);
            $table->index(['vehicle_id', 'recorded_at']);
            $table->index('recorded_at');
            // Note: Spatial indexes require single column in MySQL
            // For advanced geospatial queries, consider PostgreSQL with PostGIS
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('locations');
    }
};
