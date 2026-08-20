<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class StockApiController extends Controller
{
    /**
     * Stock matière première = agrégation des lignes des bons d'achat.
     */
    public function matierePremiere()
    {
        $merged = self::aggregatedMatierePremiere();

        return response()->json([
            'data' => $merged->all(),
            'meta' => [
                'count' => $merged->count(),
                'date' => now()->format('d/m/Y'),
            ],
        ]);
    }

    public static function aggregatedMatierePremiere(): Collection
    {
        $rows = collect();

        if (Schema::hasTable('purchase_order_items') && Schema::hasTable('purchase_orders')) {
            $itemRows = DB::table('purchase_order_items as poi')
                ->join('purchase_orders as po', 'po.id', '=', 'poi.purchase_order_id')
                ->where('po.status', '!=', 'annule')
                ->where(function ($q) {
                    $q->where('po.doc_type', 'bon_achat')
                        ->orWhereNull('po.doc_type')
                        ->orWhere('po.doc_type', '');
                })
                ->selectRaw('
                    COALESCE(NULLIF(TRIM(poi.article_ref), ""), "—") as ref,
                    COALESCE(NULLIF(TRIM(poi.description), ""), "—") as designation,
                    COALESCE(NULLIF(TRIM(poi.unit), ""), "—") as unit,
                    SUM(poi.quantity) as qty
                ')
                ->groupBy('poi.article_ref', 'poi.description', 'poi.unit')
                ->orderBy('poi.article_ref')
                ->get();

            $rows = $itemRows->map(fn ($r) => [
                'ref' => $r->ref,
                'designation' => $r->designation,
                'unit' => $r->unit,
                'quantity' => round((float) $r->qty, 3),
            ]);
        }

        if (Schema::hasTable('purchase_orders')) {
            $legacy = DB::table('purchase_orders as po')
                ->where('po.status', '!=', 'annule')
                ->where(function ($q) {
                    $q->where('po.doc_type', 'bon_achat')
                        ->orWhereNull('po.doc_type')
                        ->orWhere('po.doc_type', '');
                })
                ->whereNotExists(function ($q) {
                    $q->select(DB::raw(1))
                        ->from('purchase_order_items as poi')
                        ->whereColumn('poi.purchase_order_id', 'po.id');
                })
                ->whereNotNull('po.designation')
                ->where('po.designation', '!=', '')
                ->select([
                    DB::raw('COALESCE(NULLIF(TRIM(po.article_ref), ""), "—") as ref'),
                    DB::raw('COALESCE(NULLIF(TRIM(po.designation), ""), "—") as designation'),
                    DB::raw('COALESCE(NULLIF(TRIM(po.unit), ""), "—") as unit'),
                    DB::raw('SUM(po.quantity) as qty'),
                ])
                ->groupBy('po.article_ref', 'po.designation', 'po.unit')
                ->orderBy('po.article_ref')
                ->get();

            $rows = $rows->concat($legacy->map(fn ($r) => [
                'ref' => $r->ref,
                'designation' => $r->designation,
                'unit' => $r->unit,
                'quantity' => round((float) $r->qty, 3),
            ]));
        }

        return $rows
            ->groupBy(fn ($r) => mb_strtolower($r['ref'].'|'.$r['designation'].'|'.$r['unit']))
            ->map(function ($group) {
                $first = $group->first();

                return [
                    'ref' => $first['ref'],
                    'designation' => $first['designation'],
                    'unit' => $first['unit'],
                    'quantity' => round($group->sum('quantity'), 3),
                ];
            })
            ->sortBy('ref', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();
    }
}
