<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create("maintenance_reminders", function (Blueprint $table) {
            $table->id();
            $table->foreignId("organization_id")->constrained()->onDelete("cascade");
            $table->foreignId("vehicle_id")->constrained()->onDelete("cascade");
            $table->enum("type", ["oil_change", "tyre_rotation", "service", "inspection", "custom"])->default("service");
            $table->string("description");
            $table->unsignedInteger("due_at_km")->nullable();
            $table->date("due_at_date")->nullable();
            $table->unsignedInteger("last_serviced_at_km")->nullable();
            $table->date("last_serviced_at_date")->nullable();
            $table->boolean("is_resolved")->default(false);
            $table->timestamp("resolved_at")->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(["organization_id", "vehicle_id", "is_resolved"]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists("maintenance_reminders");
    }
};
