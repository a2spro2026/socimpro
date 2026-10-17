<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\SaleOrder;
use Carbon\Carbon;
use Illuminate\Http\Request;

class EtatVenteApiController extends Controller
{
    public function index(Request $request)
    {
        $month = $request->input('month', now()->format('Y-m'));
        try {
            $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        } catch (\Throwable) {
            $start = now()->startOfMonth();
            $month = $start->format('Y-m');
        }
        $end = $start->copy()->endOfMonth();

        $productFilter = trim((string) $request->input('product', ''));

        $orders = SaleOrder::with(['items.product', 'client'])
            ->where('status', '!=', 'annule')
            ->whereBetween('order_date', [$start->toDateString(), $end->toDateString()])
            ->orderByDesc('order_date')
            ->orderByDesc('id')
            ->get();

        $rows = [];

        foreach ($orders as $order) {
            $items = $order->items;
            if ($items->isEmpty()) {
                // legacy single-line orders
                $items = collect([(object) [
                    'article_ref' => $order->article_ref,
                    'description' => $order->designation,
                    'quantity' => $order->quantity,
                    'unit_price' => $order->unit_price,
                    'total' => $order->subtotal ?? $order->total_ttc,
                    'product_id' => null,
                    'product' => null,
                ]]);
            }

            foreach ($items as $item) {
                $ref = $item->article_ref ?? '';
                $designation = $item->description ?? $order->designation ?? '';
                $qty = (float) ($item->quantity ?? 0);
                $prixVenteUnit = (float) ($item->unit_price ?? 0);

                if ($productFilter !== '') {
                    $hay = mb_strtolower($ref.' '.$designation);
                    if (! str_contains($hay, mb_strtolower($productFilter))) {
                        continue;
                    }
                }

                $coutUnit = $this->resolvePurchaseCost($item);
                $coutTotal = round($coutUnit * $qty, 2);
                $prixTotal = round($item->total !== null ? (float) $item->total : ($prixVenteUnit * $qty), 2);
                $marge = round($prixTotal - $coutTotal, 2);

                $rows[] = [
                    'date' => optional($order->order_date)->format('d/m/Y'),
                    'date_raw' => optional($order->order_date)->format('Y-m-d'),
                    'reference' => $order->reference,
                    'article_ref' => $ref ?: '—',
                    'designation' => $designation ?: '—',
                    'quantity' => $qty,
                    'cout_achat' => $coutTotal,
                    'cout_achat_unit' => $coutUnit,
                    'prix_vente' => $prixTotal,
                    'prix_vente_unit' => $prixVenteUnit,
                    'marge' => $marge,
                    'client' => $order->client?->name,
                ];
            }
        }

        $totaux = [
            'quantity' => round(collect($rows)->sum('quantity'), 3),
            'cout_achat' => round(collect($rows)->sum('cout_achat'), 2),
            'prix_vente' => round(collect($rows)->sum('prix_vente'), 2),
            'marge' => round(collect($rows)->sum('marge'), 2),
        ];

        return response()->json([
            'month' => $month,
            'data' => $rows,
            'totaux' => $totaux,
        ]);
    }

    private function resolvePurchaseCost(object $item): float
    {
        $product = $item->product ?? null;
        if ($product && (float) $product->purchase_price > 0) {
            return (float) $product->purchase_price;
        }

        if (! empty($item->product_id)) {
            $p = Product::find($item->product_id);
            if ($p && (float) $p->purchase_price > 0) {
                return (float) $p->purchase_price;
            }
        }

        // fallback by article ref
        $ref = trim((string) ($item->article_ref ?? ''));
        if ($ref !== '') {
            $p = Product::where(function ($q) use ($ref) {
                $q->where('reference', $ref)->orWhere('article_id', $ref);
            })->first();
            if ($p && (float) ($p->purchase_price ?? 0) > 0) {
                return (float) $p->purchase_price;
            }
        }

        return 0.0;
    }
}
