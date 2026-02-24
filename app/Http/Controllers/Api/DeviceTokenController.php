<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeviceToken;
use Illuminate\Http\Request;

class DeviceTokenController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required|string',
            'platform' => 'required|in:web,ios,android',
            'device_name' => 'nullable|string|max:255',
        ]);

        $token = DeviceToken::updateOrCreate(
            ['user_id' => $request->user()->id, 'token' => $validated['token']],
            ['platform' => $validated['platform'], 'device_name' => $validated['device_name'] ?? null, 'last_used_at' => now()]
        );

        return response()->json($token, 201);
    }

    public function destroy(Request $request, string $token)
    {
        DeviceToken::where('user_id', $request->user()->id)->where('token', $token)->delete();
        return response()->json(null, 204);
    }
}
