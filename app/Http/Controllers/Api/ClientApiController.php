<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientOrder;
use App\Models\ClientPayment;
use App\Models\SaleOrder;
use Illuminate\Http\Request;

class ClientApiController extends Controller
{
    public function index(Request $request)
    {
        $query = Client::query()
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->latest();

        if ($request->boolean('all')) {
            $clients = $query->get();
            $totals = $this->totalsByClient($clients->pluck('id')->all());

            return response()->json([
                'data' => $clients->map(fn ($c) => $this->formatClient(
                    $c,
                    $totals['ventes'][$c->id] ?? 0,
                    $totals['paye'][$c->id] ?? 0
                )),
                'meta' => [
                    'next_id' => $this->nextClientCode(),
                    'date' => now()->format('d/m/Y'),
                ],
            ]);
        }

        $paginator = $query->paginate(15);
        $totals = $this->totalsByClient($paginator->getCollection()->pluck('id')->all());
        $paginator->setCollection(
            $paginator->getCollection()->map(fn ($c) => $this->formatClient(
                $c,
                $totals['ventes'][$c->id] ?? 0,
                $totals['paye'][$c->id] ?? 0
            ))
        );

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'next_id' => $this->nextClientCode(),
                'date' => now()->format('d/m/Y'),
            ],
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'total' => $paginator->total(),
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

        return response()->json($this->formatClient($client, 0, 0), 201);
    }

    public function show(Client $client)
    {
        $totals = $this->totalsByClient([$client->id]);

        return response()->json($this->formatClient(
            $client->load(['chantiers', 'invoices']),
            $totals['ventes'][$client->id] ?? 0,
            $totals['paye'][$client->id] ?? 0
        ));
    }

    public function update(Request $request, Client $client)
    {
        $client->update($this->validated($request, true));
        $client = $client->fresh();
        $totals = $this->totalsByClient([$client->id]);

        return response()->json($this->formatClient(
            $client,
            $totals['ventes'][$client->id] ?? 0,
            $totals['paye'][$client->id] ?? 0
        ));
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

    /**
     * @param  array<int>  $clientIds
     * @return array{ventes: array<int, float>, paye: array<int, float>}
     */
    private function totalsByClient(array $clientIds): array
    {
        if ($clientIds === []) {
            return ['ventes' => [], 'paye' => []];
        }

        $ventesSales = SaleOrder::query()
            ->whereIn('client_id', $clientIds)
            ->where('status', '!=', 'annule')
            ->selectRaw('client_id, SUM(total_ttc) as total')
            ->groupBy('client_id')
            ->pluck('total', 'client_id');

        $ventesExec = ClientOrder::query()
            ->whereIn('client_id', $clientIds)
            ->where('status', '!=', 'annule')
            ->selectRaw('client_id, SUM(total_ttc) as total')
            ->groupBy('client_id')
            ->pluck('total', 'client_id');

        $paye = ClientPayment::query()
            ->whereIn('client_id', $clientIds)
            ->selectRaw('client_id, SUM(montant) as total')
            ->groupBy('client_id')
            ->pluck('total', 'client_id');

        $ventes = [];
        foreach ($clientIds as $id) {
            $ventes[$id] = round((float) ($ventesSales[$id] ?? 0) + (float) ($ventesExec[$id] ?? 0), 2);
        }

        $payeMap = [];
        foreach ($clientIds as $id) {
            $payeMap[$id] = round((float) ($paye[$id] ?? 0), 2);
        }

        return ['ventes' => $ventes, 'paye' => $payeMap];
    }

    private function formatClient(Client $client, float $totalVentes = 0, float $montantPaye = 0): array
    {
        $budget = round((float) $client->budget, 2);
        $solde = $client->totalSolde($totalVentes, $montantPaye);

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
            'budget' => $budget,
            'initial_balance' => number_format($budget, 2, '.', ''),
            'initial_balance_paid' => number_format((float) ($client->initial_balance_paid ?? 0), 2, '.', ''),
            'solde_initial_restant' => number_format($client->remainingInitialBalance(), 2, '.', ''),
            'solde' => number_format($solde, 2, '.', ''),
            'work_delay' => $client->work_delay,
            'echeance' => $client->work_delay,
            'status' => $client->status,
            'created_at' => $client->created_at?->format('d/m/Y'),
        ];
    }
}
