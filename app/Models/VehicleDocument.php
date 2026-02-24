<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

class VehicleDocument extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'organization_id', 'vehicle_id', 'type', 'title',
        'issued_date', 'expiry_date', 'file_url', 'notes', 'is_active',
    ];

    protected $casts = [
        'issued_date' => 'date',
        'expiry_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function vehicle(): BelongsTo { return $this->belongsTo(Vehicle::class); }

    public function getExpiryStatusAttribute(): string
    {
        if (!$this->expiry_date) return 'no_expiry';
        if ($this->expiry_date->isPast()) return 'expired';
        if ($this->expiry_date->diffInDays(now()) <= 30) return 'expiring_soon';
        return 'valid';
    }

    public function getDaysUntilExpiryAttribute(): ?int
    {
        if (!$this->expiry_date) return null;
        return (int) now()->diffInDays($this->expiry_date, false);
    }
}
