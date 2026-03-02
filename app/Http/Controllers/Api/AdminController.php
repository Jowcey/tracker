<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    // ── Stats ─────────────────────────────────────────────────────────────────

    public function stats()
    {
        return response()->json([
            'organizations' => Organization::count(),
            'organizations_active' => Organization::where('is_active', true)->count(),
            'users' => User::count(),
            'users_super_admin' => User::where('is_super_admin', true)->count(),
        ]);
    }

    // ── Organizations ─────────────────────────────────────────────────────────

    public function organizations(Request $request)
    {
        $query = Organization::withTrashed()
            ->withCount(['users', 'vehicles', 'trackers', 'trips'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        return response()->json($query->paginate(25));
    }

    public function createOrganization(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'slug'        => 'nullable|string|max:255|unique:organizations,slug',
            'description' => 'nullable|string|max:2000',
            'timezone'    => 'nullable|string|max:100',
            'locale'      => 'nullable|string|max:10',
            'is_active'   => 'boolean',
            'settings'    => 'nullable|array',
            'settings.speed_unit' => 'sometimes|in:mph,kmh',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $organization = Organization::create($validated);
        $organization->loadCount(['users', 'vehicles', 'trackers', 'trips']);

        return response()->json($organization, 201);
    }

    public function showOrganization(Organization $organization)
    {
        $organization->loadCount(['users', 'vehicles', 'trackers', 'trips']);
        $organization->load(['users' => function ($q) {
            $q->withPivot('role', 'created_at')->orderBy('name');
        }]);

        return response()->json($organization);
    }

    public function updateOrganization(Request $request, Organization $organization)
    {
        $validated = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'slug'        => ['sometimes', 'string', 'max:255', Rule::unique('organizations', 'slug')->ignore($organization->id)],
            'description' => 'sometimes|nullable|string|max:2000',
            'timezone'    => 'sometimes|nullable|string|max:100',
            'locale'      => 'sometimes|nullable|string|max:10',
            'is_active'   => 'sometimes|boolean',
            'settings'    => 'sometimes|array',
            'settings.speed_unit' => 'sometimes|in:mph,kmh',
        ]);

        if (isset($validated['settings'])) {
            $validated['settings'] = array_merge($organization->settings ?? [], $validated['settings']);
        }

        $organization->update($validated);

        return response()->json($organization->fresh());
    }

    public function softDeleteOrganization(Organization $organization)
    {
        $organization->delete();

        return response()->json(null, 204);
    }

    public function deleteOrganization(int $id)
    {
        $organization = Organization::withTrashed()->findOrFail($id);
        $organization->forceDelete();

        return response()->json(null, 204);
    }

    public function restoreOrganization(int $id)
    {
        $organization = Organization::onlyTrashed()->findOrFail($id);
        $organization->restore();

        return response()->json($organization->fresh());
    }

    public function addOrganizationUser(Request $request, Organization $organization)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role'    => 'required|in:owner,admin,manager,viewer',
        ]);

        if ($organization->users()->where('users.id', $validated['user_id'])->exists()) {
            return response()->json(['message' => 'User is already a member.'], 422);
        }

        $organization->users()->attach($validated['user_id'], ['role' => $validated['role']]);

        return response()->json(['message' => 'User added successfully'], 201);
    }

    // ── Users ────────────────────────────────────────────────────────────────

    public function createUser(Request $request)
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'email'          => 'required|email|unique:users,email',
            'password'       => 'required|string|min:8',
            'is_super_admin' => 'boolean',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $validated['email_verified_at'] = now();

        $user = User::create($validated);
        $user->load('organizations');

        return response()->json($user, 201);
    }

    public function users(Request $request)
    {
        $query = User::with('organizations:id,name')
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('email', 'like', '%' . $request->search . '%');
            });
        }

        return response()->json($query->paginate(25));
    }

    public function showUser(User $user)
    {
        $user->load(['organizations' => function ($q) {
            $q->withPivot('role', 'created_at');
        }]);

        return response()->json($user);
    }

    public function updateUser(Request $request, User $user)
    {
        $validated = $request->validate([
            'name'               => 'sometimes|string|max:255',
            'email'              => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'password'           => 'sometimes|nullable|string|min:8',
            'is_super_admin'     => 'sometimes|boolean',
            'email_verified'     => 'sometimes|boolean',
        ]);

        if (array_key_exists('password', $validated)) {
            if ($validated['password']) {
                $validated['password'] = Hash::make($validated['password']);
            } else {
                unset($validated['password']);
            }
        }

        if (array_key_exists('email_verified', $validated)) {
            $validated['email_verified_at'] = $validated['email_verified'] ? now() : null;
            unset($validated['email_verified']);
        }

        // Guard: prevent removing the last super admin
        if (isset($validated['is_super_admin']) && !$validated['is_super_admin'] && $user->is_super_admin) {
            if (User::where('is_super_admin', true)->count() <= 1) {
                return response()->json(['message' => 'Cannot revoke the last super admin.'], 422);
            }
        }

        $user->update($validated);

        return response()->json($user->fresh('organizations'));
    }

    public function deleteUser(User $user)
    {
        if ($user->is_super_admin && User::where('is_super_admin', true)->count() <= 1) {
            return response()->json(['message' => 'Cannot delete the last super admin.'], 422);
        }

        $user->delete();

        return response()->json(null, 204);
    }

    // ── Org membership management ─────────────────────────────────────────────

    public function organizationUsers(Organization $organization)
    {
        $users = $organization->users()->withPivot('role', 'created_at')->get();

        return response()->json($users);
    }

    public function updateOrganizationUserRole(Request $request, Organization $organization, User $user)
    {
        $validated = $request->validate([
            'role' => 'required|in:owner,admin,manager,viewer',
        ]);

        $organization->users()->updateExistingPivot($user->id, ['role' => $validated['role']]);

        return response()->json(['message' => 'Role updated successfully']);
    }

    public function removeOrganizationUser(Organization $organization, User $user)
    {
        $organization->users()->detach($user->id);

        return response()->json(null, 204);
    }

    public function searchUsers(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'No user found with that email.'], 404);
        }

        return response()->json(['id' => $user->id, 'name' => $user->name, 'email' => $user->email]);
    }
}
