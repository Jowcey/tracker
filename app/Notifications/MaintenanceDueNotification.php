<?php
namespace App\Notifications;

use App\Models\MaintenanceReminder;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class MaintenanceDueNotification extends Notification
{
    use Queueable;

    public function __construct(public MaintenanceReminder $reminder) {}

    public function via(object $notifiable): array { return ['database']; }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'maintenance_due',
            'reminder_id' => $this->reminder->id,
            'vehicle_id' => $this->reminder->vehicle_id,
            'vehicle_name' => $this->reminder->vehicle?->name,
            'description' => $this->reminder->description,
            'message' => sprintf(
                'Maintenance due: %s for %s',
                $this->reminder->description,
                $this->reminder->vehicle?->name ?? 'a vehicle'
            ),
        ];
    }
}
