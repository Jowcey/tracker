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
        Schema::create('trackers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->string('device_id')->unique();
            $table->string('name');
            $table->string('type')->default('gps'); // gps, mobile, beacon
            $table->string('manufacturer')->nullable();
            $table->string('model')->nullable();
            $table->string('sim_number')->nullable();
            $table->string('phone_number')->nullable();
            $table->timestamp('last_communication_at')->nullable();
            $table->decimal('battery_level', 5, 2)->nullable(); // percentage
            $table->boolean('is_active')->default(true);
            $table->json('settings')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['organization_id', 'is_active']);
            $table->index('last_communication_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trackers');
    }
};
