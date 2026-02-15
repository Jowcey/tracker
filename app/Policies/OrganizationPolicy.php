<?php

namespace App\Policies;

use App\Models\Organization;
use App\Models\User;

class OrganizationPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Organization $organization): bool
    {
        return $user->organizations()->where('organizations.id', $organization->id)->exists();
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Organization $organization): bool
    {
        return $user->hasRole($organization, ['owner', 'admin']);
    }

    public function delete(User $user, Organization $organization): bool
    {
        return $user->hasRole($organization, 'owner');
    }

    public function manageUsers(User $user, Organization $organization): bool
    {
        return $user->hasRole($organization, ['owner', 'admin']);
    }

    public function viewApiKeys(User $user, Organization $organization): bool
    {
        return $user->hasAnyRole($organization->id, ['owner', 'admin', 'manager']);
    }

    public function manageApiKeys(User $user, Organization $organization): bool
    {
        return $user->hasAnyRole($organization->id, ['owner', 'admin']);
    }
}
