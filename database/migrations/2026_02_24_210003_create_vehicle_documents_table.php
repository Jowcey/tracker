<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('vehicle_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
            $table->string('type')->default('other');
            $table->string('title');
            $table->date('issued_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->string('file_url')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'expiry_date']);
            $table->index(['vehicle_id', 'expiry_date']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('vehicle_documents');
    }
};
