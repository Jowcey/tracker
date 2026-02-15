<?php

namespace Database\Factories;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class OrganizationFactory extends Factory
{
    protected $model = Organization::class;

    public function definition(): array
    {
        $name = fake()->company();
        
        return [
            'name' => $name,
            'slug' => Str::slug($name) . '-' . fake()->unique()->randomNumber(4),
            'description' => fake()->catchPhrase(),
            'timezone' => fake()->randomElement(['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo']),
            'locale' => fake()->randomElement(['en', 'es', 'fr', 'de']),
            'settings' => [
                'max_users' => fake()->numberBetween(5, 100),
                'max_vehicles' => fake()->numberBetween(10, 500),
            ],
            'is_active' => true,
        ];
    }
}
