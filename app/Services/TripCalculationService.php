<?php

namespace App\Services;

use App\Models\Location;
use App\Models\Trip;
use Carbon\Carbon;

class TripCalculationService
{
    private const MIN_STOP_DURATION = 180; // 3 minutes in seconds
    private const MIN_MOVING_SPEED = 5; // km/h
    private const MAX_TRIP_GAP = 3600; // 1 hour in seconds

    public function calculateTrips(int $vehicleId, Carbon $startDate, Carbon $endDate): void
    {
        $locations = Location::forVehicle($vehicleId)
            ->inTimeRange($startDate, $endDate)
            ->orderBy('recorded_at')
            ->get();

        if ($locations->count() < 2) {
            return;
        }

        // Delete existing trips for this vehicle/range to avoid duplicates on recalculation
        Trip::where('vehicle_id', $vehicleId)
            ->where('started_at', '>=', $startDate)
            ->where('started_at', '<=', $endDate)
            ->delete();

        $currentTrip = null;
        $stops = [];
        $lastMovingLocation = null;
        $lastStopStart = null;
        $prevLocation = null;

        foreach ($locations as $index => $location) {
            // Calculate speed from GPS position delta (more accurate than device-reported speed)
            $gpsSpeed = $this->calculateSpeedFromDelta($prevLocation, $location);
            // Use GPS-calculated speed; fall back to device-reported speed if no previous point
            $effectiveSpeed = $prevLocation !== null ? $gpsSpeed : ($location->speed ?? 0);
            $isMoving = $effectiveSpeed >= self::MIN_MOVING_SPEED;

            // Start new trip if moving and no current trip
            if ($isMoving && !$currentTrip) {
                $currentTrip = [
                    'vehicle_id' => $vehicleId,
                    'tracker_id' => $location->tracker_id,
                    'organization_id' => $location->organization_id,
                    'started_at' => $location->recorded_at,
                    'start_latitude' => $location->latitude,
                    'start_longitude' => $location->longitude,
                    'route_coordinates' => [[$location->longitude, $location->latitude]],
                    'max_speed' => $effectiveSpeed,
                    'total_distance' => 0,
                ];
                $lastMovingLocation = $location;
                $prevLocation = $location;
                continue;
            }

            // Add to current trip if moving
            if ($isMoving && $currentTrip) {
                $currentTrip['route_coordinates'][] = [$location->longitude, $location->latitude];
                $currentTrip['max_speed'] = max($currentTrip['max_speed'], $effectiveSpeed);
                
                // Calculate distance from last location
                if ($lastMovingLocation) {
                    $distance = $this->haversineDistance(
                        [(float) $lastMovingLocation->latitude, (float) $lastMovingLocation->longitude],
                        [(float) $location->latitude, (float) $location->longitude]
                    );
                    $currentTrip['total_distance'] += $distance / 1000; // Convert to km
                }
                
                $lastMovingLocation = $location;
                $lastStopStart = null;
                $prevLocation = $location;
                continue;
            }

            // Handle stop
            if (!$isMoving && $currentTrip) {
                if (!$lastStopStart) {
                    $lastStopStart = $location->recorded_at;
                }

                $nextLocation = $locations->get($index + 1);
                
                // Check if stop duration is significant
                if ($nextLocation) {
                    $stopDuration = $lastStopStart->diffInSeconds($nextLocation->recorded_at);
                    
                    if ($stopDuration >= self::MIN_STOP_DURATION) {
                        $stops[] = [
                            'latitude' => $location->latitude,
                            'longitude' => $location->longitude,
                            'started_at' => $lastStopStart->toISOString(),
                            'duration' => $stopDuration,
                        ];
                    }
                }

                // End trip if gap is too long or it's the last location
                $shouldEndTrip = false;
                
                if ($nextLocation) {
                    $gap = $location->recorded_at->diffInSeconds($nextLocation->recorded_at);
                    $shouldEndTrip = $gap >= self::MAX_TRIP_GAP;
                } else {
                    $shouldEndTrip = true;
                }

                if ($shouldEndTrip && $lastMovingLocation) {
                    $this->saveTrip($currentTrip, $lastMovingLocation, $stops);
                    $currentTrip = null;
                    $stops = [];
                    $lastMovingLocation = null;
                    $lastStopStart = null;
                }
            }

            $prevLocation = $location;
        }

        // Save any remaining trip
        if ($currentTrip && $lastMovingLocation) {
            $this->saveTrip($currentTrip, $lastMovingLocation, $stops);
        }
    }

    private function saveTrip(array $tripData, Location $endLocation, array $stops): void
    {
        $duration = Carbon::parse($tripData['started_at'])->diffInSeconds($endLocation->recorded_at);
        $idleDuration = collect($stops)->sum('duration');

        Trip::create([
            'vehicle_id' => $tripData['vehicle_id'],
            'tracker_id' => $tripData['tracker_id'],
            'organization_id' => $tripData['organization_id'],
            'started_at' => $tripData['started_at'],
            'ended_at' => $endLocation->recorded_at,
            'start_latitude' => $tripData['start_latitude'],
            'start_longitude' => $tripData['start_longitude'],
            'end_latitude' => $endLocation->latitude,
            'end_longitude' => $endLocation->longitude,
            'distance' => round($tripData['total_distance'], 2),
            'duration' => $duration,
            'idle_duration' => $idleDuration,
            'max_speed' => $tripData['max_speed'],
            'average_speed' => $duration > 0 ? round(($tripData['total_distance'] / $duration) * 3600, 2) : 0,
            'stops_count' => count($stops),
            'route_coordinates' => $tripData['route_coordinates'],
            'stops' => $stops,
        ]);
    }

    private function calculateSpeedFromDelta(?Location $from, Location $to): float
    {
        if ($from === null) {
            return 0.0;
        }

        $distance = $this->haversineDistance(
            [(float) $from->latitude, (float) $from->longitude],
            [(float) $to->latitude, (float) $to->longitude]
        );

        $timeDiff = Carbon::parse($from->recorded_at)->diffInSeconds($to->recorded_at);

        if ($timeDiff <= 0) {
            return 0.0;
        }

        return ($distance / $timeDiff) * 3.6; // m/s → km/h
    }

    private function haversineDistance(array $coords1, array $coords2): float
    {
        $earthRadius = 6371000; // meters

        $lat1 = deg2rad($coords1[0]);
        $lon1 = deg2rad($coords1[1]);
        $lat2 = deg2rad($coords2[0]);
        $lon2 = deg2rad($coords2[1]);

        $latDiff = $lat2 - $lat1;
        $lonDiff = $lon2 - $lon1;

        $a = sin($latDiff / 2) ** 2 + cos($lat1) * cos($lat2) * sin($lonDiff / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }
}
