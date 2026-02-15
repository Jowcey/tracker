<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tracker;
use Illuminate\Http\Request;

class TrackerController extends Controller
{
    public function index(Request $request)
    {
        $organizationId = $request->current_organization_id;
        
        $query = Tracker::with(["vehicle", "latestLocation"])
            ->forOrganization($organizationId)
            ->when($request->is_active, fn($q) => $q->active())
            ->when($request->search, fn($q, $search) => 
                $q->where("name", "like", "%{$search}%")
                  ->orWhere("device_id", "like", "%{$search}%")
            );
        
        // Filter by device_id if provided (for mobile app lookup)
        if ($request->device_id) {
            $query->where('device_id', $request->device_id);
        }
        
        $trackers = $query->latest()->paginate($request->per_page ?? 15);

        return response()->json($trackers);
    }

    public function store(Request $request)
    {
        $this->authorize("create", [Tracker::class, $request->current_organization_id]);
        
        $validated = $request->validate([
            "device_id" => "required|string|unique:trackers,device_id",
            "name" => "required|string|max:255",
            "type" => "required|in:gps,phone,obd,asset",
            "protocol" => "nullable|string|in:http,gprs,mqtt,websocket",
            "manufacturer" => "nullable|string|max:255",
            "model" => "nullable|string|max:255",
            "sim_number" => "nullable|string|max:255",
            "phone_number" => "nullable|string|max:255",
            "settings" => "nullable|array",
            "is_active" => "boolean",
        ]);

        $tracker = Tracker::create([
            ...$validated,
            "organization_id" => $request->current_organization_id,
        ]);

        return response()->json($tracker, 201);
    }

    public function show(Request $request, $organization, $tracker)
    {
        $tracker = Tracker::where("organization_id", $request->current_organization_id)
            ->findOrFail($tracker);
            
        $this->authorize("view", $tracker);
        
        return response()->json($tracker->load(["vehicle", "latestLocation"]));
    }

    public function update(Request $request, $organization, $tracker)
    {
        $tracker = Tracker::where("organization_id", $request->current_organization_id)
            ->findOrFail($tracker);
            
        $this->authorize("update", $tracker);
        
        $validated = $request->validate([
            "name" => "sometimes|required|string|max:255",
            "type" => "sometimes|required|in:gps,phone,obd,asset",
            "protocol" => "nullable|string|in:http,gprs,mqtt,websocket",
            "manufacturer" => "nullable|string|max:255",
            "model" => "nullable|string|max:255",
            "sim_number" => "nullable|string|max:255",
            "phone_number" => "nullable|string|max:255",
            "settings" => "nullable|array",
            "is_active" => "boolean",
        ]);

        $tracker->update($validated);

        return response()->json($tracker->load(["vehicle", "latestLocation"]));
    }

    public function destroy(Request $request, $organization, $tracker)
    {
        $tracker = Tracker::where("organization_id", $request->current_organization_id)
            ->findOrFail($tracker);
            
        $this->authorize("delete", $tracker);

        $tracker->delete();

        return response()->json(null, 204);
    }
}
