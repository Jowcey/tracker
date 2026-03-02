<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            ->withCount('users')
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        return response()->json($query->paginate(25));
    }

    public function updateOrganization(Request $request, Organization $organization)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $organization->update($validated);

        return response()->json($organization);
    }

    public function deleteOrganization(Organization $organization)
    {
        $organization->forceDelete();

        return response()->json(null, 204);
    }

    public function restoreOrganization(int $id)
    {
        $organization = Organization::onlyTrashed()->findOrFail($id);
        $organization->restore();

        return response()->json($organization);
    }

    // ── Users ────────────────────────────────────────────────────────────────

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

    public function updateUser(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'is_super_admin' => 'sometimes|boolean',
        ]);

        $user->update($validated);

        return response()->json($user->fresh('organizations'));
    }

    public function deleteUser(User $user)
    {
        // Prevent deleting the last super admin
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
}
