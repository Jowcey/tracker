<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class OrganizationApiKey extends Model
{
    protected $fillable = [
        'organization_id',
        'name',
        'key_hash',
        'prefix',
        'created_by',
        'last_used_at',
        'revoked_at',
    ];

    protected $casts = [
        'last_used_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    protected $hidden = [
        'key_hash',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public static function generateKey(string $prefix = 'trk_live_'): string
    {
        return $prefix . Str::random(32);
    }

    public static function hashKey(string $key): string
    {
        return hash('sha256', $key);
    }

    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }

    public function markAsUsed(): void
    {
        $this->last_used_at = now();
        $this->save();
    }
}
