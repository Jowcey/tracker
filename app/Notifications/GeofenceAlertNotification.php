<?php
namespace App\Notifications;

use App\Models\Geofence;
use App\Models\Location;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class GeofenceAlertNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Geofence $geofence,
        public string $eventType, // 'enter' or 'exit'
        public Location $location,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $vehicle = $this->location->vehicle;
        return [
            'type' => 'geofence_alert',
            'event' => $this->eventType,
            'geofence_id' => $this->geofence->id,
            'geofence_name' => $this->geofence->name,
            'vehicle_id' => $this->location->vehicle_id,
            'vehicle_name' => $vehicle?->name,
            'recorded_at' => $this->location->recorded_at?->toISOString(),
            'message' => sprintf(
                '%s %s geofence "%s"',
                $vehicle?->name ?? 'A vehicle',
                $this->eventType === 'enter' ? 'entered' : 'exited',
                $this->geofence->name
            ),
        ];
    }
}
