<?php
namespace App\Services;

use App\Models\FuelLog;
use App\Models\Trip;

class TripCostService
{
    public static function getCostPerKm(int $vehicleId): ?float
    {
        $logs = FuelLog::where('vehicle_id', $vehicleId)->get();
        if ($logs->isEmpty()) return null;

        $totalLitres = $logs->sum('litres');
        $totalCost = $logs->sum(fn($l) => $l->total_cost);
        $totalDistance = Trip::where('vehicle_id', $vehicleId)->sum('distance');

        if ($totalDistance < 1) return null;
        return $totalCost / $totalDistance;
    }

    public static function getAvgL100km(int $vehicleId): ?float
    {
        $totalLitres = FuelLog::where('vehicle_id', $vehicleId)->sum('litres');
        $totalDistance = Trip::where('vehicle_id', $vehicleId)->sum('distance');
        if ($totalDistance < 1 || $totalLitres < 0.1) return null;
        return ($totalLitres / $totalDistance) * 100;
    }

    public static function calculateTripCost(Trip $trip): array
    {
        $costPerKm = self::getCostPerKm($trip->vehicle_id);
        $avgL100km = self::getAvgL100km($trip->vehicle_id);

        $costKm = $costPerKm ? round($trip->distance * $costPerKm, 4) : null;
        $co2Kg = $avgL100km ? round(($trip->distance * $avgL100km / 100) * 2.31, 3) : null;

        return ['cost_km' => $costKm, 'co2_kg' => $co2Kg];
    }

    public static function recalculateVehicleTrips(int $vehicleId): void
    {
        $trips = Trip::where('vehicle_id', $vehicleId)->get();
        $costPerKm = self::getCostPerKm($vehicleId);
        $avgL100km = self::getAvgL100km($vehicleId);

        foreach ($trips as $trip) {
            $trip->update([
                'cost_km' => $costPerKm ? round($trip->distance * $costPerKm, 4) : null,
                'co2_kg' => $avgL100km ? round(($trip->distance * $avgL100km / 100) * 2.31, 3) : null,
            ]);
        }
    }
}
