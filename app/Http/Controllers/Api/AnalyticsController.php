<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\Vehicle;
use App\Models\Location;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function summary(Request $request)
    {
        $orgId = $request->current_organization_id;
        $period = $request->get('period', 'week');

        $start = $period === 'month' ? now()->startOfMonth() : now()->startOfWeek();
        $end = now();

        $trips = Trip::forOrganization($orgId)
            ->whereBetween('started_at', [$start, $end])
            ->completed()
            ->get();

        $totalVehicles = Vehicle::where('organization_id', $orgId)->where('is_active', true)->count();

        // Active vehicles = vehicles with a trip in the period
        $activeVehicles = $trips->pluck('vehicle_id')->unique()->count();

        // Most active vehicle
        $mostActive = $trips->groupBy('vehicle_id')
            ->map(fn($group) => $group->count())
            ->sortDesc()
            ->keys()
            ->first();

        $mostActiveVehicle = $mostActive
            ? Vehicle::find($mostActive)?->only(['id', 'name', 'type'])
            : null;

        return response()->json([
            'period' => $period,
            'start' => $start->toDateString(),
            'end' => $end->toDateString(),
            'total_trips' => $trips->count(),
            'total_distance_km' => round($trips->sum('distance'), 1),
            'total_drive_time_seconds' => $trips->sum('duration'),
            'total_idle_seconds' => $trips->sum('idle_duration'),
            'average_trip_distance_km' => $trips->count() > 0 ? round($trips->avg('distance'), 1) : 0,
            'average_trip_duration_seconds' => $trips->count() > 0 ? (int) $trips->avg('duration') : 0,
            'average_driver_score' => $trips->whereNotNull('driver_score')->avg('driver_score') ? round($trips->whereNotNull('driver_score')->avg('driver_score')) : null,
            'vehicles_total' => $totalVehicles,
            'vehicles_active' => $activeVehicles,
            'fleet_utilisation_pct' => $totalVehicles > 0 ? round(($activeVehicles / $totalVehicles) * 100) : 0,
            'most_active_vehicle' => $mostActiveVehicle,
            // Daily trip counts for spark chart (last 7 or 30 days)
            'daily_trips' => $this->dailyTripCounts($orgId, $start, $end),
        ]);
    }

    private function dailyTripCounts(int $orgId, Carbon $start, Carbon $end): array
    {
        $counts = Trip::forOrganization($orgId)
            ->whereBetween('started_at', [$start, $end])
            ->completed()
            ->selectRaw('DATE(started_at) as date, COUNT(*) as count, SUM(distance) as distance')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $result = [];
        $current = $start->copy();
        while ($current->lte($end)) {
            $dateStr = $current->toDateString();
            $result[] = [
                'date' => $dateStr,
                'trips' => $counts[$dateStr]->count ?? 0,
                'distance' => round($counts[$dateStr]->distance ?? 0, 1),
            ];
            $current->addDay();
        }
        return $result;
    }
}
