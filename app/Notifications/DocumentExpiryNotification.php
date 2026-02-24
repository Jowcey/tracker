<?php
namespace App\Notifications;

use App\Models\VehicleDocument;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DocumentExpiryNotification extends Notification
{
    use Queueable;

    public function __construct(public VehicleDocument $document) {}

    public function via(object $notifiable): array { return ['database']; }

    public function toArray(object $notifiable): array
    {
        $days = $this->document->days_until_expiry;
        $status = $days <= 0 ? 'expired' : ('expiring in ' . $days . ' days');

        return [
            'type' => 'document_expiry',
            'document_id' => $this->document->id,
            'vehicle_id' => $this->document->vehicle_id,
            'vehicle_name' => $this->document->vehicle?->name,
            'document_title' => $this->document->title,
            'document_type' => $this->document->type,
            'expiry_date' => $this->document->expiry_date?->toDateString(),
            'days_until_expiry' => $days,
            'message' => sprintf('%s: %s %s', $this->document->vehicle?->name ?? 'Vehicle', $this->document->title, $status),
        ];
    }
}
