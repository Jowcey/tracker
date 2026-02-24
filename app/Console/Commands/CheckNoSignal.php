<?php
namespace App\Console\Commands;

use App\Models\Tracker;
use App\Models\Vehicle;
use App\Models\Organization;
use App\Notifications\NoSignalNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class CheckNoSignal extends Command
{
    protected $signature = 'tracker:check-no-signal';
    protected $description = 'Check for trackers with no signal for >30 minutes and notify';

    public function handle(): void
    {
        $threshold = now()->subMinutes(30);

        $trackers = Tracker::where('is_active', true)
            ->where('last_communication_at', '<', $threshold)
            ->with('organization.users')
            ->get();

        foreach ($trackers as $tracker) {
            $cacheKey = "no_signal_notified.{$tracker->id}";
            if (Cache::has($cacheKey)) continue;

            $vehicle = Vehicle::where('tracker_id', $tracker->id)->first();
            $minutes = (int) $tracker->last_communication_at?->diffInMinutes(now()) ?? 30;

            $org = $tracker->organization;
            if (!$org) continue;

            foreach ($org->users as $user) {
                $user->notify(new NoSignalNotification($tracker, $vehicle, $minutes));
            }

            Cache::put($cacheKey, true, now()->addHours(2));

            $this->info("Notified org {$org->id} about no signal from tracker {$tracker->id} ({$minutes} min)");
        }
    }
}
