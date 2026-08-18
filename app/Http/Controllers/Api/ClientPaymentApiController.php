<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientPayment;
use App\Models\SaleOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClientPaymentApiController extends Controller
{
    private const STATUTS = ['Inst', 'Payé', 'Report', 'Imp', 'Dévalidé'];

    public function index(Request $request)
    {
        $query = ClientPayment::with(['client', 'allocations.saleOrder']);

        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('numero')) {
            $query->where('numero', 'like', '%'.$request->numero.'%');
        }
        if ($request->filled('banque')) {
            $query->where('banque', 'like', '%'.$request->banque.'%');
        }
        if ($request->filled('montant')) {
            $query->where('montant', (float) str_replace(',', '.', $request->montant));
        }
        if ($request->filled('mois') && preg_match('/^\d{4}-\d{2}$/', $request->mois)) {
            [$year, $month] = explode('-', $request->mois);
            $query->whereYear('payment_date', $year)->whereMonth('payment_date', $month);
        }

        $payments = $query->latest('payment_date')->latest('id')->get();

        $allForTotals = ClientPayment::query();
        $totalReglement = round((float) (clone $allForTotals)->sum('montant'), 2);
        $totalDecaisse = round((float) (clone $allForTotals)->where('statut', 'Payé')->sum('montant'), 2);
        $totalImpaye = round((float) (clone $allForTotals)->where('statut', 'Imp')->sum('montant'), 2);

        return response()->json([
            'data' => $payments->map(fn ($p) => $this->formatPayment($p))->values()->all(),
            'meta' => [
                'total_reglement' => number_format($totalReglement, 2, '.', ''),
                'total_decaisse' => number_format($totalDecaisse, 2, '.', ''),
                'total_impaye' => number_format($totalImpaye, 2, '.', ''),
            ],
        ]);
    }

    public function show(ClientPayment $clientPayment)
    {
        return response()->json([
            'data' => $this->formatPayment($clientPayment->load(['client', 'allocations.saleOrder'])),
        ]);
    }

    public function meta()
    {
        return response()->json([
            'next_ref' => $this->nextReference(),
            'date' => now()->format('d/m/Y'),
            'date_raw' => now()->format('Y-m-d'),
            'statuts' => self::STATUTS,
        ]);
    }

    public function orders(Request $request)
    {
        $request->validate([
            'client_id' => 'required|exists:clients,id',
        ]);

        $client = Client::findOrFail($request->client_id);

        $orders = SaleOrder::with('client')
            ->where('client_id', $request->client_id)
            ->where('status', '!=', 'annule')
            ->latest('order_date')
            ->get()
            ->map(fn ($o) => $this->formatOrder($o))
            ->values();

        $soldeInitial = $client->remainingInitialBalance();
        if ($soldeInitial > 0) {
            $paid = round((float) ($client->initial_balance_paid ?? 0), 2);
            $bon = round((float) ($client->budget ?? 0), 2);
            $orders->prepend([
                'id' => 0,
                'type' => 'solde_initial',
                'reference' => 'SOLDE INITIAL',
                'order_date' => '—',
                'order_date_raw' => null,
                'client_id' => $client->id,
                'client' => $client->name,
                'client_livre' => 'Solde initial',
                'ville' => $client->city,
                'address' => 'Solde initial',
                'montant_bon' => number_format($bon, 2, '.', ''),
                'montant_paye' => number_format($paid, 2, '.', ''),
                'solde' => number_format($soldeInitial, 2, '.', ''),
                'payment_action' => 'Inst',
                'status' => 'ouvert',
            ]);
        }

        $totalTtc = round($orders->sum(fn ($o) => (float) $o['montant_bon']), 2);
        $soldeTtc = round($orders->sum(fn ($o) => (float) $o['solde']), 2);

        return response()->json([
            'data' => $orders->values()->all(),
            'meta' => [
                'total_ttc' => number_format($totalTtc, 2, '.', ''),
                'solde_ttc' => number_format($soldeTtc, 2, '.', ''),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'payment_date' => 'required|date',
            'client_id' => 'required|exists:clients,id',
            'reglement' => 'nullable|string|max:10',
            'numero' => 'nullable|string|max:50',
            'banque' => 'nullable|string|max:100',
            'nom_tire' => 'nullable|string|max:150',
            'montant' => 'required|numeric|min:0.01',
            'date_decaissement' => 'nullable|date',
            'remarque' => 'nullable|string|max:1000',
            'statut' => 'nullable|in:'.implode(',', self::STATUTS),
            'allocations' => 'required|array|min:1',
            'allocations.*.type' => 'nullable|in:order,solde_initial',
            'allocations.*.sales_order_id' => 'nullable|exists:sales_orders,id',
            'allocations.*.amount' => 'nullable|numeric|min:0',
            'allocations.*.action' => 'nullable|in:Inst,Payé,Report,Imp,Dévalidé',
        ]);

        $payment = DB::transaction(function () use ($validated, $request) {
            $client = Client::where('id', $validated['client_id'])->lockForUpdate()->firstOrFail();

            $orderAllocations = collect($validated['allocations'])
                ->filter(fn ($row) => ($row['type'] ?? 'order') !== 'solde_initial' && ! empty($row['sales_order_id']));
            $soldeAllocations = collect($validated['allocations'])
                ->filter(fn ($row) => ($row['type'] ?? '') === 'solde_initial');

            $orderIds = $orderAllocations->pluck('sales_order_id')->all();
            $orders = SaleOrder::with('client')
                ->whereIn('id', $orderIds)
                ->where('client_id', $validated['client_id'])
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($orders->count() !== count($orderIds)) {
                abort(422, 'Certaines commandes sont invalides pour ce client');
            }

            $paymentAmount = round((float) $validated['montant'], 2);
            $remaining = $paymentAmount;
            $built = [];
            $soldeAppliedTotal = 0.0;

            foreach ($soldeAllocations as $row) {
                $action = $row['action'] ?? 'Payé';
                $due = $client->remainingInitialBalance();
                $explicit = array_key_exists('amount', $row) && $row['amount'] !== null && $row['amount'] !== ''
                    ? round((float) $row['amount'], 2)
                    : null;

                if ($explicit !== null) {
                    $applied = $explicit;
                } elseif ($action === 'Payé') {
                    $applied = round(min($due, $remaining), 2);
                } else {
                    $applied = 0;
                }

                if ($applied > 0) {
                    $remaining = round($remaining - $applied, 2);
                    $soldeAppliedTotal = round($soldeAppliedTotal + $applied, 2);
                }

                $built[] = [
                    'type' => 'solde_initial',
                    'order' => null,
                    'amount' => max($applied, 0),
                    'action' => $action,
                ];
            }

            foreach ($orderAllocations as $row) {
                $order = $orders->get($row['sales_order_id']);
                $action = $row['action'] ?? 'Payé';
                $due = round(max((float) $order->total_ttc - (float) ($order->montant_paye ?? 0), 0), 2);

                $explicit = array_key_exists('amount', $row) && $row['amount'] !== null && $row['amount'] !== ''
                    ? round((float) $row['amount'], 2)
                    : null;

                if ($explicit !== null) {
                    $applied = $explicit;
                } elseif ($action === 'Payé') {
                    $applied = round(min($due, $remaining), 2);
                } else {
                    $applied = 0;
                }

                if ($applied > 0) {
                    $remaining = round($remaining - $applied, 2);
                }

                $built[] = [
                    'type' => 'order',
                    'order' => $order,
                    'amount' => max($applied, 0),
                    'action' => $action,
                ];
            }

            $totalTtc = round(
                $orders->sum(fn ($o) => (float) $o->total_ttc) + (float) ($client->budget ?? 0),
                2
            );
            $soldeAvant = round(
                $orders->sum(fn ($o) => max((float) $o->total_ttc - (float) ($o->montant_paye ?? 0), 0))
                + $client->remainingInitialBalance(),
                2
            );

            $statut = $validated['statut'] ?? 'Inst';
            if (! empty($validated['date_decaissement']) && $statut === 'Inst') {
                $statut = 'Payé';
            }

            $first = $orders->first();

            $payment = ClientPayment::create([
                'reference' => 'RC-PENDING',
                'payment_date' => $validated['payment_date'],
                'client_id' => $validated['client_id'],
                'client_name' => $client->name,
                'ville_chantier' => $first?->city ?: $client->city,
                'chantier_type' => null,
                'montant_total' => $totalTtc,
                'reglement' => $validated['reglement'] ?? null,
                'numero' => $validated['numero'] ?? null,
                'banque' => $validated['banque'] ?? null,
                'nom_tire' => $validated['nom_tire'] ?? null,
                'montant' => $paymentAmount,
                'date_decaissement' => $validated['date_decaissement'] ?? null,
                'remarque' => $validated['remarque'] ?? null,
                'solde' => round($soldeAvant - $paymentAmount, 2),
                'statut' => $statut,
                'user_id' => $request->user()->id,
            ]);

            $payment->update(['reference' => $this->referenceFor($payment->id)]);

            foreach ($built as $row) {
                if ($row['type'] === 'solde_initial') {
                    $payment->allocations()->create([
                        'sales_order_id' => null,
                        'client_order_id' => null,
                        'allocation_type' => 'solde_initial',
                        'amount' => $row['amount'],
                        'action' => $row['action'],
                    ]);
                    continue;
                }

                $payment->allocations()->create([
                    'sales_order_id' => $row['order']->id,
                    'client_order_id' => null,
                    'allocation_type' => 'order',
                    'amount' => $row['amount'],
                    'action' => $row['action'],
                ]);

                $newPaid = round((float) ($row['order']->montant_paye ?? 0) + $row['amount'], 2);
                $orderTotal = (float) $row['order']->total_ttc;
                $action = $row['action'];

                if ($action === 'Payé' || ($newPaid + 0.009 >= $orderTotal && $orderTotal > 0)) {
                    $action = $newPaid + 0.009 >= $orderTotal ? 'Payé' : ($action ?: 'Inst');
                }

                $row['order']->update([
                    'montant_paye' => $newPaid,
                    'payment_action' => $action,
                ]);
            }

            if ($soldeAppliedTotal > 0) {
                $client->update([
                    'initial_balance_paid' => round((float) ($client->initial_balance_paid ?? 0) + $soldeAppliedTotal, 2),
                ]);
            }

            return $payment->fresh(['client', 'allocations.saleOrder']);
        });

        return response()->json([
            'message' => 'Règlement enregistré',
            'data' => $this->formatPayment($payment),
        ], 201);
    }

    public function update(Request $request, ClientPayment $clientPayment)
    {
        $validated = $request->validate([
            'payment_date' => 'sometimes|required|date',
            'client_id' => 'sometimes|required|exists:clients,id',
            'reglement' => 'nullable|string|max:10',
            'numero' => 'nullable|string|max:50',
            'banque' => 'nullable|string|max:100',
            'nom_tire' => 'nullable|string|max:150',
            'montant' => 'sometimes|required|numeric|min:0.01',
            'date_decaissement' => 'nullable|date',
            'remarque' => 'nullable|string|max:1000',
            'statut' => 'nullable|in:'.implode(',', self::STATUTS),
        ]);

        if (isset($validated['client_id'])) {
            $validated['client_name'] = Client::find($validated['client_id'])?->name;
        }

        $clientPayment->update($validated);

        return response()->json([
            'message' => 'Règlement mis à jour',
            'data' => $this->formatPayment($clientPayment->fresh(['client', 'allocations.saleOrder'])),
        ]);
    }

    public function updateStatut(Request $request, ClientPayment $clientPayment)
    {
        $validated = $request->validate([
            'statut' => 'required|in:'.implode(',', self::STATUTS),
        ]);

        $clientPayment->update(['statut' => $validated['statut']]);

        return response()->json([
            'message' => 'Statut mis à jour',
            'data' => $this->formatPayment($clientPayment->fresh(['client', 'allocations.saleOrder'])),
        ]);
    }

    public function updateAction(Request $request, SaleOrder $sales_order)
    {
        $validated = $request->validate([
            'payment_action' => 'required|in:Inst,Payé,Report,Imp,Dévalidé',
        ]);

        $sales_order->update(['payment_action' => $validated['payment_action']]);

        return response()->json($this->formatOrder($sales_order->fresh('client')));
    }

    public function destroy(ClientPayment $clientPayment)
    {
        DB::transaction(function () use ($clientPayment) {
            $clientPayment->load(['allocations.saleOrder', 'allocations.clientOrder', 'client']);

            foreach ($clientPayment->allocations as $allocation) {
                if (($allocation->allocation_type ?? 'order') === 'solde_initial') {
                    $client = $clientPayment->client;
                    if ($client) {
                        $client->update([
                            'initial_balance_paid' => round(max((float) ($client->initial_balance_paid ?? 0) - (float) $allocation->amount, 0), 2),
                        ]);
                    }
                } else {
                    $order = $allocation->saleOrder ?: $allocation->clientOrder;
                    if ($order && isset($order->montant_paye)) {
                        $order->update([
                            'montant_paye' => round(max((float) ($order->montant_paye ?? 0) - (float) $allocation->amount, 0), 2),
                        ]);
                    }
                }
                $allocation->delete();
            }

            $clientPayment->delete();
        });

        return response()->json(['message' => 'Règlement supprimé']);
    }

    private function nextReference(): string
    {
        return $this->referenceFor((ClientPayment::max('id') ?? 0) + 1);
    }

    private function referenceFor(int $id): string
    {
        return 'RC-'.str_pad((string) $id, 4, '0', STR_PAD_LEFT);
    }

    private function formatOrder(SaleOrder $order): array
    {
        $montantBon = round((float) $order->total_ttc, 2);
        $montantPaye = round((float) ($order->montant_paye ?? 0), 2);
        $solde = round($montantBon - $montantPaye, 2);

        return [
            'id' => $order->id,
            'type' => 'order',
            'reference' => $order->reference,
            'order_date' => $order->order_date?->format('d/m/Y'),
            'order_date_raw' => $order->order_date?->format('Y-m-d'),
            'client_id' => $order->client_id,
            'client' => $order->client?->name,
            'client_livre' => $order->address ?: $order->city,
            'ville' => $order->city,
            'address' => $order->address,
            'montant_bon' => number_format($montantBon, 2, '.', ''),
            'montant_paye' => number_format($montantPaye, 2, '.', ''),
            'solde' => number_format($solde, 2, '.', ''),
            'payment_action' => $order->payment_action ?: 'Inst',
            'status' => $order->status,
        ];
    }

    private function formatPayment(ClientPayment $payment): array
    {
        $payment->loadMissing(['client', 'allocations.saleOrder', 'allocations.clientOrder']);

        return [
            'id' => $payment->id,
            'reference' => $payment->reference,
            'payment_date' => $payment->payment_date?->format('d/m/Y'),
            'payment_date_raw' => $payment->payment_date?->format('Y-m-d'),
            'client_id' => $payment->client_id,
            'client' => $payment->client_name ?: $payment->client?->name,
            'reglement' => $payment->reglement,
            'numero' => $payment->numero,
            'banque' => $payment->banque,
            'nom_tire' => $payment->nom_tire,
            'montant' => number_format((float) $payment->montant, 2, '.', ''),
            'date_decaissement' => $payment->date_decaissement?->format('d/m/Y'),
            'date_decaissement_raw' => $payment->date_decaissement?->format('Y-m-d'),
            'remarque' => $payment->remarque,
            'total_ttc' => number_format((float) $payment->montant_total, 2, '.', ''),
            'solde_ttc' => number_format((float) $payment->solde, 2, '.', ''),
            'statut' => $payment->statut ?: 'Inst',
            'allocations' => $payment->allocations->map(fn ($a) => [
                'id' => $a->id,
                'sales_order_id' => $a->sales_order_id,
                'type' => $a->allocation_type ?: 'order',
                'bon' => ($a->allocation_type ?? '') === 'solde_initial'
                    ? 'SOLDE INITIAL'
                    : ($a->saleOrder?->reference ?: $a->clientOrder?->reference),
                'amount' => number_format((float) $a->amount, 2, '.', ''),
                'action' => $a->action,
            ])->values()->all(),
        ];
    }
}
