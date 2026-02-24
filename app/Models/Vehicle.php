<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vehicle extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'tracker_id',
        'name',
        'type',
        'registration_number',
        'make',
        'model',
        'year',
        'color',
        'vin',
        'metadata',
        'is_active',
    ];

    protected $casts = [
        'metadata' => 'array',
        'is_active' => 'boolean',
        'year' => 'integer',
    ];

    protected $appends = ['latest_location'];

    public function getLatestLocationAttribute()
    {
        return $this->tracker?->latestLocation;
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function tracker(): BelongsTo
    {
        return $this->belongsTo(Tracker::class);
    }

    public function locations(): HasMany
    {
        return $this->hasMany(Location::class);
    }

    public function trips(): HasMany
    {
        return $this->hasMany(Trip::class);
    }

    public function scopeForOrganization($query, int $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function latestLocation()
    {
        return $this->hasOne(Location::class)->latestOfMany('recorded_at');
    }

    public function trackers()
    {
        return $this->belongsToMany(Tracker::class, 'vehicle_trackers')
            ->withPivot('role', 'assigned_at')
            ->withTimestamps();
    }

    public function getOdometerKmAttribute(): float
    {
        return (float) $this->trips()->sum('distance');
    }
}
