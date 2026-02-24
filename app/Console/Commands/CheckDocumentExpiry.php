<?php
namespace App\Console\Commands;

use App\Models\VehicleDocument;
use App\Notifications\DocumentExpiryNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class CheckDocumentExpiry extends Command
{
    protected $signature = 'tracker:check-document-expiry';
    protected $description = 'Notify about vehicle documents expiring in 30 or 7 days';

    public function handle(): void
    {
        $thresholds = [30, 7, 0];

        foreach ($thresholds as $days) {
            $date = now()->addDays($days)->toDateString();

            $docs = VehicleDocument::whereDate('expiry_date', $date)
                ->where('is_active', true)
                ->with(['vehicle', 'organization.users'])
                ->get();

            foreach ($docs as $doc) {
                $cacheKey = "doc_expiry_notified.{$doc->id}.{$days}";
                if (Cache::has($cacheKey)) continue;

                foreach ($doc->organization->users as $user) {
                    $user->notify(new DocumentExpiryNotification($doc));
                }

                Cache::put($cacheKey, true, now()->addDays(2));
                $this->info("Notified about document {$doc->id} expiring in {$days} days");
            }
        }
    }
}
