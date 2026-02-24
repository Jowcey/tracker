<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FuelLog;
use App\Models\Vehicle;
use App\Models\Trip;
use Illuminate\Http\Request;

class FuelController extends Controller
{
    public function index(Request $request, int $organizationId, int $vehicleId)
    {
        $request->user()->organizations()->findOrFail($organizationId);

        $vehicle = Vehicle::where('organization_id', $organizationId)->findOrFail($vehicleId);

        $logs = FuelLog::where('vehicle_id', $vehicle->id)
            ->with('driver:id,name')
            ->orderByDesc('filled_at')
            ->get()
            ->map(fn($log) => array_merge($log->toArray(), ['total_cost' => $log->total_cost]));

        return response()->json($logs);
    }

    public function store(Request $request, int $organizationId, int $vehicleId)
    {
        $request->user()->organizations()->findOrFail($organizationId);

        $vehicle = Vehicle::where('organization_id', $organizationId)->findOrFail($vehicleId);

        $data = $request->validate([
            'litres' => 'required|numeric|min:0.1',
            'cost_per_litre' => 'required|numeric|min:0',
            'odometer_km' => 'nullable|numeric|min:0',
            'full_tank' => 'boolean',
            'station' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'driver_id' => 'nullable|exists:drivers,id',
            'filled_at' => 'required|date',
        ]);

        $log = FuelLog::create(array_merge($data, [
            'organization_id' => $organizationId,
            'vehicle_id' => $vehicle->id,
        ]));

        return response()->json(array_merge($log->toArray(), ['total_cost' => $log->total_cost]), 201);
    }

    public function destroy(Request $request, int $organizationId, int $vehicleId, int $logId)
    {
        $request->user()->organizations()->findOrFail($organizationId);

        $vehicle = Vehicle::where('organization_id', $organizationId)->findOrFail($vehicleId);

        $log = FuelLog::where('vehicle_id', $vehicle->id)->findOrFail($logId);
        $log->delete();

        return response()->json(['message' => 'Fuel log deleted']);
    }

    public function summary(Request $request, int $organizationId, int $vehicleId)
    {
        $request->user()->organizations()->findOrFail($organizationId);

        $vehicle = Vehicle::where('organization_id', $organizationId)->findOrFail($vehicleId);

        $logs = FuelLog::where('vehicle_id', $vehicle->id)
            ->where('full_tank', true)
            ->orderBy('filled_at')
            ->get();

        $totalLitres = FuelLog::where('vehicle_id', $vehicle->id)->sum('litres');
        $totalCost = FuelLog::where('vehicle_id', $vehicle->id)->get()->sum('total_cost');
        $totalDistance = Trip::where('vehicle_id', $vehicle->id)->sum('distance');

        $avgLPer100km = $totalDistance > 0 ? round(($totalLitres / $totalDistance) * 100, 2) : null;
        $costPerKm = $totalDistance > 0 ? round($totalCost / $totalDistance, 4) : null;

        // Calculate efficiency trend (last 5 full tanks)
        $trend = [];
        $fullTanks = $logs->where('full_tank', true)->values();
        for ($i = 1; $i < min(count($fullTanks), 6); $i++) {
            $current = $fullTanks[$i];
            $prev = $fullTanks[$i - 1];
            if ($current->odometer_km && $prev->odometer_km) {
                $dist = $current->odometer_km - $prev->odometer_km;
                if ($dist > 0) {
                    $trend[] = [
                        'date' => $current->filled_at->toDateString(),
                        'l_per_100km' => round(($current->litres / $dist) * 100, 2),
                    ];
                }
            }
        }

        return response()->json([
            'total_litres' => round($totalLitres, 2),
            'total_cost' => round($totalCost, 2),
            'total_distance_km' => round($totalDistance, 1),
            'avg_l_per_100km' => $avgLPer100km,
            'cost_per_km' => $costPerKm,
            'fill_ups_count' => $logs->count(),
            'efficiency_trend' => $trend,
        ]);
    }
}
