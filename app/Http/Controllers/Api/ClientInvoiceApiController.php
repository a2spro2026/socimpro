<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientInvoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClientInvoiceApiController extends Controller
{
    public function index(Request $request)
    {
        $query = ClientInvoice::with(['client', 'items'])
            ->when($request->search, fn ($q, $s) => $q->where(function ($inner) use ($s) {
                $inner->where('reference', 'like', "%{$s}%")
                    ->orWhere('designation', 'like', "%{$s}%");
            }))
            ->latest('invoice_date')
            ->latest('id');

        if ($request->boolean('all')) {
            $invoices = $query->get()->map(fn ($i) => $this->format($i));

            return response()->json([
                'data' => $invoices,
                'meta' => [
                    'next_ref' => $this->nextReference(),
                    'date' => now()->format('d/m/Y'),
                    'date_raw' => now()->format('Y-m-d'),
                ],
            ]);
        }

        return response()->json($query->paginate(15)->through(fn ($i) => $this->format($i)));
    }

    public function meta()
    {
        return response()->json([
            'next_ref' => $this->nextReference(),
            'date' => now()->format('d/m/Y'),
            'date_raw' => now()->format('Y-m-d'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);
        $items = $this->normalizeItems($validated);

        $invoice = DB::transaction(function () use ($validated, $items, $request) {
            $subtotal = collect($items)->sum('total');
            $first = $items[0] ?? null;

            $invoice = ClientInvoice::create([
                'client_id' => $validated['client_id'],
                'invoice_date' => $validated['invoice_date'],
                'due_date' => $validated['due_date'] ?? null,
                'city' => $validated['city'] ?? null,
                'address' => $validated['address'] ?? null,
                'reglement' => $validated['reglement'] ?? null,
                'echeance' => $validated['echeance'] ?? null,
                'chauffeur' => $validated['chauffeur'] ?? null,
                'matricule' => $validated['matricule'] ?? null,
                'designation' => $first['description'] ?? null,
                'article_ref' => $first['article_ref'] ?? null,
                'unit' => $first['unit'] ?? null,
                'unit_price' => $first['unit_price'] ?? 0,
                'quantity' => $first['quantity'] ?? 1,
                'reference' => 'FAC-PENDING',
                'subtotal' => $subtotal,
                'total_ht' => $subtotal,
                'tva' => 0,
                'total_ttc' => $subtotal,
                'status' => $validated['status'] ?? 'en_attente',
                'notes' => $validated['notes'] ?? null,
                'user_id' => $request->user()->id,
            ]);

            $invoice->update(['reference' => $this->nextReference($validated['invoice_date'] ?? null)]);
            $this->syncItems($invoice, $items);

            return $invoice->fresh(['client', 'items']);
        });

        return response()->json($this->format($invoice), 201);
    }

    public function show(ClientInvoice $client_invoice)
    {
        return response()->json($this->format($client_invoice->load(['client', 'items'])));
    }

    public function update(Request $request, ClientInvoice $client_invoice)
    {
        $validated = $this->validated($request, true);
        $items = $this->normalizeItems($validated);
        $subtotal = collect($items)->sum('total');
        $first = $items[0] ?? null;

        DB::transaction(function () use ($client_invoice, $validated, $items, $subtotal, $first) {
            $client_invoice->update([
                'client_id' => $validated['client_id'] ?? $client_invoice->client_id,
                'invoice_date' => $validated['invoice_date'] ?? $client_invoice->invoice_date,
                'due_date' => array_key_exists('due_date', $validated) ? $validated['due_date'] : $client_invoice->due_date,
                'city' => array_key_exists('city', $validated) ? $validated['city'] : $client_invoice->city,
                'address' => array_key_exists('address', $validated) ? $validated['address'] : $client_invoice->address,
                'reglement' => array_key_exists('reglement', $validated) ? $validated['reglement'] : $client_invoice->reglement,
                'echeance' => array_key_exists('echeance', $validated) ? $validated['echeance'] : $client_invoice->echeance,
                'chauffeur' => array_key_exists('chauffeur', $validated) ? $validated['chauffeur'] : $client_invoice->chauffeur,
                'matricule' => array_key_exists('matricule', $validated) ? $validated['matricule'] : $client_invoice->matricule,
                'designation' => $first['description'] ?? $client_invoice->designation,
                'article_ref' => $first['article_ref'] ?? $client_invoice->article_ref,
                'unit' => $first['unit'] ?? $client_invoice->unit,
                'unit_price' => $first['unit_price'] ?? $client_invoice->unit_price,
                'quantity' => $first['quantity'] ?? $client_invoice->quantity,
                'subtotal' => $subtotal,
                'total_ht' => $subtotal,
                'tva' => 0,
                'total_ttc' => $subtotal,
                'status' => $validated['status'] ?? $client_invoice->status,
                'notes' => array_key_exists('notes', $validated) ? $validated['notes'] : $client_invoice->notes,
            ]);

            $this->syncItems($client_invoice, $items);
        });

        return response()->json($this->format($client_invoice->fresh(['client', 'items'])));
    }

    public function destroy(ClientInvoice $client_invoice)
    {
        $client_invoice->delete();

        return response()->json(['message' => 'Facture de vente supprimée']);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $rules = [
            'client_id' => ($partial ? 'sometimes' : 'required').'|exists:clients,id',
            'invoice_date' => ($partial ? 'sometimes' : 'required').'|date',
            'due_date' => 'nullable|date',
            'reglement' => 'nullable|in:Esp,Chq,Eff,Vir,Vers',
            'echeance' => 'nullable|string|max:20',
            'city' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'chauffeur' => 'nullable|string|max:255',
            'matricule' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            'status' => 'nullable|in:brouillon,en_attente,partielle,payee,en_retard,annulee',
            'items' => ($partial ? 'sometimes' : 'required').'|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.article_ref' => 'nullable|string|max:100',
            'items.*.description' => 'required|string|max:255',
            'items.*.unit' => 'nullable|string|max:20',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_price' => 'required|numeric|min:0',
        ];

        return $request->validate($rules);
    }

    private function normalizeItems(array $validated): array
    {
        return collect($validated['items'] ?? [])->map(function ($item) {
            $qty = (float) ($item['quantity'] ?? 1);
            $price = (float) ($item['unit_price'] ?? 0);

            return [
                'product_id' => $item['product_id'] ?? null,
                'article_ref' => $item['article_ref'] ?? null,
                'description' => $item['description'] ?? 'Article',
                'unit' => $item['unit'] ?? null,
                'quantity' => $qty,
                'unit_price' => $price,
                'total' => round($qty * $price, 2),
            ];
        })->values()->all();
    }

    private function syncItems(ClientInvoice $invoice, array $items): void
    {
        $invoice->items()->delete();
        foreach ($items as $item) {
            $invoice->items()->create([
                'product_id' => $item['product_id'],
                'article_ref' => $item['article_ref'],
                'description' => $item['description'],
                'unit' => $item['unit'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'total' => $item['total'],
            ]);
        }
    }

    private function nextReference(?string $invoiceDate = null): string
    {
        $year = $invoiceDate
            ? date('Y', strtotime($invoiceDate))
            : now()->format('Y');
        $prefix = 'FAC'.$year.'/';

        $last = ClientInvoice::where('reference', 'like', $prefix.'%')
            ->pluck('reference')
            ->map(fn ($reference) => (int) substr($reference, strrpos($reference, '/') + 1))
            ->max() ?? 0;

        return $prefix.str_pad((string) ($last + 1), 4, '0', STR_PAD_LEFT);
    }

    private function format(ClientInvoice $invoice): array
    {
        $invoice->loadMissing(['client', 'items']);

        return [
            'id' => $invoice->id,
            'reference' => $invoice->reference,
            'invoice_date' => $invoice->invoice_date?->format('d/m/Y'),
            'invoice_date_raw' => $invoice->invoice_date?->format('Y-m-d'),
            'due_date' => $invoice->due_date?->format('d/m/Y'),
            'due_date_raw' => $invoice->due_date?->format('Y-m-d'),
            'client_id' => $invoice->client_id,
            'client' => $invoice->client?->name,
            'designation' => $invoice->designation,
            'article_ref' => $invoice->article_ref,
            'unit' => $invoice->unit,
            'unit_price' => number_format((float) ($invoice->unit_price ?? 0), 2, '.', ''),
            'quantity' => (float) ($invoice->quantity ?? 0),
            'subtotal' => number_format((float) ($invoice->subtotal ?? $invoice->total_ttc), 2, '.', ''),
            'montant' => number_format((float) $invoice->total_ttc, 2, '.', ''),
            'reglement' => $invoice->reglement,
            'echeance' => $invoice->echeance,
            'city' => $invoice->city,
            'address' => $invoice->address,
            'chauffeur' => $invoice->chauffeur,
            'matricule' => $invoice->matricule,
            'status' => $invoice->status,
            'notes' => $invoice->notes,
            'order_date' => $invoice->invoice_date?->format('d/m/Y'),
            'order_date_raw' => $invoice->invoice_date?->format('Y-m-d'),
            'items' => $invoice->items->map(fn ($i) => [
                'id' => $i->id,
                'product_id' => $i->product_id,
                'article_ref' => $i->article_ref,
                'description' => $i->description,
                'unit' => $i->unit,
                'quantity' => (float) $i->quantity,
                'unit_price' => number_format((float) $i->unit_price, 2, '.', ''),
                'total' => number_format((float) $i->total, 2, '.', ''),
            ])->values()->all(),
        ];
    }
}
