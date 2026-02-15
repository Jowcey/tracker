<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVehicleRequest;
use App\Http\Requests\UpdateVehicleRequest;
use App\Models\Vehicle;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    public function index(Request $request)
    {
        $organizationId = $request->current_organization_id;
        
        $vehicles = Vehicle::with(['tracker.latestLocation'])
            ->forOrganization($organizationId)
            ->when($request->is_active, fn($q) => $q->active())
            ->when($request->search, fn($q, $search) => 
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('registration_number', 'like', "%{$search}%")
            )
            ->latest()
            ->paginate($request->per_page ?? 15);

        return response()->json($vehicles);
    }

    public function store(StoreVehicleRequest $request)
    {
        $vehicle = Vehicle::create([
            ...$request->validated(),
            'organization_id' => $request->current_organization_id,
        ]);

        return response()->json($vehicle->load('tracker'), 201);
    }

    public function show(Request $request, Vehicle $vehicle)
    {
        $this->authorize('view', $vehicle);
        
        return response()->json($vehicle->load(['tracker.latestLocation', 'trips' => fn($q) => $q->latest()->limit(10)]));
    }

    public function update(UpdateVehicleRequest $request, Vehicle $vehicle)
    {
        $this->authorize('update', $vehicle);
        
        $vehicle->update($request->validated());

        return response()->json($vehicle->load('tracker'));
    }

    public function destroy(Request $request, Vehicle $vehicle)
    {
        $this->authorize('delete', $vehicle);
        
        $vehicle->delete();

        return response()->json(['message' => 'Vehicle deleted successfully']);
    }
}
