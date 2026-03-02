<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user()?->is_super_admin) {
            abort(403, 'Access denied. Super admin privileges required.');
        }

        return $next($request);
    }
}
