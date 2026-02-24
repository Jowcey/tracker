<?php
namespace App\Notifications;

use App\Models\Location;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SpeedAlertNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Location $location,
        public float $speed,
        public float $threshold,
    ) {}

    public function via(object $notifiable): array { return ['database']; }

    public function toArray(object $notifiable): array
    {
        $vehicle = $this->location->vehicle;
        return [
            'type' => 'speed_alert',
            'vehicle_id' => $this->location->vehicle_id,
            'vehicle_name' => $vehicle?->name,
            'speed' => round($this->speed),
            'threshold' => round($this->threshold),
            'recorded_at' => $this->location->recorded_at?->toISOString(),
            'message' => sprintf(
                '%s exceeded speed limit: %d km/h (limit: %d km/h)',
                $vehicle?->name ?? 'A vehicle',
                round($this->speed),
                round($this->threshold)
            ),
        ];
    }
}
