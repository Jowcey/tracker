<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GeofenceEvent extends Model
{
    protected $fillable = [
        'organization_id', 'geofence_id', 'vehicle_id', 'tracker_id',
        'type', 'latitude', 'longitude', 'recorded_at',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'recorded_at' => 'datetime',
    ];

    public function geofence(): BelongsTo { return $this->belongsTo(Geofence::class); }
    public function vehicle(): BelongsTo { return $this->belongsTo(Vehicle::class); }
    public function tracker(): BelongsTo { return $this->belongsTo(Tracker::class); }
    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
}
