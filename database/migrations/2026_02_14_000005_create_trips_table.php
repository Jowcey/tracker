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
        Schema::create('trips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('vehicle_id')->constrained()->onDelete('cascade');
            $table->foreignId('tracker_id')->constrained()->onDelete('cascade');
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->decimal('start_latitude', 10, 8);
            $table->decimal('start_longitude', 11, 8);
            $table->string('start_address')->nullable();
            $table->decimal('end_latitude', 10, 8)->nullable();
            $table->decimal('end_longitude', 11, 8)->nullable();
            $table->string('end_address')->nullable();
            $table->decimal('distance', 10, 2)->nullable(); // kilometers
            $table->integer('duration')->nullable(); // seconds
            $table->integer('idle_duration')->nullable(); // seconds
            $table->decimal('max_speed', 8, 2)->nullable(); // km/h
            $table->decimal('average_speed', 8, 2)->nullable(); // km/h
            $table->integer('stops_count')->default(0);
            $table->json('route_coordinates')->nullable();
            $table->json('stops')->nullable(); // array of stop details
            $table->timestamps();
            
            $table->index(['organization_id', 'vehicle_id', 'started_at']);
            $table->index(['vehicle_id', 'started_at']);
            $table->index('started_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trips');
    }
};
