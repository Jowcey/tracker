<?php
namespace App\Notifications;

use App\Models\Driver;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class WorkingHoursNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Driver $driver,
        public float $totalHours,
        public string $violationType,
        public string $date
    ) {}

    public function via(object $notifiable): array { return ['database']; }

    public function toArray(object $notifiable): array
    {
        $message = $this->violationType === 'daily'
            ? sprintf('%s has driven %.1f hours today (limit: 9 hours)', $this->driver->name, $this->totalHours)
            : sprintf('%s has driven %.1f continuous hours without a break', $this->driver->name, $this->totalHours);

        return [
            'type' => 'working_hours',
            'driver_id' => $this->driver->id,
            'driver_name' => $this->driver->name,
            'total_hours' => $this->totalHours,
            'violation_type' => $this->violationType,
            'date' => $this->date,
            'message' => $message,
        ];
    }
}
