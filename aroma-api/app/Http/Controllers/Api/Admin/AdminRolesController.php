<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminRolesController extends Controller
{
    public function index()
    {
        return response()->json(Role::orderBy('id')->get(['id', 'name', 'slug', 'color', 'permissions']));
    }

    public function store(Request $request)
    {
        if ($request->user()->role !== 'owner') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'name'        => 'required|string|max:60',
            'color'       => 'required|string|max:100',
            'permissions' => 'required|array',
        ]);

        $slug = Str::slug($data['name']);
        $base = $slug;
        $i    = 2;
        while (Role::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $i++;
        }

        $role = Role::create([
            'name'        => $data['name'],
            'slug'        => $slug,
            'color'       => $data['color'],
            'permissions' => $data['permissions'],
        ]);

        return response()->json($role, 201);
    }

    public function update(Request $request, string $slug)
    {
        if ($request->user()->role !== 'owner') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $role = Role::where('slug', $slug)->firstOrFail();

        $data = $request->validate([
            'name'        => 'sometimes|string|max:60',
            'color'       => 'sometimes|string|max:100',
            'permissions' => 'sometimes|array',
        ]);

        $role->update($data);

        return response()->json($role);
    }

    public function destroy(Request $request, string $slug)
    {
        if ($request->user()->role !== 'owner') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $role  = Role::where('slug', $slug)->firstOrFail();
        $count = User::where('is_admin', true)->where('role', $slug)->count();

        if ($count > 0) {
            return response()->json(
                ['message' => "This role has {$count} member(s). Reassign them before deleting."],
                422
            );
        }

        $role->delete();

        return response()->json(null, 204);
    }
}
