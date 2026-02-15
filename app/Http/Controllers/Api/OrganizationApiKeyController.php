<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrganizationApiKey;
use Illuminate\Http\Request;

class OrganizationApiKeyController extends Controller
{
    public function index(Request $request, $organizationId)
    {
        $this->authorize("viewApiKeys", $request->user()->organizations()->findOrFail($organizationId));

        $apiKeys = OrganizationApiKey::where("organization_id", $organizationId)
            ->whereNull("revoked_at")
            ->with("creator:id,name")
            ->latest()
            ->get();

        return response()->json([
            "data" => $apiKeys
        ]);
    }

    public function store(Request $request, $organizationId)
    {
        $organization = $request->user()->organizations()->findOrFail($organizationId);
        $this->authorize("manageApiKeys", $organization);

        $validated = $request->validate([
            "name" => "required|string|max:255",
            "prefix" => "sometimes|string|in:trk_live_,trk_test_",
        ]);

        $prefix = $validated["prefix"] ?? "trk_live_";
        $plainKey = OrganizationApiKey::generateKey($prefix);
        $keyHash = OrganizationApiKey::hashKey($plainKey);

        $apiKey = OrganizationApiKey::create([
            "organization_id" => $organizationId,
            "name" => $validated["name"],
            "key_hash" => $keyHash,
            "prefix" => $prefix,
            "created_by" => $request->user()->id,
        ]);

        return response()->json([
            "message" => "API key created successfully. Make sure to copy it now - you will not be able to see it again!",
            "api_key" => $apiKey,
            "plain_key" => $plainKey,
        ], 201);
    }

    public function destroy(Request $request, $organizationId, $keyId)
    {
        $organization = $request->user()->organizations()->findOrFail($organizationId);
        $this->authorize("manageApiKeys", $organization);

        $apiKey = OrganizationApiKey::where("organization_id", $organizationId)
            ->where("id", $keyId)
            ->firstOrFail();

        $apiKey->update(["revoked_at" => now()]);

        return response()->json([
            "message" => "API key revoked successfully"
        ]);
    }
}
