<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create("vehicle_trackers", function (Blueprint $table) {
            $table->id();
            $table->foreignId("vehicle_id")->constrained()->onDelete("cascade");
            $table->foreignId("tracker_id")->constrained()->onDelete("cascade");
            $table->enum("role", ["primary", "secondary"])->default("primary");
            $table->timestamp("assigned_at")->useCurrent();
            $table->timestamps();
            $table->unique(["vehicle_id", "tracker_id"]);
            $table->index("vehicle_id");
        });
    }

    public function down(): void
    {
        Schema::dropIfExists("vehicle_trackers");
    }
};
