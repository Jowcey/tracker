<?php

namespace Database\Factories;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

class VehicleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'name' => fake()->words(2, true),
            'type' => fake()->randomElement(['vehicle', 'person', 'asset']),
            'registration_number' => strtoupper(fake()->bothify('???-####')),
            'make' => fake()->randomElement(['Ford', 'Toyota', 'Chevrolet', 'Honda', 'Mercedes']),
            'model' => fake()->word(),
            'year' => fake()->numberBetween(2015, 2024),
            'color' => fake()->safeColorName(),
            'is_active' => true,
        ];
    }
}
