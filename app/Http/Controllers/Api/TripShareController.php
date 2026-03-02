<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\TripShare;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TripShareController extends Controller
{
    public function create(Request $request, int $organizationId, int $tripId)
    {
        $request->user()->organizations()->findOrFail($organizationId);

        $trip = Trip::where('organization_id', $organizationId)->findOrFail($tripId);

        $data = $request->validate([
            'expires_at' => 'nullable|date|after:now',
        ]);

        // Revoke existing share if any
        TripShare::where('trip_id', $trip->id)->delete();

        $share = TripShare::create([
            'trip_id' => $trip->id,
            'created_by' => $request->user()->id,
            'token' => Str::random(48),
            'expires_at' => $data['expires_at'] ?? null,
        ]);

        return response()->json([
            'token' => $share->token,
            'url' => url("/share/{$share->token}"),
            'expires_at' => $share->expires_at,
        ], 201);
    }

    public function revoke(Request $request, int $organizationId, int $tripId)
    {
        $request->user()->organizations()->findOrFail($organizationId);

        $trip = Trip::where('organization_id', $organizationId)->findOrFail($tripId);

        TripShare::where('trip_id', $trip->id)->delete();

        return response()->json(['message' => 'Share revoked']);
    }

    public function show(string $token)
    {
        $share = TripShare::where('token', $token)->with(['trip.vehicle:id,name,type,registration_number', 'trip.organization:id,settings'])->firstOrFail();

        if ($share->isExpired()) {
            abort(410, 'This share link has expired.');
        }

        $share->increment('view_count');

        $trip = $share->trip;

        return response()->json([
            'vehicle' => $trip->vehicle,
            'trip' => [
                'id' => $trip->id,
                'started_at' => $trip->started_at,
                'ended_at' => $trip->ended_at,
                'distance' => $trip->distance,
                'duration' => $trip->duration,
                'start_address' => $trip->start_address,
                'end_address' => $trip->end_address,
                'start_latitude' => $trip->start_latitude,
                'start_longitude' => $trip->start_longitude,
                'end_latitude' => $trip->end_latitude,
                'end_longitude' => $trip->end_longitude,
                'average_speed' => $trip->average_speed,
                'max_speed' => $trip->max_speed,
                'driver_score' => $trip->driver_score,
            ],
            'route_coordinates' => $trip->route_coordinates ?? [],
            'share' => [
                'view_count' => $share->view_count,
                'expires_at' => $share->expires_at,
            ],
            'speed_unit' => $trip->organization?->settings['speed_unit'] ?? 'mph',
        ]);
    }
}
