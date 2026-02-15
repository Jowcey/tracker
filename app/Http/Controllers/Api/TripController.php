<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\Vehicle;
use App\Services\TripCalculationService;
use Illuminate\Http\Request;
use Carbon\Carbon;

class TripController extends Controller
{
    public function __construct(
        private TripCalculationService $tripService
    ) {}

    public function index(Request $request)
    {
        $organizationId = $request->current_organization_id;
        
        $query = Trip::forOrganization($organizationId)
            ->with(['vehicle', 'tracker']);

        // Get vehicle from route parameter (could be ID or Vehicle model)
        $vehicle = $request->route('vehicle');
        if ($vehicle) {
            $vehicleId = $vehicle instanceof Vehicle ? $vehicle->id : $vehicle;
            $query->forVehicle($vehicleId);
        } elseif ($request->vehicle_id) {
            $query->forVehicle($request->vehicle_id);
        }

        if ($request->start_date && $request->end_date) {
            $query->inTimeRange($request->start_date, $request->end_date);
        }

        if ($request->filter === 'completed') {
            $query->completed();
        } elseif ($request->filter === 'active') {
            $query->active();
        }

        $trips = $query->latest('started_at')
            ->paginate($request->per_page ?? 15);

        return response()->json($trips);
    }

    public function show(Request $request, Trip $trip)
    {
        $this->authorize('view', $trip->vehicle);
        
        return response()->json($trip->load(['vehicle', 'tracker']));
    }

    public function calculate(Request $request, Vehicle $vehicle)
    {
        $this->authorize('view', $vehicle);
        
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
        ]);

        $this->tripService->calculateTrips(
            $vehicle->id,
            Carbon::parse($validated['start_date']),
            Carbon::parse($validated['end_date'])
        );

        $trips = Trip::forVehicle($vehicle->id)
            ->inTimeRange($validated['start_date'], $validated['end_date'])
            ->get();

        return response()->json([
            'message' => 'Trips calculated successfully',
            'count' => $trips->count(),
            'trips' => $trips,
        ]);
    }

    public function locations(Request $request, string $trip)
    {
        $organizationId = $request->current_organization_id;
        $trip = Trip::where('organization_id', $organizationId)->findOrFail($trip);
        
        $this->authorize('view', $trip->vehicle);
        
        $locations = $trip->tracker->locations()
            ->whereBetween('recorded_at', [$trip->started_at, $trip->ended_at ?? now()])
            ->orderBy('recorded_at', 'asc')
            ->get();

        return response()->json([
            'data' => $locations
        ]);
    }
}
