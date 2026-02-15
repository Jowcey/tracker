<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: false, // Disable default channels registration
        health: '/up',
        then: function () {
            // Manually register channels
            require __DIR__.'/../routes/channels.php';
            
            // Register broadcasting/auth with Sanctum auth  
            Route::post('/broadcasting/auth', [\Illuminate\Broadcasting\BroadcastController::class, 'authenticate'])
                ->middleware(['auth:sanctum']);
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'organization' => \App\Http\Middleware\EnsureOrganizationAccess::class,
            'api.key' => \App\Http\Middleware\AuthenticateApiKey::class,
        ]);
        
        // Exclude broadcasting/auth from CSRF verification
        $middleware->validateCsrfTokens(except: [
            'broadcasting/auth',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
