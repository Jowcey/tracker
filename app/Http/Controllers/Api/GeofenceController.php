<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Geofence;
use Illuminate\Http\Request;

class GeofenceController extends Controller
{
    public function index(Request $request)
    {
        $geofences = Geofence::forOrganization($request->current_organization_id)
            ->get();
        return response()->json(['data' => $geofences]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|in:circle,polygon',
            'center_latitude' => 'required_if:type,circle|nullable|numeric|min:-90|max:90',
            'center_longitude' => 'required_if:type,circle|nullable|numeric|min:-180|max:180',
            'radius' => 'required_if:type,circle|nullable|integer|min:50|max:50000',
            'coordinates' => 'required_if:type,polygon|nullable|array|min:3',
            'color' => 'nullable|string|regex:/^#[0-9a-fA-F]{6}$/',
            'is_active' => 'boolean',
            'settings' => 'nullable|array',
        ]);

        $geofence = Geofence::create([
            ...$validated,
            'organization_id' => $request->current_organization_id,
        ]);

        return response()->json($geofence, 201);
    }

    public function show(Request $request, Geofence $geofence)
    {
        abort_if($geofence->organization_id !== $request->current_organization_id, 403);
        return response()->json($geofence);
    }

    public function update(Request $request, Geofence $geofence)
    {
        abort_if($geofence->organization_id !== $request->current_organization_id, 403);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'center_latitude' => 'nullable|numeric|min:-90|max:90',
            'center_longitude' => 'nullable|numeric|min:-180|max:180',
            'radius' => 'nullable|integer|min:50|max:50000',
            'coordinates' => 'nullable|array|min:3',
            'color' => 'nullable|string|regex:/^#[0-9a-fA-F]{6}$/',
            'is_active' => 'boolean',
            'settings' => 'nullable|array',
        ]);

        $geofence->update($validated);
        return response()->json($geofence);
    }

    public function destroy(Request $request, Geofence $geofence)
    {
        abort_if($geofence->organization_id !== $request->current_organization_id, 403);
        $geofence->delete();
        return response()->json(null, 204);
    }
}
