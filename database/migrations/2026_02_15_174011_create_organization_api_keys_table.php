<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organization_api_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('key_hash')->unique();
            $table->string('prefix', 20);
            $table->timestamp('last_used_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
            
            $table->index(['organization_id', 'revoked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_api_keys');
    }
};
