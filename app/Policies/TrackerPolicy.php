<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Tracker;

class TrackerPolicy
{
    public function viewAny(User $user, int $organizationId): bool
    {
        return $user->organizations()->where('organizations.id', $organizationId)->exists();
    }

    public function view(User $user, Tracker $tracker): bool
    {
        return $user->organizations()->where('organizations.id', $tracker->organization_id)->exists();
    }

    public function create(User $user, int $organizationId): bool
    {
        return $user->hasAnyRole($organizationId, ['owner', 'admin', 'manager']);
    }

    public function update(User $user, Tracker $tracker): bool
    {
        return $user->hasAnyRole($tracker->organization_id, ['owner', 'admin', 'manager']);
    }

    public function delete(User $user, Tracker $tracker): bool
    {
        return $user->hasAnyRole($tracker->organization_id, ['owner', 'admin']);
    }
}
