<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Services\AuditService;
use Illuminate\Http\Request;

class DriverController extends Controller
{
    public function index(Request $request, int $organizationId)
    {
        $request->user()->organizations()->findOrFail($organizationId);

        return Driver::where('organization_id', $organizationId)
            ->withCount('trips')
            ->orderBy('name')
            ->get()
            ->map(function ($driver) {
                return array_merge($driver->toArray(), [
                    'average_score' => $driver->average_score,
                    'total_distance' => $driver->total_distance,
                ]);
            });
    }

    public function store(Request $request, int $organizationId)
    {
        $request->user()->organizations()->findOrFail($organizationId);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'license_number' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:50',
            'avatar_url' => 'nullable|url',
            'notes' => 'nullable|string',
            'user_id' => 'nullable|exists:users,id',
        ]);

        $driver = Driver::create(array_merge($data, ['organization_id' => $organizationId]));

        AuditService::log('driver.created', $driver, [], $driver->toArray(), "Driver {$driver->name} created", $organizationId);

        return response()->json($driver, 201);
    }

    public function show(Request $request, int $organizationId, int $driverId)
    {
        $request->user()->organizations()->findOrFail($organizationId);

        $driver = Driver::where('organization_id', $organizationId)->findOrFail($driverId);

        $trips = $driver->trips()
            ->with('vehicle:id,name,registration_number')
            ->orderByDesc('started_at')
            ->paginate(20);

        return response()->json([
            'driver' => array_merge($driver->toArray(), [
                'average_score' => $driver->average_score,
                'total_distance' => $driver->total_distance,
                'trips_count' => $driver->trips()->count(),
            ]),
            'trips' => $trips,
        ]);
    }

    public function update(Request $request, int $organizationId, int $driverId)
    {
        $request->user()->organizations()->findOrFail($organizationId);

        $driver = Driver::where('organization_id', $organizationId)->findOrFail($driverId);
        $old = $driver->toArray();

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'license_number' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:50',
            'avatar_url' => 'nullable|url',
            'notes' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
            'user_id' => 'nullable|exists:users,id',
        ]);

        $driver->update($data);

        AuditService::log('driver.updated', $driver, $old, $driver->fresh()->toArray(), "Driver {$driver->name} updated", $organizationId);

        return response()->json($driver->fresh());
    }

    public function destroy(Request $request, int $organizationId, int $driverId)
    {
        $request->user()->organizations()->findOrFail($organizationId);

        $driver = Driver::where('organization_id', $organizationId)->findOrFail($driverId);

        AuditService::log('driver.deleted', $driver, $driver->toArray(), [], "Driver {$driver->name} deleted", $organizationId);

        $driver->delete();

        return response()->json(['message' => 'Driver deleted']);
    }

    public function assignTrip(Request $request, int $organizationId, int $driverId)
    {
        $request->user()->organizations()->findOrFail($organizationId);

        $driver = Driver::where('organization_id', $organizationId)->findOrFail($driverId);

        $data = $request->validate([
            'trip_id' => 'required|exists:trips,id',
            'role' => 'in:primary,passenger',
        ]);

        $driver->trips()->syncWithoutDetaching([
            $data['trip_id'] => ['role' => $data['role'] ?? 'primary']
        ]);

        return response()->json(['message' => 'Driver assigned to trip']);
    }
}
