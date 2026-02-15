<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Vehicle;

class VehiclePolicy
{
    public function viewAny(User $user, int $organizationId): bool
    {
        return $user->organizations()->where('organizations.id', $organizationId)->exists();
    }

    public function view(User $user, Vehicle $vehicle): bool
    {
        return $user->organizations()->where('organizations.id', $vehicle->organization_id)->exists();
    }

    public function create(User $user, int $organizationId): bool
    {
        return $user->hasAnyRole($organizationId, ['owner', 'admin', 'manager']);
    }

    public function update(User $user, Vehicle $vehicle): bool
    {
        return $user->hasAnyRole($vehicle->organization_id, ['owner', 'admin', 'manager']);
    }

    public function delete(User $user, Vehicle $vehicle): bool
    {
        return $user->hasAnyRole($vehicle->organization_id, ['owner', 'admin']);
    }

    public function restore(User $user, Vehicle $vehicle): bool
    {
        return $user->hasAnyRole($vehicle->organization_id, ['owner', 'admin']);
    }

    public function forceDelete(User $user, Vehicle $vehicle): bool
    {
        return $user->hasRole($vehicle->organization_id, 'owner');
    }
}
