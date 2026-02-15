<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class Trip extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'vehicle_id',
        'tracker_id',
        'started_at',
        'ended_at',
        'start_latitude',
        'start_longitude',
        'start_address',
        'end_latitude',
        'end_longitude',
        'end_address',
        'distance',
        'duration',
        'idle_duration',
        'max_speed',
        'average_speed',
        'stops_count',
        'route_coordinates',
        'stops',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'start_latitude' => 'decimal:8',
        'start_longitude' => 'decimal:8',
        'end_latitude' => 'decimal:8',
        'end_longitude' => 'decimal:8',
        'distance' => 'decimal:2',
        'duration' => 'integer',
        'idle_duration' => 'integer',
        'max_speed' => 'decimal:2',
        'average_speed' => 'decimal:2',
        'stops_count' => 'integer',
        'route_coordinates' => 'array',
        'stops' => 'array',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function tracker(): BelongsTo
    {
        return $this->belongsTo(Tracker::class);
    }

    public function scopeForOrganization($query, int $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    public function scopeForVehicle($query, int $vehicleId)
    {
        return $query->where('vehicle_id', $vehicleId);
    }

    public function scopeInTimeRange($query, $startDate, $endDate)
    {
        // Add end of day to endDate to include all trips on that date
        $endDateTime = Carbon::parse($endDate)->endOfDay();
        return $query->whereBetween('started_at', [$startDate, $endDateTime]);
    }

    public function scopeCompleted($query)
    {
        return $query->whereNotNull('ended_at');
    }

    public function scopeActive($query)
    {
        return $query->whereNull('ended_at');
    }
}
