<?php

namespace App\Http\Middleware;

use App\Models\OrganizationApiKey;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = $request->header('X-API-Key') ?? $request->input('api_key');

        if (! $apiKey) {
            return response()->json([
                'message' => 'API key is required. Provide it via X-API-Key header or api_key parameter.'
            ], 401);
        }

        $keyHash = OrganizationApiKey::hashKey($apiKey);
        $apiKeyRecord = OrganizationApiKey::where('key_hash', $keyHash)
            ->whereNull('revoked_at')
            ->first();

        if (! $apiKeyRecord) {
            return response()->json([
                'message' => 'Invalid or revoked API key.'
            ], 401);
        }

        // Attach organization to request
        $request->attributes->set('api_organization_id', $apiKeyRecord->organization_id);
        $request->attributes->set('api_key_record', $apiKeyRecord);

        // Mark as used (async to avoid slowing down request)
        dispatch(function () use ($apiKeyRecord) {
            $apiKeyRecord->markAsUsed();
        })->afterResponse();

        return $next($request);
    }
}
