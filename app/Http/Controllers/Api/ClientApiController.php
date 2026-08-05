<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\Request;

class ClientApiController extends Controller
{
    public function index(Request $request)
    {
        $query = Client::query()
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->latest();

        $clients = $request->boolean('all')
            ? $query->get()->map(fn ($c) => $this->formatClient($c))
            : $query->paginate(15)->through(fn ($c) => $this->formatClient($c));

        return response()->json([
            'data' => $request->boolean('all') ? $clients : $clients->items(),
            'meta' => [
                'next_id' => $this->nextClientCode(),
                'date' => now()->format('d/m/Y'),
            ],
            ...($request->boolean('all') ? [] : [
                'current_page' => $clients->currentPage(),
                'last_page' => $clients->lastPage(),
                'total' => $clients->total(),
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);

        $client = Client::create([
            ...$validated,
            'budget' => $validated['budget'] ?? 0,
            'status' => $validated['status'] ?? 'actif',
        ]);

        return response()->json($this->formatClient($client), 201);
    }

    public function show(Client $client)
    {
        return response()->json($this->formatClient($client->load(['chantiers', 'invoices'])));
    }

    public function update(Request $request, Client $client)
    {
        $client->update($this->validated($request, true));

        return response()->json($this->formatClient($client->fresh()));
    }

    public function destroy(Client $client)
    {
        $client->delete();

        return response()->json(['message' => 'Client supprimé']);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'name' => ($partial ? 'sometimes' : 'required').'|string|max:255',
            'contact_person' => 'nullable|string',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'ice' => 'nullable|string',
            'chantier_type' => 'nullable|in:Rev,Entr,Pro',
            'reglement' => 'nullable|in:Esp,Chq,Eff,Vir,Vers',
            'chantier_address' => 'nullable|string',
            'budget' => 'nullable|numeric|min:0',
            'work_delay' => 'nullable|string|max:100',
            'status' => 'in:actif,inactif',
        ]);
    }

    private function nextClientCode(): string
    {
        $next = (Client::max('id') ?? 0) + 1;

        return 'CR-'.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }

    private function formatClient(Client $client): array
    {
        return [
            'id' => $client->id,
            'code' => $client->code,
            'name' => $client->name,
            'contact_person' => $client->contact_person,
            'contact' => $client->phone ?: $client->contact_person,
            'email' => $client->email,
            'phone' => $client->phone,
            'address' => $client->address,
            'city' => $client->city,
            'chantier_type' => $client->chantier_type,
            'reglement' => $client->reglement,
            'chantier_address' => $client->chantier_address,
            'budget' => round((float) $client->budget, 2),
            'initial_balance' => number_format((float) $client->budget, 2, '.', ''),
            'initial_balance_paid' => number_format((float) ($client->initial_balance_paid ?? 0), 2, '.', ''),
            'solde' => number_format($client->remainingInitialBalance(), 2, '.', ''),
            'work_delay' => $client->work_delay,
            'echeance' => $client->work_delay,
            'status' => $client->status,
            'created_at' => $client->created_at?->format('d/m/Y'),
        ];
    }
}
