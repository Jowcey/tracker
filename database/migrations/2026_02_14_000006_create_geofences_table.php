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
        Schema::create('geofences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('type', ['circle', 'polygon'])->default('circle');
            $table->decimal('center_latitude', 10, 8)->nullable(); // for circle
            $table->decimal('center_longitude', 11, 8)->nullable(); // for circle
            $table->integer('radius')->nullable(); // meters, for circle
            $table->json('coordinates')->nullable(); // for polygon
            $table->string('color')->default('#3b82f6');
            $table->boolean('is_active')->default(true);
            $table->json('settings')->nullable(); // notification settings, etc
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['organization_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('geofences');
    }
};
