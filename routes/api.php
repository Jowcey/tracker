<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\TrackerController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\TripController;
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\TraccarWebhookController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Organizations
    Route::apiResource('organizations', OrganizationController::class);
    Route::get('organizations/{organization}/users', [OrganizationController::class, 'users']);
    Route::post('organizations/{organization}/users', [OrganizationController::class, 'attachUser']);
    Route::put('organizations/{organization}/users/{user}', [OrganizationController::class, 'updateUserRole']);
    Route::delete('organizations/{organization}/users/{user}', [OrganizationController::class, 'detachUser']);

    // Users
    Route::apiResource('users', UserController::class)->only(['index', 'show', 'update', 'destroy']);
    Route::put('users/{user}/password', [UserController::class, 'updatePassword']);

    // Organization-scoped routes
    Route::prefix('organizations/{organization}')->middleware('organization')->group(function () {
        // Vehicles
        Route::apiResource('vehicles', VehicleController::class);
        
        // Trackers
        Route::apiResource('trackers', TrackerController::class);
        
        // Locations
        Route::get('locations', [LocationController::class, 'index']);
        Route::post('locations', [LocationController::class, 'store']);
        Route::get('vehicles/{vehicle}/locations', [LocationController::class, 'byVehicle']);
        Route::get('trackers/{tracker}/locations', [LocationController::class, 'byTracker']);
        
        // Trips
        Route::get('trips', [TripController::class, 'index']);
        Route::get('trips/{trip}', [TripController::class, 'show']);
        Route::get('trips/{trip}/locations', [TripController::class, 'locations']);
        Route::get('vehicles/{vehicle}/trips', [TripController::class, 'index']);
        Route::post('vehicles/{vehicle}/trips/calculate', [TripController::class, 'calculate']);
    });
});

// Public tracker endpoint (for GPS devices to post location data)
Route::post('/tracker/location', [LocationController::class, 'storeFromDevice'])
    ->middleware('throttle:60,1'); // 60 requests per minute

// Traccar webhook (for receiving positions from Traccar)
Route::post('/traccar/positions', [TraccarWebhookController::class, 'positions']);

