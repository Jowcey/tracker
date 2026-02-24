<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLocationRequest;
use App\Jobs\CalculateTripsJob;
use App\Models\Location;
use App\Models\Tracker;
use App\Models\Vehicle;
use App\Events\LocationUpdated;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class LocationController extends Controller
{
    public function index(Request $request)
    {
        $organizationId = $request->current_organization_id;
        
        $query = Location::forOrganization($organizationId)
            ->with(['tracker', 'vehicle']);

        if ($request->vehicle_id) {
            $query->forVehicle($request->vehicle_id);
        }

        if ($request->tracker_id) {
            $query->forTracker($request->tracker_id);
        }

        if ($request->start_date && $request->end_date) {
            $query->inTimeRange($request->start_date, $request->end_date);
        }

        $locations = $query->latest('recorded_at')
            ->paginate($request->per_page ?? 50);

        return response()->json($locations);
    }

    public function store(StoreLocationRequest $request)
    {
        $location = Location::create([
            ...$request->validated(),
            'organization_id' => $request->current_organization_id,
        ]);

        // Broadcast location update
        if ($this->shouldBroadcast($location)) {
            broadcast(new LocationUpdated(
                trackerId: $location->tracker_id,
                organizationId: $location->organization_id,
                latitude: (float) $location->latitude,
                longitude: (float) $location->longitude,
                heading: $location->heading ? (float) $location->heading : null,
                speed: $location->speed ? (float) $location->speed : null,
                recordedAt: $location->recorded_at->toISOString()
            ));

            $this->updateBroadcastCache($location);
        }

        $this->dispatchTripCalculation($location);

        return response()->json($location, 201);
    }

    public function byVehicle(Request $request, Vehicle $vehicle)
    {
        $this->authorize('view', $vehicle);
        
        $query = Location::forVehicle($vehicle->id);

        if ($request->start_date && $request->end_date) {
            $query->inTimeRange($request->start_date, $request->end_date);
        }

        $locations = $query->latest('recorded_at')
            ->paginate($request->per_page ?? 100);

        return response()->json($locations);
    }

    public function byTracker(Request $request, Tracker $tracker)
    {
        $this->authorize('view', $tracker);
        
        $query = Location::forTracker($tracker->id);

        if ($request->start_date && $request->end_date) {
            $query->inTimeRange($request->start_date, $request->end_date);
        }

        $locations = $query->latest('recorded_at')
            ->paginate($request->per_page ?? 100);

        return response()->json($locations);
    }

    // Public endpoint for GPS devices to post location
    public function storeFromDevice(Request $request)
    {
        // Get organization ID from API key middleware
        $organizationId = $request->attributes->get('api_organization_id');
        
        $validated = $request->validate([
            'tracker_id' => 'required|integer|exists:trackers,id',
            'latitude' => 'required|numeric|min:-90|max:90',
            'longitude' => 'required|numeric|min:-180|max:180',
            'altitude' => 'nullable|numeric',
            'speed' => 'nullable|numeric|min:0',
            'heading' => 'nullable|numeric|min:0|max:360',
            'accuracy' => 'nullable|numeric|min:0',
            'satellites' => 'nullable|integer|min:0',
            'recorded_at' => 'nullable|date',
        ]);

        // Verify tracker belongs to organization
        $tracker = Tracker::where('id', $validated['tracker_id'])
            ->where('organization_id', $organizationId)
            ->firstOrFail();

        // Update tracker last communication
        $tracker->update(['last_communication_at' => now()]);

        $location = Location::create([
            'organization_id' => $tracker->organization_id,
            'tracker_id' => $tracker->id,
            'vehicle_id' => $tracker->vehicle?->id,
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'altitude' => $validated['altitude'] ?? null,
            'speed' => $validated['speed'] ?? null,
            'heading' => $validated['heading'] ?? null,
            'accuracy' => $validated['accuracy'] ?? null,
            'satellites' => $validated['satellites'] ?? null,
            'recorded_at' => $validated['recorded_at'] ?? now(),
        ]);

        // Broadcast with throttling
        if ($this->shouldBroadcast($location)) {
            broadcast(new LocationUpdated(
                trackerId: $location->tracker_id,
                organizationId: $location->organization_id,
                latitude: (float) $location->latitude,
                longitude: (float) $location->longitude,
                heading: $location->heading ? (float) $location->heading : null,
                speed: $location->speed ? (float) $location->speed : null,
                recordedAt: $location->recorded_at->toISOString()
            ));

            $this->updateBroadcastCache($location);
        }

        $this->dispatchTripCalculation($location);

        return response()->json([
            'message' => 'Location stored successfully',
            'location_id' => $location->id
        ], 201);
    }

    private function dispatchTripCalculation(Location $location): void
    {
        if (!$location->vehicle_id) {
            return;
        }

        // Debounce: only dispatch once per 5 minutes per vehicle to avoid flooding the queue
        $cacheKey = "trip_calc_queued.vehicle.{$location->vehicle_id}";
        if (!Cache::has($cacheKey)) {
            CalculateTripsJob::dispatch(
                $location->vehicle_id,
                Carbon::today(),
                Carbon::now()
            )->delay(now()->addMinutes(5));
            Cache::put($cacheKey, true, 300);
        }
    }

    private function shouldBroadcast(Location $location): bool
    {
        $cacheKey = "last_broadcast.tracker.{$location->tracker_id}";
        $lastBroadcast = Cache::get($cacheKey);

        if (!$lastBroadcast) {
            return true;
        }

        // Broadcast if 5+ seconds passed
        $timePassed = now()->diffInSeconds($lastBroadcast['time']) >= 5;
        
        // Or if moved 10+ meters
        $distanceMoved = $this->haversineDistance(
            $lastBroadcast['coords'],
            [$location->latitude, $location->longitude]
        ) > 10;

        return $timePassed || $distanceMoved;
    }

    private function updateBroadcastCache(Location $location): void
    {
        $cacheKey = "last_broadcast.tracker.{$location->tracker_id}";
        
        Cache::put($cacheKey, [
            'time' => now(),
            'coords' => [(float) $location->latitude, (float) $location->longitude]
        ], 60); // Cache for 60 seconds
    }

    private function haversineDistance(array $coords1, array $coords2): float
    {
        $earthRadius = 6371000; // meters

        $lat1 = deg2rad($coords1[0]);
        $lon1 = deg2rad($coords1[1]);
        $lat2 = deg2rad($coords2[0]);
        $lon2 = deg2rad($coords2[1]);

        $latDiff = $lat2 - $lat1;
        $lonDiff = $lon2 - $lon1;

        $a = sin($latDiff / 2) ** 2 + cos($lat1) * cos($lat2) * sin($lonDiff / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }
}
