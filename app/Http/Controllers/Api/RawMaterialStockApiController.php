<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RawMaterialReceipt;
use App\Models\RawMaterialReceiptItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RawMaterialStockApiController extends Controller
{
    public function meta()
    {
        return response()->json([
            'next_ref' => $this->nextReference(),
            'date' => now()->format('d/m/Y'),
            'date_raw' => now()->format('Y-m-d'),
        ]);
    }

    public function index()
    {
        $items = RawMaterialReceiptItem::query()
            ->with(['receipt.supplier', 'product'])
            ->whereHas('receipt')
            ->latest('id')
            ->get()
            ->map(fn ($item) => $this->formatItem($item))
            ->values();

        return response()->json(['data' => $items]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'receipt_date' => 'required|date',
            'supplier_id' => 'required|exists:suppliers,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.article_ref' => 'nullable|string|max:100',
            'items.*.designation' => 'required|string|max:255',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit' => 'nullable|string|max:20',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        $receipt = DB::transaction(function () use ($validated, $request) {
            $receipt = RawMaterialReceipt::create([
                'reference' => 'SMP-PENDING',
                'receipt_date' => $validated['receipt_date'],
                'supplier_id' => $validated['supplier_id'],
                'user_id' => $request->user()?->id,
            ]);

            $receipt->update(['reference' => $this->referenceFor($receipt->id)]);

            foreach ($validated['items'] as $row) {
                $qty = round((float) $row['quantity'], 3);
                $price = round((float) $row['unit_price'], 2);
                $receipt->items()->create([
                    'product_id' => $row['product_id'] ?? null,
                    'article_ref' => $row['article_ref'] ?? null,
                    'designation' => $row['designation'],
                    'quantity' => $qty,
                    'unit' => $row['unit'] ?? null,
                    'unit_price' => $price,
                    'subtotal' => round($qty * $price, 2),
                ]);
            }

            return $receipt->load(['items', 'supplier']);
        });

        return response()->json([
            'data' => $receipt->items->map(fn ($item) => $this->formatItem($item)),
            'meta' => ['reference' => $receipt->reference],
        ], 201);
    }

    private function formatItem(RawMaterialReceiptItem $item): array
    {
        $item->loadMissing(['receipt.supplier', 'product']);

        return [
            'id' => $item->id,
            'receipt_id' => $item->raw_material_receipt_id,
            'receipt_ref' => $item->receipt?->reference,
            'receipt_date' => $item->receipt?->receipt_date?->format('d/m/Y'),
            'reference' => $item->article_ref ?: $item->product?->article_id ?: $item->product?->reference ?: '—',
            'designation' => $item->designation,
            'fournisseur' => $item->receipt?->supplier?->name ?? '—',
            'supplier_id' => $item->receipt?->supplier_id,
            'quantity' => number_format((float) $item->quantity, 3, '.', ''),
            'unit' => $item->unit ?? '—',
            'unit_price' => number_format((float) $item->unit_price, 2, '.', ''),
            'subtotal' => number_format((float) $item->subtotal, 2, '.', ''),
        ];
    }

    private function nextReference(): string
    {
        $prefix = 'SMP-'.now()->format('y').'/';
        $last = RawMaterialReceipt::where('reference', 'like', $prefix.'%')
            ->pluck('reference')
            ->map(fn ($reference) => (int) substr($reference, strrpos($reference, '/') + 1))
            ->max() ?? 0;

        return $this->referenceFor($last + 1);
    }

    private function referenceFor(int $id): string
    {
        return 'SMP-'.now()->format('y').'/'.str_pad((string) $id, 4, '0', STR_PAD_LEFT);
    }
}
