<?php
namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function register(array $data): User
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);
        return $user;
    }

    public function login(string $email, string $password): bool
    {
        // Try email first, then phone (admin users log in with phone number)
        $user = User::where('email', $email)
            ->orWhere('phone', $email)
            ->first();

        if (!$user || !Hash::check($password, $user->password)) {
            return false;
        }

        // Suspended admin accounts cannot log in
        if ($user->is_admin && $user->admin_status !== 'active') {
            return false;
        }

        Auth::login($user);
        return true;
    }

    public function changePassword(User $user, string $currentPassword, string $newPassword): bool
    {
        if (!Hash::check($currentPassword, $user->password)) {
            return false;
        }
        $user->update(['password' => Hash::make($newPassword)]);
        return true;
    }
}
