<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\FuelLog;
use App\Models\Trip;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    private function parsePeriod(Request $request): array
    {
        $period = $request->input('period', 'month');
        if ($period === 'custom') {
            $from = Carbon::parse($request->input('from'))->startOfDay();
            $to = Carbon::parse($request->input('to'))->endOfDay();
        } elseif ($period === 'week') {
            $from = now()->startOfWeek();
            $to = now()->endOfWeek();
        } else {
            $from = now()->startOfMonth();
            $to = now()->endOfMonth();
        }
        return [$from, $to];
    }

    public function fleet(Request $request, int $organizationId)
    {
        $request->user()->organizations()->findOrFail($organizationId);
        [$from, $to] = $this->parsePeriod($request);

        $trips = Trip::where('organization_id', $organizationId)
            ->whereBetween('started_at', [$from, $to])
            ->with('vehicle:id,name,registration_number,type')
            ->get();

        $vehicles = Vehicle::where('organization_id', $organizationId)->where('is_active', true)->count();
        $activeVehicles = $trips->pluck('vehicle_id')->unique()->count();

        // Per-vehicle breakdown
        $byVehicle = $trips->groupBy('vehicle_id')->map(function ($vTrips) {
            $first = $vTrips->first();
            return [
                'vehicle_id' => $first->vehicle_id,
                'vehicle_name' => $first->vehicle?->name,
                'registration' => $first->vehicle?->registration_number,
                'trips_count' => $vTrips->count(),
                'total_distance' => round($vTrips->sum('distance'), 1),
                'total_duration' => $vTrips->sum('duration'),
                'avg_driver_score' => $vTrips->whereNotNull('driver_score')->avg('driver_score') ? round($vTrips->whereNotNull('driver_score')->avg('driver_score'), 1) : null,
                'harsh_events' => $vTrips->sum('harsh_braking_count') + $vTrips->sum('harsh_accel_count'),
            ];
        })->values();

        // Daily trips chart
        $daily = $trips->groupBy(fn($t) => Carbon::parse($t->started_at)->toDateString())
            ->map(fn($g) => ['date' => $g->first()->started_at->toDateString(), 'trips' => $g->count(), 'distance' => round($g->sum('distance'), 1)])
            ->values();

        return response()->json([
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'summary' => [
                'total_trips' => $trips->count(),
                'total_distance' => round($trips->sum('distance'), 1),
                'total_duration' => $trips->sum('duration'),
                'avg_driver_score' => $trips->whereNotNull('driver_score')->avg('driver_score') ? round($trips->whereNotNull('driver_score')->avg('driver_score'), 1) : null,
                'total_vehicles' => $vehicles,
                'active_vehicles' => $activeVehicles,
                'fleet_utilisation' => $vehicles > 0 ? round(($activeVehicles / $vehicles) * 100, 1) : 0,
                'total_harsh_events' => $trips->sum('harsh_braking_count') + $trips->sum('harsh_accel_count'),
            ],
            'by_vehicle' => $byVehicle,
            'daily' => $daily,
        ]);
    }

    public function driver(Request $request, int $organizationId, int $driverId)
    {
        $request->user()->organizations()->findOrFail($organizationId);
        [$from, $to] = $this->parsePeriod($request);

        $driver = Driver::where('organization_id', $organizationId)->findOrFail($driverId);

        $trips = $driver->trips()
            ->whereBetween('started_at', [$from, $to])
            ->with('vehicle:id,name,registration_number')
            ->get();

        $scoreHistory = $trips->whereNotNull('driver_score')
            ->map(fn($t) => ['date' => $t->started_at->toDateString(), 'score' => $t->driver_score])
            ->values();

        return response()->json([
            'driver' => $driver,
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'summary' => [
                'trips_count' => $trips->count(),
                'total_distance' => round($trips->sum('distance'), 1),
                'total_duration' => $trips->sum('duration'),
                'avg_driver_score' => $trips->whereNotNull('driver_score')->avg('driver_score') ? round($trips->whereNotNull('driver_score')->avg('driver_score'), 1) : null,
                'harsh_braking' => $trips->sum('harsh_braking_count'),
                'harsh_accel' => $trips->sum('harsh_accel_count'),
                'speeding_minutes' => round($trips->sum('speeding_duration') / 60, 1),
            ],
            'score_history' => $scoreHistory,
            'trips' => $trips,
        ]);
    }

    public function vehicle(Request $request, int $organizationId, int $vehicleId)
    {
        $request->user()->organizations()->findOrFail($organizationId);
        [$from, $to] = $this->parsePeriod($request);

        $vehicle = Vehicle::where('organization_id', $organizationId)->findOrFail($vehicleId);

        $trips = Trip::where('vehicle_id', $vehicle->id)
            ->whereBetween('started_at', [$from, $to])
            ->get();

        $fuelLogs = FuelLog::where('vehicle_id', $vehicle->id)
            ->whereBetween('filled_at', [$from, $to])
            ->get();

        $totalFuelCost = $fuelLogs->sum('total_cost');
        $totalDistance = round($trips->sum('distance'), 1);
        $costPerKm = $totalDistance > 0 ? round($totalFuelCost / $totalDistance, 4) : null;

        return response()->json([
            'vehicle' => $vehicle,
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'summary' => [
                'trips_count' => $trips->count(),
                'total_distance' => $totalDistance,
                'total_duration' => $trips->sum('duration'),
                'avg_driver_score' => $trips->whereNotNull('driver_score')->avg('driver_score') ? round($trips->whereNotNull('driver_score')->avg('driver_score'), 1) : null,
                'harsh_events' => $trips->sum('harsh_braking_count') + $trips->sum('harsh_accel_count'),
                'fuel_cost' => round($totalFuelCost, 2),
                'cost_per_km' => $costPerKm,
                'fill_ups' => $fuelLogs->count(),
            ],
            'trips' => $trips,
        ]);
    }

    public function export(Request $request, int $organizationId)
    {
        $request->user()->organizations()->findOrFail($organizationId);
        [$from, $to] = $this->parsePeriod($request);

        $type = $request->input('type', 'fleet');

        $trips = Trip::where('organization_id', $organizationId)
            ->whereBetween('started_at', [$from, $to])
            ->with(['vehicle:id,name,registration_number'])
            ->get();

        $filename = "report_{$type}_{$from->toDateString()}_{$to->toDateString()}.csv";

        return response()->stream(function () use ($trips, $type) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Trip ID', 'Vehicle', 'Registration', 'Started At', 'Ended At', 'Distance (km)', 'Duration (min)', 'Avg Speed', 'Max Speed', 'Driver Score', 'Harsh Braking', 'Harsh Accel', 'Label']);
            foreach ($trips as $trip) {
                fputcsv($handle, [
                    $trip->id,
                    $trip->vehicle?->name,
                    $trip->vehicle?->registration_number,
                    $trip->started_at,
                    $trip->ended_at,
                    round($trip->distance, 2),
                    round($trip->duration / 60, 1),
                    round($trip->average_speed, 1),
                    round($trip->max_speed, 1),
                    $trip->driver_score,
                    $trip->harsh_braking_count,
                    $trip->harsh_accel_count,
                    $trip->label,
                ]);
            }
            fclose($handle);
        }, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
