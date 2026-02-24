<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\TrackerController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\TripController;
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\OrganizationApiKeyController;
use App\Http\Controllers\Api\UserController;
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
        // API Keys
        Route::get('api-keys', [OrganizationApiKeyController::class, 'index']);
        Route::post('api-keys', [OrganizationApiKeyController::class, 'store']);
        Route::delete('api-keys/{key}', [OrganizationApiKeyController::class, 'destroy']);
        
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
        Route::get('trips/export', [\App\Http\Controllers\Api\TripController::class, 'export']);
        Route::get('trips/{trip}', [TripController::class, 'show']);
        Route::patch('trips/{trip}', [\App\Http\Controllers\Api\TripController::class, 'update']);
        Route::get('trips/{trip}/locations', [TripController::class, 'locations']);
        Route::get('vehicles/{vehicle}/trips', [TripController::class, 'index']);
        Route::post('vehicles/{vehicle}/trips/calculate', [TripController::class, 'calculate']);

        // Analytics
        Route::get('analytics', [\App\Http\Controllers\Api\AnalyticsController::class, 'summary']);

        // Geofences
        Route::apiResource('geofences', \App\Http\Controllers\Api\GeofenceController::class);

        // Maintenance
        Route::get('maintenance', [\App\Http\Controllers\Api\MaintenanceController::class, 'index']);
        Route::post('maintenance', [\App\Http\Controllers\Api\MaintenanceController::class, 'store']);
        Route::patch('maintenance/{reminder}', [\App\Http\Controllers\Api\MaintenanceController::class, 'update']);
        Route::delete('maintenance/{reminder}', [\App\Http\Controllers\Api\MaintenanceController::class, 'destroy']);

        // Vehicle trackers (multi-tracker)
        Route::post('vehicles/{vehicle}/trackers/{tracker}', [\App\Http\Controllers\Api\VehicleController::class, 'assignTracker']);
        Route::delete('vehicles/{vehicle}/trackers/{tracker}', [\App\Http\Controllers\Api\VehicleController::class, 'unassignTracker']);
    });
});

// Public tracker endpoint (for GPS devices to post location data)
Route::post('/tracker/location', [LocationController::class, 'storeFromDevice'])
    ->middleware(['throttle:60,1', 'api.key']); // API key authentication

// Notifications
Route::middleware('auth:sanctum')->group(function () {
    Route::get('notifications', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::get('notifications/unread-count', [\App\Http\Controllers\Api\NotificationController::class, 'unreadCount']);
    Route::post('notifications/{id}/read', [\App\Http\Controllers\Api\NotificationController::class, 'markRead']);
    Route::post('notifications/read-all', [\App\Http\Controllers\Api\NotificationController::class, 'markAllRead']);

    // Device tokens for push notifications
    Route::post('me/device-tokens', [\App\Http\Controllers\Api\DeviceTokenController::class, 'store']);
    Route::delete('me/device-tokens/{token}', [\App\Http\Controllers\Api\DeviceTokenController::class, 'destroy']);
});

