<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Tracker extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'device_id',
        'name',
        'type',
        'manufacturer',
        'model',
        'sim_number',
        'phone_number',
        'last_communication_at',
        'battery_level',
        'is_active',
        'settings',
    ];

    protected $casts = [
        'last_communication_at' => 'datetime',
        'battery_level' => 'decimal:2',
        'is_active' => 'boolean',
        'settings' => 'array',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function vehicle(): HasOne
    {
        return $this->hasOne(Vehicle::class);
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
}
