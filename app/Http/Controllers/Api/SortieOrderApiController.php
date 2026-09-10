<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SortieOrder;
use App\Support\UniqueArticleRefs;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SortieOrderApiController extends Controller
{
    public function index()
    {
        $orders = SortieOrder::query()
            ->with('items')
            ->latest('sortie_date')
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
        $items = $this->normalizeItems($validated);

        $order = DB::transaction(function () use ($validated, $items, $request) {
            $first = $items[0];
            $order = SortieOrder::create([
                'sortie_date' => $validated['sortie_date'],
                'reference' => $this->nextReference(),
                'article_ref' => $first['article_ref'],
                'designation' => $first['description'],
                'unit' => $first['unit'],
                'quantity' => collect($items)->sum('quantity'),
                'user_id' => $request->user()?->id,
            ]);
            $this->syncItems($order, $items);

            return $order->fresh('items');
        });

        return response()->json(['data' => $this->format($order)], 201);
    }

    public function show(SortieOrder $sortieOrder)
    {
        return response()->json(['data' => $this->format($sortieOrder->load('items'))]);
    }

    public function update(Request $request, SortieOrder $sortieOrder)
    {
        $validated = $this->validated($request);
        $items = $this->normalizeItems($validated);
        $first = $items[0];

        DB::transaction(function () use ($sortieOrder, $validated, $items, $first) {
            $sortieOrder->update([
                'sortie_date' => $validated['sortie_date'],
                'article_ref' => $first['article_ref'],
                'designation' => $first['description'],
                'unit' => $first['unit'],
                'quantity' => collect($items)->sum('quantity'),
            ]);
            $this->syncItems($sortieOrder, $items);
        });

        return response()->json(['data' => $this->format($sortieOrder->fresh('items'))]);
    }

    public function destroy(SortieOrder $sortieOrder)
    {
        $sortieOrder->delete();

        return response()->json(['message' => 'Bon de sortie supprimé']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'sortie_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.article_ref' => 'required|string|max:100',
            'items.*.description' => 'required|string|max:255',
            'items.*.unit' => 'nullable|string|max:20',
            'items.*.quantity' => 'required|numeric|min:0.001',
        ]);
    }

    private function normalizeItems(array $validated): array
    {
        $items = collect($validated['items'])->map(function ($item) {
            return [
                'article_ref' => trim((string) ($item['article_ref'] ?? '')),
                'description' => trim((string) ($item['description'] ?? '')),
                'unit' => ! empty($item['unit']) ? $item['unit'] : null,
                'quantity' => round((float) ($item['quantity'] ?? 0), 3),
            ];
        })->values()->all();

        UniqueArticleRefs::assert($items);

        return $items;
    }

    private function syncItems(SortieOrder $order, array $items): void
    {
        $order->items()->delete();
        foreach ($items as $item) {
            $order->items()->create($item);
        }
    }

    private function nextReference(): string
    {
        $prefix = 'BS-'.now()->format('y').'/';
        $last = SortieOrder::where('reference', 'like', $prefix.'%')
            ->pluck('reference')
            ->map(fn ($reference) => (int) substr($reference, strrpos($reference, '/') + 1))
            ->max() ?? 0;

        return $prefix.str_pad((string) ($last + 1), 4, '0', STR_PAD_LEFT);
    }

    private function format(SortieOrder $order): array
    {
        $order->loadMissing('items');

        $items = $order->items->isNotEmpty()
            ? $order->items->map(fn ($i) => [
                'id' => $i->id,
                'article_ref' => $i->article_ref,
                'description' => $i->description,
                'unit' => $i->unit,
                'quantity' => round((float) $i->quantity, 3),
            ])->values()->all()
            : [[
                'id' => null,
                'article_ref' => $order->article_ref,
                'description' => $order->designation,
                'unit' => $order->unit,
                'quantity' => round((float) $order->quantity, 3),
            ]];

        return [
            'id' => $order->id,
            'reference' => $order->reference,
            'article_ref' => $order->article_ref,
            'sortie_date' => $order->sortie_date?->format('d/m/Y'),
            'sortie_date_raw' => $order->sortie_date?->format('Y-m-d'),
            'designation' => $order->designation,
            'unit' => $order->unit,
            'quantity' => round(collect($items)->sum('quantity'), 3),
            'items' => $items,
            'items_count' => count($items),
        ];
    }
}
