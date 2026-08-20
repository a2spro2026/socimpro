<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseOrderApiController extends Controller
{
    public function index(Request $request)
    {
        $docType = $this->resolveDocType($request);

        $query = PurchaseOrder::with(['supplier', 'items'])
            ->where('doc_type', $docType)
            ->when($request->search, fn ($q, $s) => $q->where(function ($inner) use ($s) {
                $inner->where('reference', 'like', "%{$s}%")
                    ->orWhere('designation', 'like', "%{$s}%");
            }))
            ->when($request->destination, fn ($q, $d) => $q->where('destination', $d))
            ->latest('order_date');

        if ($request->boolean('all')) {
            $orders = $query->get()->map(fn ($o) => $this->formatOrder($o));
            $totalMontant = round($orders->sum(fn ($o) => (float) $o['montant']), 2);
            $totalReglements = round((float) \App\Models\SupplierPayment::sum('montant'), 2);

            return response()->json([
                'data' => $orders,
                'meta' => [
                    'next_ref' => $this->nextReference($docType),
                    'date' => now()->format('d/m/Y'),
                    'doc_type' => $docType,
                    'total_montant' => number_format($totalMontant, 2, '.', ''),
                    'total_reglements' => number_format($totalReglements, 2, '.', ''),
                    'reliquat' => number_format(round($totalMontant - $totalReglements, 2), 2, '.', ''),
                ],
            ]);
        }

        return response()->json($query->paginate(15)->through(fn ($o) => $this->formatOrder($o)));
    }

    public function balance(Request $request)
    {
        $mois = $request->mois;
        $supplierId = $request->supplier_id;
        $monthFilter = $mois && preg_match('/^\d{4}-\d{2}$/', $mois);

        $achatsQuery = PurchaseOrder::query()
            ->where('status', '!=', 'annule')
            ->where(function ($q) {
                $q->where('doc_type', 'bon_achat')
                    ->orWhereNull('doc_type')
                    ->orWhere('doc_type', '');
            })
            ->when($supplierId, fn ($q, $id) => $q->where('supplier_id', $id))
            ->when($monthFilter, function ($q) use ($mois) {
                [$year, $month] = explode('-', $mois);
                $q->whereYear('order_date', $year)->whereMonth('order_date', $month);
            });

        $achatsBySupplier = $achatsQuery
            ->selectRaw('supplier_id, SUM(total_ttc) as total_achats, MAX(order_date) as derniere_commande')
            ->groupBy('supplier_id')
            ->get()
            ->keyBy('supplier_id');

        $paiementsQuery = SupplierPayment::query()
            ->when($supplierId, fn ($q, $id) => $q->where('supplier_id', $id))
            ->when($monthFilter, function ($q) use ($mois) {
                [$year, $month] = explode('-', $mois);
                $q->whereYear('payment_date', $year)->whereMonth('payment_date', $month);
            });

        $paiementsBySupplier = $paiementsQuery
            ->selectRaw('supplier_id, SUM(montant) as montant_paye, MAX(payment_date) as dernier_paiement')
            ->groupBy('supplier_id')
            ->get()
            ->keyBy('supplier_id');

        $supplierIds = $achatsBySupplier->keys()
            ->merge($paiementsBySupplier->keys())
            ->unique()
            ->filter()
            ->values();

        // Inclure les fournisseurs avec solde initial même sans mouvements
        if (! $supplierId) {
            $withInitial = Supplier::query()
                ->where('initial_balance', '>', 0)
                ->pluck('id');
            $supplierIds = $supplierIds->merge($withInitial)->unique()->filter()->values();
        } elseif ($supplierIds->isEmpty()) {
            $supplier = Supplier::find($supplierId);
            if ($supplier && (float) $supplier->initial_balance > 0) {
                $supplierIds = collect([$supplierId]);
            }
        }

        $suppliers = Supplier::whereIn('id', $supplierIds)->get()->keyBy('id');

        $rows = $supplierIds->map(function ($sid) use ($achatsBySupplier, $paiementsBySupplier, $suppliers) {
            $achats = $achatsBySupplier->get($sid);
            $paiements = $paiementsBySupplier->get($sid);
            $supplier = $suppliers->get($sid);

            $totalAchats = round((float) ($achats->total_achats ?? 0), 2);
            $montantPaye = round((float) ($paiements->montant_paye ?? 0), 2);
            $soldeInitial = round((float) ($supplier->initial_balance ?? 0), 2);
            // Solde = solde initial + bons d'achat − règlements
            $solde = round(max($soldeInitial + $totalAchats - $montantPaye, 0), 2);
            $reliquat = round(max($montantPaye - $soldeInitial - $totalAchats, 0), 2);

            $derniereCommande = $achats->derniere_commande ?? null;
            $dernierPaiement = $paiements->dernier_paiement ?? null;
            $derniereActivite = collect([$derniereCommande, $dernierPaiement, $supplier?->updated_at])
                ->filter()
                ->map(fn ($d) => $d instanceof \Carbon\Carbon ? $d : \Carbon\Carbon::parse($d))
                ->sortDesc()
                ->first();

            return [
                'id' => $sid,
                'supplier_id' => $sid,
                'date' => $derniereActivite?->format('d/m/Y'),
                'fournisseur' => $supplier?->name ?? '—',
                'total_achats' => $totalAchats,
                'montant_paye' => $montantPaye,
                'solde_initial' => $soldeInitial,
                'solde' => $solde,
                'reliquat' => $reliquat,
            ];
        })->sortByDesc(fn ($row) => $row['date'] ?? '')->values();

        $totalAchats = round($rows->sum(fn ($r) => (float) $r['total_achats']), 2);
        $soldeTotal = round($rows->sum(fn ($r) => (float) $r['solde']), 2);
        $reliquatTotal = round($rows->sum(fn ($r) => (float) $r['reliquat']), 2);

        return response()->json([
            'data' => $rows->all(),
            'meta' => [
                'total_achats' => number_format($totalAchats, 2, '.', ''),
                'solde_total' => number_format($soldeTotal, 2, '.', ''),
                'reliquat_total' => number_format($reliquatTotal, 2, '.', ''),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);
        $items = $this->normalizeItems($validated);

        $order = DB::transaction(function () use ($validated, $items, $request) {
            $subtotal = collect($items)->sum('total');
            $first = $items[0] ?? null;

            $docType = $validated['doc_type'] ?? 'bon_achat';

            $order = PurchaseOrder::create([
                'supplier_id' => $validated['supplier_id'],
                'order_date' => $validated['order_date'],
                'doc_type' => $docType,
                'bc_number' => $validated['bc_number'] ?? null,
                'reglement' => $validated['reglement'] ?? null,
                'echeance' => $validated['echeance'] ?? null,
                'city' => $validated['city'] ?? null,
                'client_livre' => $validated['client_livre'] ?? null,
                'destination' => $validated['destination'] ?? null,
                'chauffeur' => $validated['chauffeur'] ?? null,
                'matricule' => $validated['matricule'] ?? null,
                'designation' => $first['description'] ?? null,
                'article_ref' => $first['article_ref'] ?? null,
                'unit' => $first['unit'] ?? null,
                'unit_price' => $first['unit_price'] ?? 0,
                'quantity' => $first['quantity'] ?? 1,
                'reference' => 'PENDING',
                'subtotal' => $subtotal,
                'total_ht' => $subtotal,
                'tva' => 0,
                'total_ttc' => $subtotal,
                'status' => $validated['status'] ?? 'valide',
                'user_id' => $request->user()->id,
            ]);

            $order->update(['reference' => $this->nextReference($docType)]);
            $this->syncItems($order, $items);

            return $order->fresh(['supplier', 'items']);
        });

        return response()->json($this->formatOrder($order), 201);
    }

    public function show(PurchaseOrder $purchaseOrder)
    {
        return response()->json($this->formatOrder($purchaseOrder->load(['supplier', 'items'])));
    }

    public function update(Request $request, PurchaseOrder $purchaseOrder)
    {
        $validated = $this->validated($request, true);
        $items = $this->normalizeItems($validated);
        $subtotal = collect($items)->sum('total');
        $first = $items[0] ?? null;

        DB::transaction(function () use ($purchaseOrder, $validated, $items, $subtotal, $first) {
            $purchaseOrder->update([
                'supplier_id' => $validated['supplier_id'] ?? $purchaseOrder->supplier_id,
                'order_date' => $validated['order_date'] ?? $purchaseOrder->order_date,
                'bc_number' => array_key_exists('bc_number', $validated) ? $validated['bc_number'] : $purchaseOrder->bc_number,
                'reglement' => array_key_exists('reglement', $validated) ? $validated['reglement'] : $purchaseOrder->reglement,
                'echeance' => array_key_exists('echeance', $validated) ? $validated['echeance'] : $purchaseOrder->echeance,
                'city' => array_key_exists('city', $validated) ? $validated['city'] : $purchaseOrder->city,
                'client_livre' => array_key_exists('client_livre', $validated) ? $validated['client_livre'] : $purchaseOrder->client_livre,
                'destination' => array_key_exists('destination', $validated) ? $validated['destination'] : $purchaseOrder->destination,
                'chauffeur' => array_key_exists('chauffeur', $validated) ? $validated['chauffeur'] : $purchaseOrder->chauffeur,
                'matricule' => array_key_exists('matricule', $validated) ? $validated['matricule'] : $purchaseOrder->matricule,
                'designation' => $first['description'] ?? $purchaseOrder->designation,
                'article_ref' => $first['article_ref'] ?? $purchaseOrder->article_ref,
                'unit' => $first['unit'] ?? $purchaseOrder->unit,
                'unit_price' => $first['unit_price'] ?? $purchaseOrder->unit_price,
                'quantity' => $first['quantity'] ?? $purchaseOrder->quantity,
                'subtotal' => $subtotal,
                'total_ht' => $subtotal,
                'tva' => 0,
                'total_ttc' => $subtotal,
                'status' => $validated['status'] ?? $purchaseOrder->status,
            ]);

            $this->syncItems($purchaseOrder, $items);
        });

        return response()->json($this->formatOrder($purchaseOrder->fresh(['supplier', 'items'])));
    }

    public function validateOrder(PurchaseOrder $purchaseOrder)
    {
        $purchaseOrder->update(['status' => 'valide']);

        return response()->json($this->formatOrder($purchaseOrder));
    }

    public function destroy(PurchaseOrder $purchaseOrder)
    {
        $purchaseOrder->delete();

        return response()->json(['message' => 'Bon d\'achat supprimé']);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $rules = [
            'supplier_id' => ($partial ? 'sometimes' : 'required').'|exists:suppliers,id',
            'order_date' => ($partial ? 'sometimes' : 'required').'|date',
            'doc_type' => 'nullable|in:bon_achat,bon_commande',
            'bc_number' => 'nullable|string|max:50',
            'reglement' => 'nullable|in:Esp,Chq,Eff,Vir,Vers',
            'echeance' => 'nullable|string|max:20',
            'city' => 'nullable|string|max:255',
            'client_livre' => 'nullable|string|max:255',
            'destination' => 'nullable|in:cru,divers',
            'chauffeur' => 'nullable|string|max:255',
            'matricule' => 'nullable|string|max:50',
            'status' => 'nullable|in:en_attente,valide,annule,recu_partiel,recu',
            'items' => ($partial ? 'sometimes' : 'required').'|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.article_ref' => 'nullable|string|max:100',
            'items.*.code_barre' => 'nullable|string|max:100',
            'items.*.description' => 'required|string|max:255',
            'items.*.categorie' => 'nullable|string|max:255',
            'items.*.famille' => 'nullable|string|max:255',
            'items.*.marque' => 'nullable|string|max:255',
            'items.*.unit' => 'nullable|string|max:20',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_price' => 'required|numeric|min:0',
            // compat ancien format mono-ligne
            'designation' => 'nullable|string|max:255',
            'article_ref' => 'nullable|string|max:100',
            'unit' => 'nullable|string|max:20',
            'unit_price' => 'nullable|numeric|min:0',
            'quantity' => 'nullable|numeric|min:0.001',
            'subtotal' => 'nullable|numeric|min:0',
        ];

        return $request->validate($rules);
    }

    private function normalizeItems(array $validated): array
    {
        if (! empty($validated['items']) && is_array($validated['items'])) {
            return collect($validated['items'])->map(function ($item) {
                $qty = (float) ($item['quantity'] ?? 1);
                $price = (float) ($item['unit_price'] ?? 0);

                return [
                    'product_id' => $item['product_id'] ?? null,
                    'article_ref' => $item['article_ref'] ?? null,
                    'code_barre' => $item['code_barre'] ?? null,
                    'description' => $item['description'] ?? 'Article',
                    'categorie' => $item['categorie'] ?? null,
                    'famille' => $item['famille'] ?? null,
                    'marque' => $item['marque'] ?? null,
                    'unit' => $item['unit'] ?? null,
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'total' => round($qty * $price, 2),
                ];
            })->values()->all();
        }

        $qty = (float) ($validated['quantity'] ?? 1);
        $price = (float) ($validated['unit_price'] ?? 0);

        return [[
            'product_id' => null,
            'article_ref' => $validated['article_ref'] ?? null,
            'code_barre' => null,
            'description' => $validated['designation'] ?? 'Bon d\'achat',
            'categorie' => null,
            'famille' => null,
            'marque' => null,
            'unit' => $validated['unit'] ?? null,
            'quantity' => $qty,
            'unit_price' => $price,
            'total' => round($qty * $price, 2),
        ]];
    }

    private function syncItems(PurchaseOrder $order, array $items): void
    {
        $order->items()->delete();
        foreach ($items as $item) {
            $order->items()->create([
                'product_id' => $item['product_id'],
                'article_ref' => $item['article_ref'],
                'code_barre' => $item['code_barre'],
                'description' => $item['description'],
                'categorie' => $item['categorie'],
                'famille' => $item['famille'],
                'marque' => $item['marque'],
                'unit' => $item['unit'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'tva_rate' => 0,
                'total' => $item['total'],
            ]);
        }
    }

    private function resolveDocType(Request $request): string
    {
        $type = $request->input('doc_type', 'bon_achat');

        return in_array($type, ['bon_achat', 'bon_commande'], true) ? $type : 'bon_achat';
    }

    private function nextReference(string $docType = 'bon_achat'): string
    {
        $prefix = $docType === 'bon_commande'
            ? 'BC-'.now()->format('y').'/'
            : 'B-A'.now()->format('y').'/';

        $last = PurchaseOrder::where('doc_type', $docType)
            ->where('reference', 'like', $prefix.'%')
            ->pluck('reference')
            ->map(fn ($reference) => (int) substr($reference, strrpos($reference, '/') + 1))
            ->max() ?? 0;

        return $this->referenceFor($last + 1, $docType);
    }

    private function referenceFor(int $id, string $docType = 'bon_achat'): string
    {
        $prefix = $docType === 'bon_commande'
            ? 'BC-'.now()->format('y').'/'
            : 'B-A'.now()->format('y').'/';

        return $prefix.str_pad((string) $id, 4, '0', STR_PAD_LEFT);
    }

    private function formatOrder(PurchaseOrder $order): array
    {
        $order->loadMissing(['supplier', 'items']);

        return [
            'id' => $order->id,
            'reference' => $order->reference,
            'doc_type' => $order->doc_type ?: 'bon_achat',
            'bc_number' => $order->bc_number,
            'order_date' => $order->order_date?->format('d/m/Y'),
            'order_date_raw' => $order->order_date?->format('Y-m-d'),
            'supplier_id' => $order->supplier_id,
            'fournisseur' => $order->supplier?->name,
            'designation' => $order->designation,
            'article_ref' => $order->article_ref,
            'unit' => $order->unit,
            'unit_price' => number_format((float) $order->unit_price, 2, '.', ''),
            'quantity' => (float) $order->quantity,
            'subtotal' => number_format((float) $order->subtotal, 2, '.', ''),
            'montant' => number_format((float) $order->total_ttc, 2, '.', ''),
            'montant_paye' => number_format((float) ($order->montant_paye ?? 0), 2, '.', ''),
            'reglement' => $order->reglement,
            'echeance' => $order->echeance,
            'city' => $order->city,
            'client_livre' => $order->client_livre,
            'destination' => $order->destination,
            'chauffeur' => $order->chauffeur,
            'matricule' => $order->matricule,
            'status' => $order->status,
            'items' => $order->items->map(fn ($i) => [
                'id' => $i->id,
                'product_id' => $i->product_id,
                'article_ref' => $i->article_ref,
                'code_barre' => $i->code_barre,
                'description' => $i->description,
                'categorie' => $i->categorie,
                'famille' => $i->famille,
                'marque' => $i->marque,
                'unit' => $i->unit,
                'quantity' => (float) $i->quantity,
                'unit_price' => number_format((float) $i->unit_price, 2, '.', ''),
                'total' => number_format((float) $i->total, 2, '.', ''),
            ])->values()->all(),
        ];
    }
}
