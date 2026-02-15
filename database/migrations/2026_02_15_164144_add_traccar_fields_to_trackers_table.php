<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table("trackers", function (Blueprint $table) {
            $table->integer("traccar_device_id")->nullable()->unique()->after("type");
            $table->json("traccar_metadata")->nullable()->after("traccar_device_id");
        });
    }

    public function down(): void
    {
        Schema::table("trackers", function (Blueprint $table) {
            $table->dropColumn(["traccar_device_id", "traccar_metadata"]);
        });
    }
};
