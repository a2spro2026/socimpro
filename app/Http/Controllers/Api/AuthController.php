<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string|max:255',
            'password' => 'required',
            'status' => 'required|in:administrateur,commercial,facturation',
        ]);

        $login = trim((string) $request->email);

        $user = User::with('role.permissions')
            ->where(function ($q) use ($login) {
                $q->where('email', $login)
                    ->orWhere('email', $login.'@socimpro.com')
                    ->orWhere('email', 'like', $login.'@%');
            })
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Identifiants incorrects.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Compte désactivé.'],
            ]);
        }

        $statusRoles = [
            'administrateur' => ['administrateur'],
            'commercial' => ['commercial'],
            'facturation' => ['facturation', 'comptable'],
        ];

        if (! in_array($user->role?->slug, $statusRoles[$request->status], true)) {
            throw ValidationException::withMessages([
                'status' => ['Le statut sélectionné ne correspond pas à ce compte.'],
            ]);
        }

        $token = $user->createToken('socimpro-spa')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->formatUser($user),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté']);
    }

    public function user(Request $request)
    {
        $user = $request->user()->load('role.permissions');

        return response()->json($this->formatUser($user));
    }

    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role?->only(['id', 'name', 'slug']),
            'permissions' => $user->role?->permissions->pluck('slug') ?? [],
            'is_admin' => $user->isAdmin(),
            'title' => $user->isAdmin() ? 'Directeur Général' : ($user->role?->name ?? ''),
        ];
    }
}
