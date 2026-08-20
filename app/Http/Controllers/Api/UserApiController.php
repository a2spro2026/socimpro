<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserApiController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with('role')->latest();

        $users = $request->boolean('all')
            ? $query->get()->map(fn ($u) => $this->formatUser($u))
            : $query->paginate(20)->through(fn ($u) => $this->formatUser($u));

        return response()->json([
            'data' => $request->boolean('all') ? $users : $users->items(),
            'meta' => [
                'next_id' => $this->nextUserCode(),
                'date' => now()->format('d/m/Y'),
                'roles' => Role::orderBy('name')->get(['id', 'name', 'slug']),
            ],
            ...($request->boolean('all') ? [] : [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'total' => $users->total(),
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => ['required', 'string', Password::defaults()],
            'phone' => 'nullable|string|max:30',
            'role_id' => 'required|exists:roles,id',
            'is_active' => 'nullable|boolean',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'phone' => $validated['phone'] ?? null,
            'role_id' => $validated['role_id'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        return response()->json($this->formatUser($user->load('role')), 201);
    }

    public function show(User $user)
    {
        return response()->json($this->formatUser($user->load('role')));
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', Password::defaults()],
            'phone' => 'nullable|string|max:30',
            'role_id' => 'sometimes|required|exists:roles,id',
            'is_active' => 'nullable|boolean',
        ]);

        $data = collect($validated)->except('password')->all();

        if (! empty($validated['password'])) {
            $data['password'] = $validated['password'];
        }

        if ($request->has('is_active')) {
            $data['is_active'] = $request->boolean('is_active');
        }

        $user->update($data);

        return response()->json($this->formatUser($user->fresh()->load('role')));
    }

    public function suspend(User $user)
    {
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Vous ne pouvez pas suspendre votre propre compte.'], 422);
        }

        $user->update(['is_active' => false]);

        return response()->json($this->formatUser($user->fresh()->load('role')));
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Vous ne pouvez pas supprimer votre propre compte.'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé']);
    }

    private function nextUserCode(): string
    {
        $next = (User::max('id') ?? 0) + 1;

        return 'U-'.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }

    private function formatUser(User $user): array
    {
        $active = (bool) $user->is_active;

        return [
            'id' => $user->id,
            'code' => 'U-'.str_pad((string) $user->id, 4, '0', STR_PAD_LEFT),
            'name' => $user->name,
            'email' => $user->email,
            'login' => $user->email,
            'phone' => $user->phone,
            'contact' => $user->phone,
            'role_id' => $user->role_id,
            'role' => $user->role?->name,
            'role_slug' => $user->role?->slug,
            'statut' => $active ? ($user->role?->name ?? 'Actif') : 'Suspendu',
            'is_active' => $active,
            'password_mask' => '••••••••',
            'created_at' => $user->created_at?->format('d/m/Y'),
            'created_at_raw' => $user->created_at?->toDateString(),
        ];
    }
}
