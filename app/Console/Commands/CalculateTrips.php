<?php

namespace App\Console\Commands;

use App\Jobs\CalculateTripsJob;
use App\Models\Vehicle;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CalculateTrips extends Command
{
    protected $signature = 'app:calculate-trips 
                            {vehicle? : The vehicle ID to calculate trips for}
                            {--start= : Start date (YYYY-MM-DD)}
                            {--end= : End date (YYYY-MM-DD)}
                            {--all : Calculate for all vehicles}';

    protected $description = 'Calculate trips for vehicles based on location history';

    public function handle(): int
    {
        $vehicleId = $this->argument('vehicle');
        $all = $this->option('all');
        $start = $this->option('start') ? Carbon::parse($this->option('start'))->startOfDay() : now()->subDay();
        $end = $this->option('end') ? Carbon::parse($this->option('end'))->endOfDay() : now();

        if (!$vehicleId && !$all) {
            $this->error('Please specify a vehicle ID or use --all flag');
            return self::FAILURE;
        }

        $vehicles = $all 
            ? Vehicle::where('is_active', true)->get()
            : Vehicle::where('id', $vehicleId)->get();

        if ($vehicles->isEmpty()) {
            $this->error('No vehicles found');
            return self::FAILURE;
        }

        $this->info("Calculating trips from {$start->toDateString()} to {$end->toDateString()}");

        foreach ($vehicles as $vehicle) {
            $this->info("Dispatching job for vehicle: {$vehicle->name} (ID: {$vehicle->id})");
            CalculateTripsJob::dispatch($vehicle->id, $start, $end);
        }

        $this->info('Trip calculation jobs dispatched successfully');
        return self::SUCCESS;
    }
}
