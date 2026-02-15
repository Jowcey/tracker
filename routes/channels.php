<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\User;

Broadcast::channel("App.Models.User.{id}", function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel("organization.{organizationId}", function (User $user, int $organizationId) {
    return $user->organizations()->where("organizations.id", $organizationId)->exists();
});
