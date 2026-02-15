<?php

namespace Database\Factories;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

class TrackerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'device_id' => 'TRK' . fake()->unique()->numerify('######'),
            'name' => fake()->words(2, true),
            'type' => fake()->randomElement(['gps', 'mobile', 'beacon']),
            'manufacturer' => fake()->randomElement(['Teltonika', 'Queclink', 'Concox']),
            'model' => fake()->bothify('??-###'),
            'is_active' => true,
        ];
    }
}
