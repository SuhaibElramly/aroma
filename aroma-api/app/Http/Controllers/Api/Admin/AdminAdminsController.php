<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminAdminsController extends Controller
{
    private function fmt(User $u): array
    {
        return [
            'id'          => $u->id,
            'name'        => $u->name,
            'phone'       => $u->phone,
            'email'       => $u->email,
            'role'        => $u->role,
            'adminStatus' => $u->admin_status,
            'createdAt'   => $u->created_at,
        ];
    }

    public function index()
    {
        $admins = User::where('is_admin', true)->orderBy('created_at')->get();
        return response()->json($admins->map(fn($u) => $this->fmt($u)));
    }

    public function store(Request $request)
    {
        $isOwner = $request->user()->role === 'owner';

        $data = $request->validate([
            'name'     => 'required|string|max:100',
            'phone'    => 'required|string|max:20|unique:users,phone',
            'role'     => ['required', Rule::in(
                $isOwner
                    ? Role::pluck('slug')->toArray()
                    : Role::where('slug', '!=', 'owner')->pluck('slug')->toArray()
            )],
            'password' => 'required|string|min:8',
        ]);

        $user = User::create([
            'name'         => $data['name'],
            'phone'        => $data['phone'],
            'email'        => $data['phone'] . '@admin.local',
            'password'     => Hash::make($data['password']),
            'is_admin'     => true,
            'role'         => $data['role'],
            'admin_status' => 'active',
        ]);

        return response()->json($this->fmt($user), 201);
    }

    public function update(Request $request, int $id)
    {
        $user = User::where('is_admin', true)->findOrFail($id);
        $data = $request->validate([
            'role' => ['sometimes', Rule::in(Role::where('slug', '!=', 'owner')->pluck('slug')->toArray())],
            'name' => 'sometimes|string|max:100',
        ]);
        $user->update($data);
        return response()->json($this->fmt($user));
    }

    public function resetPassword(Request $request, int $id)
    {
        $user = User::where('is_admin', true)->findOrFail($id);
        $data = $request->validate(['password' => 'required|string|min:8']);
        $user->update(['password' => Hash::make($data['password'])]);
        return response()->json(['message' => 'Password reset successfully']);
    }

    public function toggleStatus(int $id)
    {
        $user = User::where('is_admin', true)->findOrFail($id);
        if ($user->role === 'owner') {
            return response()->json(['message' => 'Cannot suspend the owner'], 422);
        }
        $user->update(['admin_status' => $user->admin_status === 'active' ? 'suspended' : 'active']);
        return response()->json($this->fmt($user));
    }
}
