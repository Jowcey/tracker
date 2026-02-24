<?php
namespace App\Services;

use App\Models\Geofence;
use App\Models\GeofenceEvent;
use App\Models\Location;
use App\Notifications\GeofenceAlertNotification;
use App\Notifications\SpeedAlertNotification;
use Illuminate\Support\Facades\Cache;

class GeofenceService
{
    public function checkLocation(Location $location): void
    {
        if (!$location->vehicle_id) {
            return;
        }

        $geofences = Geofence::forOrganization($location->organization_id)
            ->active()
            ->get();

        foreach ($geofences as $geofence) {
            $isInside = $geofence->type === 'circle'
                ? $this->isInsideCircle($location, $geofence)
                : $this->isInsidePolygon($location, $geofence);

            $cacheKey = "geofence_state.{$geofence->id}.vehicle.{$location->vehicle_id}";
            $wasInside = Cache::get($cacheKey);

            if ($wasInside === null) {
                // First check — just record state, no event
                Cache::put($cacheKey, $isInside, 3600);
                continue;
            }

            if ($isInside && !$wasInside) {
                $this->recordEvent($location, $geofence, 'enter');
            } elseif (!$isInside && $wasInside) {
                $this->recordEvent($location, $geofence, 'exit');
            }

            // Check speed limit if vehicle is inside geofence and geofence has a speed limit
            if ($isInside && $geofence->speed_limit_kmh !== null && ($location->speed ?? 0) > $geofence->speed_limit_kmh) {
                $this->notifySpeedAlert($location, $location->speed, $geofence->speed_limit_kmh);
            }

            Cache::put($cacheKey, $isInside, 3600);
        }
    }

    private function recordEvent(Location $location, Geofence $geofence, string $type): void
    {
        GeofenceEvent::create([
            'organization_id' => $location->organization_id,
            'geofence_id' => $geofence->id,
            'vehicle_id' => $location->vehicle_id,
            'tracker_id' => $location->tracker_id,
            'type' => $type,
            'latitude' => $location->latitude,
            'longitude' => $location->longitude,
            'recorded_at' => $location->recorded_at,
        ]);

        // Notify organization users
        $geofence->organization->users->each(function ($user) use ($geofence, $type, $location) {
            $user->notify(new GeofenceAlertNotification($geofence, $type, $location));
        });
    }

    private function notifySpeedAlert(Location $location, float $speed, float $speedLimit): void
    {
        $cacheKey = "geofence_speed_alert.vehicle.{$location->vehicle_id}";
        if (!Cache::has($cacheKey)) {
            $location->load('vehicle.organization.users');
            $location->vehicle?->organization?->users?->each(function ($user) use ($location, $speed, $speedLimit) {
                $user->notify(new SpeedAlertNotification($location, $speed, $speedLimit));
            });
            Cache::put($cacheKey, true, 300); // 5 min cooldown
        }
    }

    private function isInsideCircle(Location $location, Geofence $geofence): bool
    {
        $distance = $this->haversineDistance(
            [(float) $location->latitude, (float) $location->longitude],
            [(float) $geofence->center_latitude, (float) $geofence->center_longitude]
        );
        return $distance <= $geofence->radius;
    }

    private function isInsidePolygon(Location $location, Geofence $geofence): bool
    {
        $coords = $geofence->coordinates;
        if (empty($coords)) return false;

        $lat = (float) $location->latitude;
        $lng = (float) $location->longitude;
        $inside = false;
        $n = count($coords);

        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            $xi = $coords[$i][0]; $yi = $coords[$i][1];
            $xj = $coords[$j][0]; $yj = $coords[$j][1];

            $intersect = (($yi > $lat) !== ($yj > $lat))
                && ($lng < ($xj - $xi) * ($lat - $yi) / ($yj - $yi) + $xi);
            if ($intersect) $inside = !$inside;
        }

        return $inside;
    }

    private function haversineDistance(array $c1, array $c2): float
    {
        $R = 6371000;
        $lat1 = deg2rad($c1[0]); $lon1 = deg2rad($c1[1]);
        $lat2 = deg2rad($c2[0]); $lon2 = deg2rad($c2[1]);
        $a = sin(($lat2-$lat1)/2)**2 + cos($lat1)*cos($lat2)*sin(($lon2-$lon1)/2)**2;
        return $R * 2 * atan2(sqrt($a), sqrt(1-$a));
    }
}
