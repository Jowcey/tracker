<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Location;

class LocationPolicy
{
    public function viewAny(User $user, int $organizationId): bool
    {
        return $user->organizations()->where('organizations.id', $organizationId)->exists();
    }

    public function view(User $user, Location $location): bool
    {
        return $user->organizations()->where('organizations.id', $location->organization_id)->exists();
    }

    public function create(User $user, int $organizationId): bool
    {
        // Locations are typically created by trackers/system, but allow managers+ to manually add
        return $user->hasAnyRole($organizationId, ['owner', 'admin', 'manager']);
    }
}
