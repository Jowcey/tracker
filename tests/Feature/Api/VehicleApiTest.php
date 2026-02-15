<?php

namespace Tests\Feature\Api;

use App\Models\Organization;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\Tracker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VehicleApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Organization $organization;

    protected function setUp(): void
    {
        parent::setUp();

        $this->organization = Organization::factory()->create();
        $this->user = User::factory()->create();
        $this->organization->users()->attach($this->user, ['role' => 'admin']);
    }

    public function test_can_list_vehicles()
    {
        Vehicle::factory(3)->create(['organization_id' => $this->organization->id]);

        $response = $this->actingAs($this->user)
            ->getJson("/api/organizations/{$this->organization->id}/vehicles");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'type', 'organization_id']
                ]
            ]);
    }

    public function test_can_create_vehicle()
    {
        $tracker = Tracker::factory()->create(['organization_id' => $this->organization->id]);

        $vehicleData = [
            'name' => 'Test Vehicle',
            'type' => 'vehicle',
            'tracker_id' => $tracker->id,
            'registration_number' => 'ABC-123',
            'make' => 'Toyota',
            'model' => 'Camry',
            'year' => 2024,
        ];

        $response = $this->actingAs($this->user)
            ->postJson("/api/organizations/{$this->organization->id}/vehicles", $vehicleData);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Test Vehicle']);

        $this->assertDatabaseHas('vehicles', [
            'name' => 'Test Vehicle',
            'organization_id' => $this->organization->id,
        ]);
    }

    public function test_cannot_access_other_organization_vehicles()
    {
        $otherOrg = Organization::factory()->create();
        Vehicle::factory()->create(['organization_id' => $otherOrg->id]);

        $response = $this->actingAs($this->user)
            ->getJson("/api/organizations/{$otherOrg->id}/vehicles");

        $response->assertStatus(403);
    }

    public function test_viewer_cannot_create_vehicle()
    {
        $viewer = User::factory()->create();
        $this->organization->users()->attach($viewer, ['role' => 'viewer']);

        $vehicleData = [
            'name' => 'Test Vehicle',
            'type' => 'vehicle',
        ];

        $response = $this->actingAs($viewer)
            ->postJson("/api/organizations/{$this->organization->id}/vehicles", $vehicleData);

        $response->assertStatus(403);
    }
}
