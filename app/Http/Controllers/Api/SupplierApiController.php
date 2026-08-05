<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierApiController extends Controller
{
    public function index(Request $request)
    {
        $query = Supplier::query()
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->latest();

        $suppliers = $request->boolean('all')
            ? $query->get()->map(fn ($s) => $this->formatSupplier($s))
            : $query->paginate(15)->through(fn ($s) => $this->formatSupplier($s));

        return response()->json([
            'data' => $request->boolean('all') ? $suppliers : $suppliers->items(),
            'meta' => [
                'next_id' => $this->nextSupplierCode(),
                'date' => now()->format('d/m/Y'),
            ],
            ...($request->boolean('all') ? [] : [
                'current_page' => $suppliers->currentPage(),
                'last_page' => $suppliers->lastPage(),
                'total' => $suppliers->total(),
            ]),
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

        return response()->json($this->formatSupplier($supplier), 201);
    }

    public function show(Supplier $supplier)
    {
        return response()->json($this->formatSupplier($supplier->load(['invoices'])));
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

        return response()->json($this->formatSupplier($supplier));
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

    private function formatSupplier(Supplier $supplier): array
    {
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
            'initial_balance' => number_format((float) $supplier->initial_balance, 2, '.', ''),
            'initial_balance_paid' => number_format((float) ($supplier->initial_balance_paid ?? 0), 2, '.', ''),
            'solde' => number_format($supplier->remainingInitialBalance(), 2, '.', ''),
            'status' => $supplier->status,
            'payment_terms' => $supplier->payment_terms,
            'echeance' => $supplier->payment_terms,
            'reglement' => $supplier->reglement,
            'created_at' => $supplier->created_at?->format('d/m/Y'),
        ];
    }
}
