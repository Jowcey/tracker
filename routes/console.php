<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Calculate trips for all active vehicles every hour (defaults to last 24h)
Schedule::command('app:calculate-trips --all')
    ->hourly()
    ->withoutOverlapping()
    ->runInBackground();
