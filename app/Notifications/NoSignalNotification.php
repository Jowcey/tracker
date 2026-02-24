<?php
namespace App\Notifications;

use App\Models\Tracker;
use App\Models\Vehicle;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NoSignalNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Tracker $tracker,
        public ?Vehicle $vehicle,
        public int $minutesSinceLastSignal
    ) {}

    public function via(object $notifiable): array { return ['database']; }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'no_signal',
            'tracker_id' => $this->tracker->id,
            'tracker_name' => $this->tracker->name,
            'vehicle_id' => $this->vehicle?->id,
            'vehicle_name' => $this->vehicle?->name,
            'minutes_since_signal' => $this->minutesSinceLastSignal,
            'message' => sprintf(
                'No signal from %s for %d minutes',
                $this->vehicle?->name ?? $this->tracker->name,
                $this->minutesSinceLastSignal
            ),
        ];
    }
}
