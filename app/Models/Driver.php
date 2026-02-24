<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Driver extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'organization_id', 'user_id', 'name', 'license_number',
        'phone', 'avatar_url', 'notes', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function trips(): BelongsToMany
    {
        return $this->belongsToMany(Trip::class, 'driver_trip')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function getAverageScoreAttribute(): ?float
    {
        $avg = $this->trips()->whereNotNull('driver_score')->avg('driver_score');
        return $avg ? round($avg, 1) : null;
    }

    public function getTotalDistanceAttribute(): float
    {
        return round($this->trips()->sum('distance'), 1);
    }
}
