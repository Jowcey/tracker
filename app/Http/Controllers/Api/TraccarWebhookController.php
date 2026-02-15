<?php

namespace App\Http\Controllers\Api;

use App\Events\LocationUpdated;
use App\Http\Controllers\Controller;
use App\Models\Location;
use App\Models\Tracker;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TraccarWebhookController extends Controller
{
    public function positions(Request $request)
    {
        $token = $request->bearerToken();
        if ($token !== config("services.traccar.api_token")) {
            Log::warning("Traccar webhook: Invalid token");
            return response()->json(["error" => "Unauthorized"], 401);
        }

        $data = $request->validate([
            "deviceId" => "required|integer",
            "latitude" => "required|numeric",
            "longitude" => "required|numeric",
            "altitude" => "nullable|numeric",
            "speed" => "nullable|numeric",
            "course" => "nullable|numeric",
            "accuracy" => "nullable|numeric",
            "deviceTime" => "required|date",
        ]);

        $tracker = Tracker::where("traccar_device_id", $data["deviceId"])->first();
        
        if (!$tracker) {
            Log::warning("Traccar webhook: Unknown device", ["device_id" => $data["deviceId"]]);
            return response()->json(["error" => "Unknown device"], 404);
        }

        $location = Location::create([
            "tracker_id" => $tracker->id,
            "organization_id" => $tracker->organization_id,
            "latitude" => $data["latitude"],
            "longitude" => $data["longitude"],
            "altitude" => $data["altitude"] ?? null,
            "speed" => $data["speed"] ?? null,
            "heading" => $data["course"] ?? null,
            "accuracy" => $data["accuracy"] ?? null,
            "recorded_at" => $data["deviceTime"],
        ]);

        broadcast(new LocationUpdated(
            trackerId: $tracker->id,
            organizationId: $tracker->organization_id,
            latitude: $location->latitude,
            longitude: $location->longitude,
            heading: $location->heading,
            speed: $location->speed,
            recordedAt: $location->recorded_at->toISOString()
        ))->toOthers();

        return response()->json(["status" => "success"], 200);
    }
}
