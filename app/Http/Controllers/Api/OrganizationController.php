<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OrganizationController extends Controller
{
    public function index(Request $request)
    {
        $organizations = $request->user()
            ->organizations()
            ->withPivot('role')
            ->get();

        return response()->json($organizations);
    }

    public function show(Organization $organization)
    {
        $this->authorize('view', $organization);

        return response()->json($organization);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:organizations,slug',
        ]);

        if (!isset($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $organization = Organization::create($validated);

        // Add creator as owner
        $organization->users()->attach($request->user()->id, ['role' => 'owner']);

        return response()->json($organization, 201);
    }

    public function update(Request $request, Organization $organization)
    {
        $this->authorize('update', $organization);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:255|unique:organizations,slug,' . $organization->id,
        ]);

        $organization->update($validated);

        return response()->json($organization);
    }

    public function destroy(Organization $organization)
    {
        $this->authorize('delete', $organization);

        $organization->delete();

        return response()->json(null, 204);
    }

    public function users(Organization $organization)
    {
        $this->authorize('view', $organization);

        $users = $organization->users()
            ->withPivot('role', 'created_at')
            ->get();

        return response()->json($users);
    }

    public function attachUser(Request $request, Organization $organization)
    {
        $this->authorize('manageUsers', $organization);

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role' => 'required|in:owner,admin,manager,viewer',
        ]);

        if ($organization->users()->where('user_id', $validated['user_id'])->exists()) {
            return response()->json(['message' => 'User already in organization'], 422);
        }

        $organization->users()->attach($validated['user_id'], ['role' => $validated['role']]);

        return response()->json(['message' => 'User added successfully'], 201);
    }

    public function updateUserRole(Request $request, Organization $organization, $userId)
    {
        $this->authorize('manageUsers', $organization);

        $validated = $request->validate([
            'role' => 'required|in:owner,admin,manager,viewer',
        ]);

        $organization->users()->updateExistingPivot($userId, ['role' => $validated['role']]);

        return response()->json(['message' => 'User role updated successfully']);
    }

    public function detachUser(Organization $organization, $userId)
    {
        $this->authorize('manageUsers', $organization);

        $organization->users()->detach($userId);

        return response()->json(['message' => 'User removed successfully']);
    }
}
