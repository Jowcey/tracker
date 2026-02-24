<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table("trips", function (Blueprint $table) {
            $table->enum("label", ["business", "personal", "commute"])->nullable()->after("stops");
            $table->text("notes")->nullable()->after("label");
            $table->unsignedSmallInteger("harsh_braking_count")->default(0)->after("notes");
            $table->unsignedSmallInteger("harsh_accel_count")->default(0)->after("harsh_braking_count");
            $table->unsignedInteger("speeding_duration")->default(0)->after("harsh_accel_count");
            $table->unsignedTinyInteger("driver_score")->nullable()->after("speeding_duration");
        });
    }

    public function down(): void
    {
        Schema::table("trips", function (Blueprint $table) {
            $table->dropColumn(["label", "notes", "harsh_braking_count", "harsh_accel_count", "speeding_duration", "driver_score"]);
        });
    }
};
