<?php

namespace App\Jobs;

use App\Models\Vehicle;
use App\Services\TripCalculationService;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class CalculateTripsJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $vehicleId,
        public Carbon $startDate,
        public Carbon $endDate
    ) {}

    public function handle(TripCalculationService $tripService): void
    {
        $tripService->calculateTrips(
            $this->vehicleId,
            $this->startDate,
            $this->endDate
        );
    }
}
