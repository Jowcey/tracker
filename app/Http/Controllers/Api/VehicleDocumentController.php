<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VehicleDocument;
use App\Models\Vehicle;
use Illuminate\Http\Request;

class VehicleDocumentController extends Controller
{
    public function index(Request $request, int $organizationId)
    {
        $request->user()->organizations()->findOrFail($organizationId);

        $query = VehicleDocument::where('organization_id', $organizationId)
            ->with('vehicle:id,name,registration_number')
            ->orderBy('expiry_date');

        if ($request->filled('vehicle_id')) {
            $query->where('vehicle_id', $request->vehicle_id);
        }
        if ($request->filled('status')) {
            $today = now()->toDateString();
            $in30 = now()->addDays(30)->toDateString();
            match ($request->status) {
                'expired' => $query->where('expiry_date', '<', $today),
                'expiring_soon' => $query->whereBetween('expiry_date', [$today, $in30]),
                'valid' => $query->where('expiry_date', '>', $in30),
                default => null,
            };
        }

        return $query->get()->map(fn($doc) => array_merge($doc->toArray(), [
            'expiry_status' => $doc->expiry_status,
            'days_until_expiry' => $doc->days_until_expiry,
        ]));
    }

    public function store(Request $request, int $organizationId)
    {
        $request->user()->organizations()->findOrFail($organizationId);

        $data = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'type' => 'required|string|max:50',
            'title' => 'required|string|max:255',
            'issued_date' => 'nullable|date',
            'expiry_date' => 'nullable|date',
            'file_url' => 'nullable|url|max:500',
            'notes' => 'nullable|string',
        ]);

        // Verify vehicle belongs to org
        Vehicle::where('organization_id', $organizationId)->findOrFail($data['vehicle_id']);

        $doc = VehicleDocument::create(array_merge($data, ['organization_id' => $organizationId]));

        return response()->json(array_merge($doc->toArray(), [
            'expiry_status' => $doc->expiry_status,
            'days_until_expiry' => $doc->days_until_expiry,
        ]), 201);
    }

    public function update(Request $request, int $organizationId, int $docId)
    {
        $request->user()->organizations()->findOrFail($organizationId);

        $doc = VehicleDocument::where('organization_id', $organizationId)->findOrFail($docId);

        $data = $request->validate([
            'type' => 'sometimes|string|max:50',
            'title' => 'sometimes|string|max:255',
            'issued_date' => 'nullable|date',
            'expiry_date' => 'nullable|date',
            'file_url' => 'nullable|url|max:500',
            'notes' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $doc->update($data);

        return response()->json(array_merge($doc->fresh()->toArray(), [
            'expiry_status' => $doc->fresh()->expiry_status,
            'days_until_expiry' => $doc->fresh()->days_until_expiry,
        ]));
    }

    public function destroy(Request $request, int $organizationId, int $docId)
    {
        $request->user()->organizations()->findOrFail($organizationId);

        $doc = VehicleDocument::where('organization_id', $organizationId)->findOrFail($docId);
        $doc->delete();

        return response()->json(['message' => 'Document deleted']);
    }
}
