<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceReminder extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id', 'vehicle_id', 'type', 'description',
        'due_at_km', 'due_at_date', 'last_serviced_at_km',
        'last_serviced_at_date', 'is_resolved', 'resolved_at',
    ];

    protected $casts = [
        'due_at_date' => 'date',
        'last_serviced_at_date' => 'date',
        'resolved_at' => 'datetime',
        'is_resolved' => 'boolean',
    ];

    public function vehicle(): BelongsTo { return $this->belongsTo(Vehicle::class); }
    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
}
