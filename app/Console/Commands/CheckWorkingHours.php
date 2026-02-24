<?php
namespace App\Console\Commands;

use App\Models\Driver;
use App\Models\Trip;
use App\Notifications\WorkingHoursNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

class CheckWorkingHours extends Command
{
    protected $signature = 'tracker:check-working-hours';
    protected $description = 'Check for drivers exceeding daily/continuous driving limits';

    const DAILY_LIMIT_HOURS = 9;
    const CONTINUOUS_LIMIT_HOURS = 4.5;

    public function handle(): void
    {
        $today = now()->toDateString();

        $drivers = Driver::where('is_active', true)
            ->with('organization.users')
            ->get();

        foreach ($drivers as $driver) {
            $trips = $driver->trips()
                ->whereDate('started_at', $today)
                ->orderBy('started_at')
                ->get();

            if ($trips->isEmpty()) continue;

            $totalSeconds = $trips->sum('duration');
            $totalHours = $totalSeconds / 3600;

            // Check daily limit
            if ($totalHours > self::DAILY_LIMIT_HOURS) {
                $cacheKey = "working_hours_daily.{$driver->id}.{$today}";
                if (!Cache::has($cacheKey)) {
                    $this->notifyDriver($driver, $totalHours, 'daily', $today);
                    Cache::put($cacheKey, true, now()->addHours(12));
                }
            }

            // Check continuous driving (longest unbroken stretch)
            $maxContinuous = 0;
            $currentStretch = 0;
            $prevEnd = null;

            foreach ($trips as $trip) {
                if ($prevEnd && Carbon::parse($trip->started_at)->diffInMinutes($prevEnd) > 15) {
                    $currentStretch = 0;
                }
                $currentStretch += $trip->duration / 3600;
                $maxContinuous = max($maxContinuous, $currentStretch);
                $prevEnd = $trip->ended_at;
            }

            if ($maxContinuous > self::CONTINUOUS_LIMIT_HOURS) {
                $cacheKey = "working_hours_continuous.{$driver->id}.{$today}";
                if (!Cache::has($cacheKey)) {
                    $this->notifyDriver($driver, $maxContinuous, 'continuous', $today);
                    Cache::put($cacheKey, true, now()->addHours(6));
                }
            }
        }
    }

    private function notifyDriver(Driver $driver, float $hours, string $type, string $date): void
    {
        $org = $driver->organization;
        if (!$org) return;

        foreach ($org->users as $user) {
            $user->notify(new WorkingHoursNotification($driver, round($hours, 1), $type, $date));
        }

        $this->info("Working hours {$type} violation: driver {$driver->id} ({$hours}h)");
    }
}
