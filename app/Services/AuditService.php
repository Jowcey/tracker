<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditService
{
    public static function log(
        string $event,
        ?Model $auditable = null,
        array $oldValues = [],
        array $newValues = [],
        ?string $description = null,
        ?int $organizationId = null
    ): AuditLog {
        $user = Auth::user();
        $request = app(Request::class);

        return AuditLog::create([
            'organization_id' => $organizationId ?? (method_exists($auditable, 'getAttributeValue') ? $auditable?->organization_id : null),
            'user_id' => $user?->id,
            'user_name' => $user?->name,
            'event' => $event,
            'auditable_type' => $auditable ? get_class($auditable) : null,
            'auditable_id' => $auditable?->id,
            'old_values' => $oldValues ?: null,
            'new_values' => $newValues ?: null,
            'ip_address' => $request->ip(),
            'user_agent' => substr($request->userAgent() ?? '', 0, 500),
            'description' => $description,
        ]);
    }
}
