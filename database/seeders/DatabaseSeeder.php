<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Organization;
use App\Models\Vehicle;
use App\Models\Tracker;
use App\Models\Location;
use App\Models\Geofence;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create organizations
        $org1 = Organization::factory()->create([
            'name' => 'Acme Logistics',
            'slug' => 'acme-logistics',
            'timezone' => 'America/New_York',
        ]);

        $org2 = Organization::factory()->create([
            'name' => 'Global Transport',
            'slug' => 'global-transport',
            'timezone' => 'Europe/London',
        ]);

        // Create users
        $admin = User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@tracker.local',
            'password' => Hash::make('password'),
        ]);

        $manager = User::factory()->create([
            'name' => 'Manager User',
            'email' => 'manager@tracker.local',
            'password' => Hash::make('password'),
        ]);

        $viewer = User::factory()->create([
            'name' => 'Viewer User',
            'email' => 'viewer@tracker.local',
            'password' => Hash::make('password'),
        ]);

        // Attach users to organizations with roles
        $org1->users()->attach($admin, ['role' => 'owner', 'joined_at' => now()]);
        $org1->users()->attach($manager, ['role' => 'manager', 'joined_at' => now()]);
        $org1->users()->attach($viewer, ['role' => 'viewer', 'joined_at' => now()]);

        $org2->users()->attach($admin, ['role' => 'admin', 'joined_at' => now()]);

        // Create trackers for org1
        $trackers = [];
        for ($i = 1; $i <= 5; $i++) {
            $trackers[] = Tracker::create([
                'organization_id' => $org1->id,
                'device_id' => 'TRK' . str_pad($i, 6, '0', STR_PAD_LEFT),
                'name' => "Tracker $i",
                'type' => 'gps',
                'manufacturer' => 'Teltonika',
                'model' => 'FMB920',
                'is_active' => true,
            ]);
        }

        // Create vehicles with trackers
        $vehicleTypes = ['car', 'truck', 'van', 'motorcycle'];
        $makes = ['Ford', 'Chevrolet', 'Toyota', 'Mercedes'];
        
        foreach ($trackers as $index => $tracker) {
            $vehicle = Vehicle::create([
                'organization_id' => $org1->id,
                'tracker_id' => $tracker->id,
                'name' => "Vehicle " . ($index + 1),
                'type' => 'vehicle',
                'registration_number' => strtoupper(fake()->bothify('???-####')),
                'make' => $makes[$index % count($makes)],
                'model' => fake()->word(),
                'year' => fake()->numberBetween(2018, 2024),
                'color' => fake()->safeColorName(),
                'is_active' => true,
            ]);

            // Create some location history (last 24 hours)
            $startLat = 40.7128 + (rand(-100, 100) / 1000);
            $startLng = -74.0060 + (rand(-100, 100) / 1000);

            for ($h = 24; $h >= 0; $h--) {
                Location::create([
                    'organization_id' => $org1->id,
                    'tracker_id' => $tracker->id,
                    'vehicle_id' => $vehicle->id,
                    'latitude' => $startLat + (rand(-50, 50) / 10000),
                    'longitude' => $startLng + (rand(-50, 50) / 10000),
                    'altitude' => rand(0, 500),
                    'speed' => rand(0, 80),
                    'heading' => rand(0, 359),
                    'accuracy' => rand(5, 20),
                    'satellites' => rand(4, 12),
                    'recorded_at' => now()->subHours($h),
                    'created_at' => now()->subHours($h),
                ]);
            }
        }

        // Create some geofences
        Geofence::create([
            'organization_id' => $org1->id,
            'name' => 'Main Office',
            'description' => 'Company headquarters',
            'type' => 'circle',
            'center_latitude' => 40.7128,
            'center_longitude' => -74.0060,
            'radius' => 500,
            'color' => '#3b82f6',
            'is_active' => true,
        ]);

        Geofence::create([
            'organization_id' => $org1->id,
            'name' => 'Warehouse District',
            'description' => 'Distribution center area',
            'type' => 'circle',
            'center_latitude' => 40.7589,
            'center_longitude' => -73.9851,
            'radius' => 1000,
            'color' => '#10b981',
            'is_active' => true,
        ]);

        $this->command->info('Database seeded successfully!');
        $this->command->info('Login credentials:');
        $this->command->info('Admin: admin@tracker.local / password');
        $this->command->info('Manager: manager@tracker.local / password');
        $this->command->info('Viewer: viewer@tracker.local / password');
    }
}
