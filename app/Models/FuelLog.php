<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FuelLog extends Model
{
    protected $fillable = [
        'organization_id', 'vehicle_id', 'driver_id',
        'litres', 'cost_per_litre', 'odometer_km',
        'full_tank', 'station', 'notes', 'filled_at',
    ];

    protected $casts = [
        'litres' => 'decimal:3',
        'cost_per_litre' => 'decimal:4',
        'odometer_km' => 'decimal:2',
        'full_tank' => 'boolean',
        'filled_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }

    public function getTotalCostAttribute(): float
    {
        return round((float)$this->litres * (float)$this->cost_per_litre, 2);
    }
}
