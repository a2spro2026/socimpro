<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductionOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductionOrderApiController extends Controller
{
    public function index()
    {
        $orders = ProductionOrder::query()
            ->latest('production_date')
            ->latest('id')
            ->get();

        return response()->json([
            'data' => $orders->map(fn ($o) => $this->format($o))->values()->all(),
            'meta' => [
                'next_ref' => $this->nextReference(),
                'date' => now()->format('d/m/Y'),
                'date_raw' => now()->format('Y-m-d'),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);

        $order = DB::transaction(function () use ($validated, $request) {
            return ProductionOrder::create([
                ...$validated,
                'reference' => $this->nextReference(),
                'user_id' => $request->user()?->id,
            ]);
        });

        return response()->json(['data' => $this->format($order)], 201);
    }

    public function show(ProductionOrder $productionOrder)
    {
        return response()->json(['data' => $this->format($productionOrder)]);
    }

    public function update(Request $request, ProductionOrder $productionOrder)
    {
        $validated = $this->validated($request);
        $productionOrder->update($validated);

        return response()->json(['data' => $this->format($productionOrder->fresh())]);
    }

    public function destroy(ProductionOrder $productionOrder)
    {
        $productionOrder->delete();

        return response()->json(['message' => 'Bon de production supprimé']);
    }

    private function validated(Request $request): array
    {
        $validated = $request->validate([
            'production_date' => 'required|date',
            'article_ref' => 'required|string|max:100',
            'designation' => 'required|string|max:255',
            'unit' => 'nullable|string|max:20',
            'quantity' => 'required|numeric|min:0.001',
        ]);

        $match = StockApiController::aggregatedMatierePremiere()->first(function ($row) use ($validated) {
            return mb_strtolower(trim((string) $row['ref'])) === mb_strtolower(trim($validated['article_ref']))
                && mb_strtolower(trim((string) $row['designation'])) === mb_strtolower(trim($validated['designation']));
        });

        if (! $match) {
            throw ValidationException::withMessages([
                'article_ref' => 'Le produit doit provenir du stock matière première.',
            ]);
        }

        $validated['article_ref'] = $match['ref'];
        $validated['designation'] = $match['designation'];
        $validated['unit'] = $match['unit'] === '—' ? null : $match['unit'];

        return $validated;
    }

    private function nextReference(): string
    {
        $prefix = 'BP-'.now()->format('y').'/';
        $last = ProductionOrder::where('reference', 'like', $prefix.'%')
            ->pluck('reference')
            ->map(fn ($reference) => (int) substr($reference, strrpos($reference, '/') + 1))
            ->max() ?? 0;

        return $prefix.str_pad((string) ($last + 1), 4, '0', STR_PAD_LEFT);
    }

    private function format(ProductionOrder $order): array
    {
        return [
            'id' => $order->id,
            'reference' => $order->reference,
            'article_ref' => $order->article_ref,
            'production_date' => $order->production_date?->format('d/m/Y'),
            'production_date_raw' => $order->production_date?->format('Y-m-d'),
            'designation' => $order->designation,
            'unit' => $order->unit,
            'quantity' => round((float) $order->quantity, 3),
        ];
    }
}
