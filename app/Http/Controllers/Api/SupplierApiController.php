<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use Illuminate\Http\Request;

class SupplierApiController extends Controller
{
    public function index(Request $request)
    {
        $query = Supplier::query()
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->latest();

        if ($request->boolean('all')) {
            $suppliers = $query->get();
            $totals = $this->totalsBySupplier($suppliers->pluck('id')->all());

            return response()->json([
                'data' => $suppliers->map(fn ($s) => $this->formatSupplier(
                    $s,
                    $totals['achats'][$s->id] ?? 0,
                    $totals['paye'][$s->id] ?? 0
                )),
                'meta' => [
                    'next_id' => $this->nextSupplierCode(),
                    'date' => now()->format('d/m/Y'),
                ],
            ]);
        }

        $paginator = $query->paginate(15);
        $totals = $this->totalsBySupplier($paginator->getCollection()->pluck('id')->all());
        $paginator->setCollection(
            $paginator->getCollection()->map(fn ($s) => $this->formatSupplier(
                $s,
                $totals['achats'][$s->id] ?? 0,
                $totals['paye'][$s->id] ?? 0
            ))
        );

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'next_id' => $this->nextSupplierCode(),
                'date' => now()->format('d/m/Y'),
            ],
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'total' => $paginator->total(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'ice' => 'nullable|string',
            'payment_terms' => 'nullable|string|max:50',
            'reglement' => 'nullable|in:Esp,Chq,Eff,Vir,Vers',
            'initial_balance' => 'nullable|numeric',
            'status' => 'in:actif,inactif',
        ]);

        $supplier = Supplier::create([
            ...$validated,
            'initial_balance' => $validated['initial_balance'] ?? 0,
            'status' => $validated['status'] ?? 'actif',
        ]);

        return response()->json($this->formatSupplier($supplier, 0, 0), 201);
    }

    public function show(Supplier $supplier)
    {
        $totals = $this->totalsBySupplier([$supplier->id]);

        return response()->json($this->formatSupplier(
            $supplier->load(['invoices']),
            $totals['achats'][$supplier->id] ?? 0,
            $totals['paye'][$supplier->id] ?? 0
        ));
    }

    public function update(Request $request, Supplier $supplier)
    {
        $supplier->update($request->validate([
            'name' => 'sometimes|string|max:255',
            'contact_person' => 'nullable|string',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'payment_terms' => 'nullable|string|max:50',
            'reglement' => 'nullable|in:Esp,Chq,Eff,Vir,Vers',
            'initial_balance' => 'nullable|numeric',
            'status' => 'in:actif,inactif',
        ]));

        $totals = $this->totalsBySupplier([$supplier->id]);

        return response()->json($this->formatSupplier(
            $supplier->fresh(),
            $totals['achats'][$supplier->id] ?? 0,
            $totals['paye'][$supplier->id] ?? 0
        ));
    }

    public function destroy(Supplier $supplier)
    {
        $supplier->delete();

        return response()->json(['message' => 'Fournisseur supprimé']);
    }

    private function nextSupplierCode(): string
    {
        $next = (Supplier::max('id') ?? 0) + 1;

        return 'CF-'.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }

    /**
     * @param  array<int>  $supplierIds
     * @return array{achats: array<int, float>, paye: array<int, float>}
     */
    private function totalsBySupplier(array $supplierIds): array
    {
        if ($supplierIds === []) {
            return ['achats' => [], 'paye' => []];
        }

        $achats = PurchaseOrder::query()
            ->whereIn('supplier_id', $supplierIds)
            ->where('status', '!=', 'annule')
            ->where(function ($q) {
                $q->where('doc_type', 'bon_achat')
                    ->orWhereNull('doc_type')
                    ->orWhere('doc_type', '');
            })
            ->selectRaw('supplier_id, SUM(total_ttc) as total')
            ->groupBy('supplier_id')
            ->pluck('total', 'supplier_id');

        $paye = SupplierPayment::query()
            ->whereIn('supplier_id', $supplierIds)
            ->selectRaw('supplier_id, SUM(montant) as total')
            ->groupBy('supplier_id')
            ->pluck('total', 'supplier_id');

        $achatsMap = [];
        $payeMap = [];
        foreach ($supplierIds as $id) {
            $achatsMap[$id] = round((float) ($achats[$id] ?? 0), 2);
            $payeMap[$id] = round((float) ($paye[$id] ?? 0), 2);
        }

        return ['achats' => $achatsMap, 'paye' => $payeMap];
    }

    private function formatSupplier(Supplier $supplier, float $totalAchats = 0, float $montantPaye = 0): array
    {
        $initial = round((float) $supplier->initial_balance, 2);
        $solde = $supplier->totalSolde($totalAchats, $montantPaye);

        return [
            'id' => $supplier->id,
            'code' => $supplier->code,
            'name' => $supplier->name,
            'contact_person' => $supplier->contact_person,
            'contact' => $supplier->phone ?: $supplier->contact_person,
            'email' => $supplier->email,
            'phone' => $supplier->phone,
            'address' => $supplier->address,
            'city' => $supplier->city,
            'initial_balance' => number_format($initial, 2, '.', ''),
            'initial_balance_paid' => number_format((float) ($supplier->initial_balance_paid ?? 0), 2, '.', ''),
            'solde_initial_restant' => number_format($supplier->remainingInitialBalance(), 2, '.', ''),
            'total_achats' => number_format($totalAchats, 2, '.', ''),
            'montant_paye' => number_format($montantPaye, 2, '.', ''),
            'solde' => number_format($solde, 2, '.', ''),
            'status' => $supplier->status,
            'payment_terms' => $supplier->payment_terms,
            'echeance' => $supplier->payment_terms,
            'reglement' => $supplier->reglement,
            'created_at' => $supplier->created_at?->format('d/m/Y'),
        ];
    }
}
