<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LocationUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $trackerId,
        public int $organizationId,
        public float $latitude,
        public float $longitude,
        public ?float $heading,
        public ?float $speed,
        public string $recordedAt
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel("organization.{$this->organizationId}.locations");
    }

    public function broadcastAs(): string
    {
        return 'location.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'tracker_id' => $this->trackerId,
            'lat' => $this->latitude,
            'lng' => $this->longitude,
            'heading' => $this->heading,
            'speed' => $this->speed,
            'recorded_at' => $this->recordedAt,
        ];
    }
}
