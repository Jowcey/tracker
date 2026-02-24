<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request, int $organizationId)
    {
        $org = $request->user()->organizations()->findOrFail($organizationId);

        $role = $org->pivot->role ?? 'viewer';
        if (!in_array($role, ['owner', 'admin'])) {
            abort(403, 'Only admins can view audit logs.');
        }

        $query = AuditLog::where('organization_id', $organizationId)
            ->with('user')
            ->orderByDesc('created_at');

        if ($request->filled('event')) {
            $query->where('event', 'like', '%' . $request->event . '%');
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->to);
        }
        if ($request->filled('model')) {
            $query->where('auditable_type', 'like', '%' . $request->model . '%');
        }

        return $query->paginate(50);
    }
}
