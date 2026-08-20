<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FinishedProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class FinishedProductApiController extends Controller
{
    public function index()
    {
        $soldMap = $this->soldQuantities();

        $products = FinishedProduct::query()
            ->latest('id')
            ->get()
            ->map(fn ($p) => $this->format($p, $soldMap));

        return response()->json(['data' => $products->values()->all()]);
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);
        $photoPath = $this->storePhoto($request);

        $product = FinishedProduct::create([
            ...$validated,
            'photo' => $photoPath,
            'user_id' => $request->user()?->id,
        ]);

        return response()->json([
            'data' => $this->format($product, $this->soldQuantities()),
        ], 201);
    }

    public function show(FinishedProduct $finishedProduct)
    {
        return response()->json([
            'data' => $this->format($finishedProduct, $this->soldQuantities()),
        ]);
    }

    public function update(Request $request, FinishedProduct $finishedProduct)
    {
        $validated = $this->validated($request, partialPhoto: true);

        if ($request->hasFile('photo')) {
            if ($finishedProduct->photo) {
                Storage::disk('public')->delete($finishedProduct->photo);
            }
            $validated['photo'] = $this->storePhoto($request);
        }

        $finishedProduct->update($validated);

        return response()->json([
            'data' => $this->format($finishedProduct->fresh(), $this->soldQuantities()),
        ]);
    }

    public function destroy(FinishedProduct $finishedProduct)
    {
        if ($finishedProduct->photo) {
            Storage::disk('public')->delete($finishedProduct->photo);
        }
        $finishedProduct->delete();

        return response()->json(['message' => 'Produit fini supprimé']);
    }

    private function validated(Request $request, bool $partialPhoto = false): array
    {
        $rules = [
            'article_ref' => 'required|string|max:100',
            'designation' => 'required|string|max:255',
            'unit' => 'nullable|string|max:20',
            'quantity' => 'required|numeric|min:0',
            'photo' => ($partialPhoto ? 'nullable' : 'nullable').'|image|max:5120',
        ];

        $validated = $request->validate($rules);
        unset($validated['photo']);
        $validated['unit'] = ($validated['unit'] ?? null) ?: null;

        return $validated;
    }

    private function storePhoto(Request $request): ?string
    {
        if (! $request->hasFile('photo')) {
            return null;
        }

        return $request->file('photo')->store('finished-products', 'public');
    }

    /**
     * @return array<string, float>
     */
    private function soldQuantities(): array
    {
        $map = [];

        if (Schema::hasTable('sales_order_items') && Schema::hasTable('sales_orders')) {
            $rows = DB::table('sales_order_items as soi')
                ->join('sales_orders as so', 'so.id', '=', 'soi.sales_order_id')
                ->where('so.status', '!=', 'annule')
                ->selectRaw('
                    COALESCE(NULLIF(TRIM(soi.article_ref), ""), "—") as ref,
                    COALESCE(NULLIF(TRIM(soi.description), ""), "—") as designation,
                    SUM(soi.quantity) as qty
                ')
                ->groupBy('soi.article_ref', 'soi.description')
                ->get();

            foreach ($rows as $row) {
                $map[$this->key($row->ref, $row->designation)] = round((float) $row->qty, 3);
            }
        }

        if (Schema::hasTable('sales_orders')) {
            $legacy = DB::table('sales_orders as so')
                ->where('so.status', '!=', 'annule')
                ->whereNotExists(function ($q) {
                    $q->select(DB::raw(1))
                        ->from('sales_order_items as soi')
                        ->whereColumn('soi.sales_order_id', 'so.id');
                })
                ->whereNotNull('so.designation')
                ->where('so.designation', '!=', '')
                ->selectRaw('
                    COALESCE(NULLIF(TRIM(so.article_ref), ""), "—") as ref,
                    COALESCE(NULLIF(TRIM(so.designation), ""), "—") as designation,
                    SUM(so.quantity) as qty
                ')
                ->groupBy('so.article_ref', 'so.designation')
                ->get();

            foreach ($legacy as $row) {
                $key = $this->key($row->ref, $row->designation);
                $map[$key] = round(($map[$key] ?? 0) + (float) $row->qty, 3);
            }
        }

        return $map;
    }

    private function key(?string $ref, ?string $designation): string
    {
        return mb_strtolower(trim((string) $ref).'|'.trim((string) $designation));
    }

    private function format(FinishedProduct $product, array $soldMap): array
    {
        $qty = round((float) $product->quantity, 3);
        $sold = $soldMap[$this->key($product->article_ref, $product->designation)] ?? 0.0;
        $stock = round($qty - $sold, 3);

        return [
            'id' => $product->id,
            'article_ref' => $product->article_ref,
            'designation' => $product->designation,
            'unit' => $product->unit,
            'quantity' => $qty,
            'quantity_sold' => $sold,
            'stock_actuel' => $stock,
            'photo' => $product->photo,
            'photo_url' => $product->photo ? Storage::disk('public')->url($product->photo) : null,
        ];
    }
}
