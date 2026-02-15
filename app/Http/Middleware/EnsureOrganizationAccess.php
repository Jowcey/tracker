<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOrganizationAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $organizationId = $request->route('organization');
        
        if (!$organizationId) {
            return response()->json(['message' => 'Organization ID is required'], 400);
        }

        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Check if user belongs to the organization
        if (!$user->organizations()->where('organizations.id', $organizationId)->exists()) {
            return response()->json(['message' => 'Access denied to this organization'], 403);
        }

        // Attach organization to request for easy access
        $request->merge(['current_organization_id' => $organizationId]);

        return $next($request);
    }
}
