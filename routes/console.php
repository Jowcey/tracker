<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Calculate trips for all active vehicles every 15 minutes (defaults to last 24h)
Schedule::command('app:calculate-trips --all')
    ->everyFifteenMinutes()
    ->withoutOverlapping()
    ->runInBackground();

Schedule::command('tracker:check-no-signal')->everyFiveMinutes();
Schedule::command('tracker:check-working-hours')->dailyAt('18:00');
Schedule::command('tracker:check-document-expiry')->dailyAt('09:00');
