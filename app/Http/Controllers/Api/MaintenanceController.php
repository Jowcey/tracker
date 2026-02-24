<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaintenanceReminder;
use App\Models\Vehicle;
use App\Models\Trip;
use Illuminate\Http\Request;

class MaintenanceController extends Controller
{
    public function index(Request $request)
    {
        $orgId = $request->current_organization_id;

        $query = MaintenanceReminder::where('organization_id', $orgId)
            ->with('vehicle');

        if ($request->vehicle_id) {
            $query->where('vehicle_id', $request->vehicle_id);
        }
        if ($request->has('resolved')) {
            $query->where('is_resolved', (bool) $request->resolved);
        }

        $reminders = $query->latest()->get();

        // Attach odometer to each vehicle
        $vehicleOdometers = Trip::where('organization_id', $orgId)
            ->selectRaw('vehicle_id, ROUND(SUM(distance), 0) as total_km')
            ->groupBy('vehicle_id')
            ->pluck('total_km', 'vehicle_id');

        return response()->json([
            'data' => $reminders,
            'vehicle_odometers' => $vehicleOdometers,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|integer|exists:vehicles,id',
            'type' => 'required|in:oil_change,tyre_rotation,service,inspection,custom',
            'description' => 'required|string|max:255',
            'due_at_km' => 'nullable|integer|min:0',
            'due_at_date' => 'nullable|date',
            'last_serviced_at_km' => 'nullable|integer|min:0',
            'last_serviced_at_date' => 'nullable|date',
        ]);

        $reminder = MaintenanceReminder::create([
            ...$validated,
            'organization_id' => $request->current_organization_id,
        ]);

        return response()->json($reminder->load('vehicle'), 201);
    }

    public function update(Request $request, MaintenanceReminder $reminder)
    {
        abort_if($reminder->organization_id !== $request->current_organization_id, 403);

        $validated = $request->validate([
            'description' => 'sometimes|string|max:255',
            'due_at_km' => 'nullable|integer|min:0',
            'due_at_date' => 'nullable|date',
            'last_serviced_at_km' => 'nullable|integer|min:0',
            'last_serviced_at_date' => 'nullable|date',
            'is_resolved' => 'boolean',
        ]);

        if (isset($validated['is_resolved']) && $validated['is_resolved'] && !$reminder->is_resolved) {
            $validated['resolved_at'] = now();
        }

        $reminder->update($validated);
        return response()->json($reminder);
    }

    public function destroy(Request $request, MaintenanceReminder $reminder)
    {
        abort_if($reminder->organization_id !== $request->current_organization_id, 403);
        $reminder->delete();
        return response()->json(null, 204);
    }
}
