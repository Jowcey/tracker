<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function organizations()
    {
        return $this->belongsToMany(Organization::class)
            ->withPivot('role', 'joined_at')
            ->withTimestamps();
    }

    public function hasRole(int $organizationId, string $role): bool
    {
        return $this->organizations()
            ->wherePivot('organization_id', $organizationId)
            ->wherePivot('role', $role)
            ->exists();
    }

    public function hasAnyRole(int $organizationId, array $roles): bool
    {
        return $this->organizations()
            ->wherePivot('organization_id', $organizationId)
            ->whereIn('organization_user.role', $roles)
            ->exists();
    }
}
