<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create("geofence_events", function (Blueprint $table) {
            $table->id();
            $table->foreignId("organization_id")->constrained()->onDelete("cascade");
            $table->foreignId("geofence_id")->constrained()->onDelete("cascade");
            $table->foreignId("vehicle_id")->constrained()->onDelete("cascade");
            $table->foreignId("tracker_id")->constrained()->onDelete("cascade");
            $table->enum("type", ["enter", "exit"]);
            $table->decimal("latitude", 10, 8);
            $table->decimal("longitude", 11, 8);
            $table->timestamp("recorded_at");
            $table->timestamps();
            $table->index(["organization_id", "vehicle_id", "recorded_at"]);
            $table->index(["geofence_id", "recorded_at"]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists("geofence_events");
    }
};
