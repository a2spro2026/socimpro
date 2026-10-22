<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class StockApiController extends Controller
{
    /**
     * Stock matière première = bons d'achat destination Depot Cru (ou sans destination).
     */
    public function matierePremiere()
    {
        return $this->stockResponse(self::aggregatedFromPurchaseOrders('cru'));
    }

    /**
     * Depot Divers = bons d'achat destination Depot Divers.
     */
    public function depotDivers()
    {
        return $this->stockResponse(self::aggregatedFromPurchaseOrders('divers'));
    }

    /**
     * Depot Produit Fini = bons de sortie, une ligne par référence, stock après ventes.
     */
    public function depotProduitFini()
    {
        return $this->stockResponse(self::aggregatedFinishedNet());
    }

    /**
     * Stock vendable pour Bon de Vente = Depot Divers + Depot Produit Fini (après ventes).
     */
    public function vendable(Request $request)
    {
        $exceptId = $request->query('except_sales_order_id');
        $exceptId = $exceptId !== null && $exceptId !== '' ? (int) $exceptId : null;

        return $this->stockResponse(self::aggregatedSellableStock($exceptId));
    }

    /**
     * Mouvement stock annuel : stock initial, achats/ventes par mois, stock actuel.
     */
    public function mouvements(Request $request)
    {
        $year = (int) $request->query('year', now()->year);
        if ($year < 2000 || $year > 2100) {
            $year = (int) now()->year;
        }

        $typeDepot = $request->query('type_depot', 'all');
        if (! in_array($typeDepot, ['fini', 'divers', 'all'], true)) {
            $typeDepot = 'all';
        }

        $flow = $request->query('flow', 'tous');
        if (! in_array($flow, ['achats', 'ventes', 'tous'], true)) {
            $flow = 'tous';
        }

        $monthFilter = $request->query('month');
        $monthFilter = $monthFilter !== null && $monthFilter !== '' ? (int) $monthFilter : null;
        if ($monthFilter !== null && ($monthFilter < 1 || $monthFilter > 12)) {
            $monthFilter = null;
        }

        $rows = collect();

        if ($typeDepot === 'divers' || $typeDepot === 'all') {
            $rows = $rows->concat($this->buildMouvementRows($year, 'divers', $flow, $monthFilter));
        }
        if ($typeDepot === 'fini' || $typeDepot === 'all') {
            $rows = $rows->concat($this->buildMouvementRows($year, 'fini', $flow, $monthFilter));
        }

        return response()->json([
            'data' => $rows->values()->all(),
            'meta' => [
                'year' => $year,
                'type_depot' => $typeDepot,
                'flow' => $flow,
                'month' => $monthFilter,
                'months' => ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
            ],
        ]);
    }

    public function byDestination(Request $request)
    {
        $destination = $request->query('destination', 'cru');
        if (! in_array($destination, ['cru', 'divers'], true)) {
            $destination = 'cru';
        }

        return $this->stockResponse(self::aggregatedFromPurchaseOrders($destination));
    }

    private function stockResponse(Collection $merged)
    {
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
        return self::aggregatedFromPurchaseOrders('cru');
    }

    /**
     * Stock vendable = Depot Divers + Depot Produit Fini (qté > 0 après ventes), fusionné par réf.
     */
    public static function aggregatedSellableStock(?int $exceptSalesOrderId = null): Collection
    {
        $merged = collect();

        foreach ([
            ['rows' => self::aggregatedFromPurchaseOrders('divers'), 'depot' => 'divers'],
            ['rows' => self::aggregatedFromSortieOrders(), 'depot' => 'fini'],
        ] as $source) {
            foreach ($source['rows'] as $row) {
                $ref = trim((string) ($row['ref'] ?? ''));
                if ($ref === '' || $ref === '—') {
                    continue;
                }
                $qty = (float) ($row['quantity'] ?? 0);
                if ($qty <= 0) {
                    continue;
                }
                $key = mb_strtolower($ref);
                $existing = $merged->get($key);
                if ($existing) {
                    $depots = $existing['depots'];
                    if (! in_array($source['depot'], $depots, true)) {
                        $depots[] = $source['depot'];
                    }
                    $merged->put($key, [
                        'ref' => $existing['ref'],
                        'designation' => $existing['designation'] !== '—' ? $existing['designation'] : $row['designation'],
                        'unit' => $existing['unit'] !== '—' ? $existing['unit'] : $row['unit'],
                        'quantity' => round($existing['quantity'] + $qty, 3),
                        'depots' => $depots,
                    ]);
                } else {
                    $merged->put($key, [
                        'ref' => $row['ref'],
                        'designation' => $row['designation'],
                        'unit' => $row['unit'],
                        'quantity' => round($qty, 3),
                        'depots' => [$source['depot']],
                    ]);
                }
            }
        }

        $soldByRef = self::soldQuantitiesByRef($exceptSalesOrderId);

        return $merged
            ->map(function ($row) use ($soldByRef) {
                $key = mb_strtolower(trim((string) $row['ref']));
                $sold = (float) ($soldByRef[$key] ?? 0);
                $row['quantity_sold'] = round($sold, 3);
                $row['quantity'] = round(max(0, (float) $row['quantity'] - $sold), 3);

                return $row;
            })
            ->filter(fn ($row) => (float) $row['quantity'] > 0)
            ->values()
            ->sortBy('ref', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();
    }

    /**
     * Produit fini regroupé par référence (toutes les variantes de désignation).
     */
    public static function finishedGrossByRef(): Collection
    {
        return self::aggregatedFromSortieOrders()
            ->filter(fn ($r) => trim((string) ($r['ref'] ?? '')) !== '' && $r['ref'] !== '—')
            ->groupBy(fn ($r) => mb_strtolower(trim((string) $r['ref'])))
            ->map(function ($group) {
                $best = $group->sortByDesc(fn ($r) => (float) $r['quantity'])->first();

                return [
                    'ref' => $best['ref'],
                    'designation' => $best['designation'],
                    'unit' => $best['unit'],
                    'quantity' => round($group->sum('quantity'), 3),
                ];
            })
            ->values();
    }

    /**
     * Stock fini réel = sorties de la référence − ventes de la référence.
     * Une vente à 0 n'est plus proposée au bon de vente.
     */
    public static function aggregatedFinishedNet(?int $exceptSalesOrderId = null): Collection
    {
        $sold = self::soldQuantitiesByRef($exceptSalesOrderId);

        return self::finishedGrossByRef()
            ->map(function ($row) use ($sold) {
                $key = mb_strtolower(trim((string) $row['ref']));
                $soldQty = round((float) ($sold[$key] ?? 0), 3);
                $row['quantity_produced'] = $row['quantity'];
                $row['quantity_sold'] = $soldQty;
                $row['quantity'] = round((float) $row['quantity'] - $soldQty, 3);

                return $row;
            })
            ->sortBy('ref', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();
    }

    /**
     * Quantités déjà vendues par réf article (hors bon en cours d'édition).
     */
    public static function soldQuantitiesByRef(?int $exceptSalesOrderId = null): array
    {
        if (! Schema::hasTable('sales_orders') || ! Schema::hasTable('sales_order_items')) {
            return [];
        }

        $q = DB::table('sales_order_items as soi')
            ->join('sales_orders as so', 'so.id', '=', 'soi.sales_order_id')
            ->where('so.status', '!=', 'annule')
            ->whereNotNull('soi.article_ref')
            ->where('soi.article_ref', '!=', '');

        if ($exceptSalesOrderId) {
            $q->where('so.id', '!=', $exceptSalesOrderId);
        }

        $rows = $q->selectRaw('LOWER(TRIM(soi.article_ref)) as ref_key, SUM(soi.quantity) as qty')
            ->groupBy(DB::raw('LOWER(TRIM(soi.article_ref))'))
            ->get();

        $map = [];
        foreach ($rows as $r) {
            $map[(string) $r->ref_key] = (float) $r->qty;
        }

        return $map;
    }

    public static function aggregatedFromPurchaseOrders(string $destination = 'cru'): Collection
    {
        $rows = collect();
        $hasDestination = Schema::hasColumn('purchase_orders', 'destination');

        if (Schema::hasTable('purchase_order_items') && Schema::hasTable('purchase_orders')) {
            $itemQuery = DB::table('purchase_order_items as poi')
                ->join('purchase_orders as po', 'po.id', '=', 'poi.purchase_order_id')
                ->where('po.status', '!=', 'annule')
                ->where(function ($q) {
                    $q->where('po.doc_type', 'bon_achat')
                        ->orWhereNull('po.doc_type')
                        ->orWhere('po.doc_type', '');
                });

            if ($hasDestination) {
                if ($destination === 'divers') {
                    $itemQuery->where('po.destination', 'divers');
                } else {
                    $itemQuery->where(function ($q) {
                        $q->where('po.destination', 'cru')
                            ->orWhereNull('po.destination')
                            ->orWhere('po.destination', '');
                    });
                }
            } elseif ($destination === 'divers') {
                return collect();
            }

            $itemRows = $itemQuery
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
            $legacyQuery = DB::table('purchase_orders as po')
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
                ->where('po.designation', '!=', '');

            if ($hasDestination) {
                if ($destination === 'divers') {
                    $legacyQuery->where('po.destination', 'divers');
                } else {
                    $legacyQuery->where(function ($q) {
                        $q->where('po.destination', 'cru')
                            ->orWhereNull('po.destination')
                            ->orWhere('po.destination', '');
                    });
                }
            } elseif ($destination === 'divers') {
                $legacyQuery->whereRaw('1 = 0');
            }

            $legacy = $legacyQuery
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

    public static function aggregatedFromSortieOrders(): Collection
    {
        $rows = collect();

        if (! Schema::hasTable('sortie_orders')) {
            return $rows;
        }

        if (Schema::hasTable('sortie_order_items')) {
            $itemRows = DB::table('sortie_order_items as soi')
                ->join('sortie_orders as so', 'so.id', '=', 'soi.sortie_order_id')
                ->selectRaw('
                    COALESCE(NULLIF(TRIM(soi.article_ref), ""), "—") as ref,
                    COALESCE(NULLIF(TRIM(soi.description), ""), "—") as designation,
                    COALESCE(NULLIF(TRIM(soi.unit), ""), "—") as unit,
                    SUM(soi.quantity) as qty
                ')
                ->groupBy('soi.article_ref', 'soi.description', 'soi.unit')
                ->orderBy('soi.article_ref')
                ->get();

            $rows = $itemRows->map(fn ($r) => [
                'ref' => $r->ref,
                'designation' => $r->designation,
                'unit' => $r->unit,
                'quantity' => round((float) $r->qty, 3),
            ]);
        }

        $legacy = DB::table('sortie_orders as so')
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('sortie_order_items as soi')
                    ->whereColumn('soi.sortie_order_id', 'so.id');
            })
            ->whereNotNull('so.designation')
            ->where('so.designation', '!=', '')
            ->select([
                DB::raw('COALESCE(NULLIF(TRIM(so.article_ref), ""), "—") as ref'),
                DB::raw('COALESCE(NULLIF(TRIM(so.designation), ""), "—") as designation'),
                DB::raw('COALESCE(NULLIF(TRIM(so.unit), ""), "—") as unit'),
                DB::raw('SUM(so.quantity) as qty'),
            ])
            ->groupBy('so.article_ref', 'so.designation', 'so.unit')
            ->orderBy('so.article_ref')
            ->get();

        $rows = $rows->concat($legacy->map(fn ($r) => [
            'ref' => $r->ref,
            'designation' => $r->designation,
            'unit' => $r->unit,
            'quantity' => round((float) $r->qty, 3),
        ]));

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

    private function buildMouvementRows(int $year, string $typeDepot, string $flow, ?int $monthFilter): Collection
    {
        if ($typeDepot === 'fini') {
            return $this->buildFiniMouvementRows($year, $flow, $monthFilter);
        }

        $products = self::aggregatedFromPurchaseOrders('divers');
        $entriesByKeyMonth = $this->monthlyPurchaseQty($year, 'divers');
        $salesByKeyMonth = $this->monthlySalesQty($year, excludeFinishedRefs: true);

        return $products->map(function ($p) use ($year, $typeDepot, $flow, $monthFilter, $entriesByKeyMonth, $salesByKeyMonth) {
            $key = $this->mouvementKey($p['ref'], $p['designation']);

            $stockInitial = $this->purchaseQtyBeforeYear($year, 'divers', $p['ref'], $p['designation'])
                - $this->salesQtyBeforeYear($year, $p['ref'], $p['designation'], excludeFinishedRefs: true);

            $months = [];
            $yearEntries = 0.0;
            $yearSales = 0.0;

            for ($m = 1; $m <= 12; $m++) {
                $achat = (float) ($entriesByKeyMonth[$key][$m] ?? 0);
                $vente = (float) ($salesByKeyMonth[$key][$m] ?? 0);
                $yearEntries += $achat;
                $yearSales += $vente;

                if ($flow === 'achats') {
                    $months[$m] = ['achat' => round($achat, 3), 'vente' => null];
                } elseif ($flow === 'ventes') {
                    $months[$m] = ['achat' => null, 'vente' => round($vente, 3)];
                } else {
                    $months[$m] = ['achat' => round($achat, 3), 'vente' => round($vente, 3)];
                }
            }

            if ($monthFilter !== null) {
                $hasActivity = (($months[$monthFilter]['achat'] ?? 0) > 0) || (($months[$monthFilter]['vente'] ?? 0) > 0);
                if (! $hasActivity && abs($stockInitial) < 0.0001) {
                    return null;
                }
            }

            $stockActuel = round($stockInitial + $yearEntries - $yearSales, 3);

            return [
                'ref' => $p['ref'],
                'designation' => $p['designation'],
                'unit' => $p['unit'],
                'type_depot' => $typeDepot,
                'type_depot_label' => $typeDepot === 'divers' ? 'Divers' : 'Fini',
                'stock_initial' => round($stockInitial, 3),
                'months' => $months,
                'stock_actuel' => $stockActuel,
            ];
        })->filter()->sortBy('ref', SORT_NATURAL | SORT_FLAG_CASE)->values();
    }

    /**
     * Mouvement produit fini : une ligne par référence, ventes imputées même si la désignation diffère.
     */
    private function buildFiniMouvementRows(int $year, string $flow, ?int $monthFilter): Collection
    {
        $products = self::finishedGrossByRef();
        $netByRef = self::aggregatedFinishedNet()->keyBy(fn ($r) => mb_strtolower(trim((string) $r['ref'])));
        $entriesByRefMonth = $this->monthlyQtyByRef($this->monthlySortieQty($year));
        $salesByRefMonth = $this->monthlyQtyByRef($this->monthlySalesQty($year));

        return $products->map(function ($p) use ($year, $flow, $monthFilter, $entriesByRefMonth, $salesByRefMonth, $netByRef) {
            $key = mb_strtolower(trim((string) $p['ref']));
            $stockInitial = $this->sortieQtyBeforeYearByRef($year, $p['ref'])
                - $this->salesQtyBeforeYearByRef($year, $p['ref']);

            $months = [];
            $yearEntries = 0.0;
            $yearSales = 0.0;

            for ($m = 1; $m <= 12; $m++) {
                $achat = (float) ($entriesByRefMonth[$key][$m] ?? 0);
                $vente = (float) ($salesByRefMonth[$key][$m] ?? 0);
                $yearEntries += $achat;
                $yearSales += $vente;

                if ($flow === 'achats') {
                    $months[$m] = ['achat' => round($achat, 3), 'vente' => null];
                } elseif ($flow === 'ventes') {
                    $months[$m] = ['achat' => null, 'vente' => round($vente, 3)];
                } else {
                    $months[$m] = ['achat' => round($achat, 3), 'vente' => round($vente, 3)];
                }
            }

            if ($monthFilter !== null) {
                $hasActivity = (($months[$monthFilter]['achat'] ?? 0) > 0) || (($months[$monthFilter]['vente'] ?? 0) > 0);
                if (! $hasActivity && abs($stockInitial) < 0.0001) {
                    return null;
                }
            }

            return [
                'ref' => $p['ref'],
                'designation' => $p['designation'],
                'unit' => $p['unit'],
                'type_depot' => 'fini',
                'type_depot_label' => 'Fini',
                'stock_initial' => round($stockInitial, 3),
                'months' => $months,
                'stock_actuel' => round((float) ($netByRef[$key]['quantity'] ?? ($stockInitial + $yearEntries - $yearSales)), 3),
            ];
        })->filter()->sortBy('ref', SORT_NATURAL | SORT_FLAG_CASE)->values();
    }

    private function finishedRefSet(): array
    {
        $set = [];
        foreach (self::finishedGrossByRef() as $row) {
            $set[mb_strtolower(trim((string) $row['ref']))] = true;
        }

        return $set;
    }

    private function monthlyQtyByRef(array $byDesignation): array
    {
        $map = [];
        foreach ($byDesignation as $key => $months) {
            $ref = explode('|', (string) $key, 2)[0];
            foreach ($months as $month => $qty) {
                $map[$ref][$month] = ($map[$ref][$month] ?? 0) + (float) $qty;
            }
        }

        return $map;
    }

    private function mouvementKey(?string $ref, ?string $designation): string
    {
        return mb_strtolower(trim((string) $ref).'|'.trim((string) $designation));
    }

    private function monthlyPurchaseQty(int $year, string $destination): array
    {
        $map = [];
        if (! Schema::hasTable('purchase_orders') || ! Schema::hasTable('purchase_order_items')) {
            return $map;
        }

        $hasDestination = Schema::hasColumn('purchase_orders', 'destination');
        $q = DB::table('purchase_order_items as poi')
            ->join('purchase_orders as po', 'po.id', '=', 'poi.purchase_order_id')
            ->where('po.status', '!=', 'annule')
            ->where(function ($inner) {
                $inner->where('po.doc_type', 'bon_achat')
                    ->orWhereNull('po.doc_type')
                    ->orWhere('po.doc_type', '');
            })
            ->whereYear('po.order_date', $year);

        if ($hasDestination) {
            $q->where('po.destination', $destination);
        } elseif ($destination === 'divers') {
            return $map;
        }

        $rows = $q->selectRaw('
                COALESCE(NULLIF(TRIM(poi.article_ref), ""), "—") as ref,
                COALESCE(NULLIF(TRIM(poi.description), ""), "—") as designation,
                MONTH(po.order_date) as mois,
                SUM(poi.quantity) as qty
            ')
            ->groupBy('poi.article_ref', 'poi.description', DB::raw('MONTH(po.order_date)'))
            ->get();

        foreach ($rows as $r) {
            $key = $this->mouvementKey($r->ref, $r->designation);
            $map[$key][(int) $r->mois] = (float) $r->qty;
        }

        return $map;
    }

    private function monthlySortieQty(int $year): array
    {
        $map = [];
        if (! Schema::hasTable('sortie_orders') || ! Schema::hasTable('sortie_order_items')) {
            return $map;
        }

        $rows = DB::table('sortie_order_items as soi')
            ->join('sortie_orders as so', 'so.id', '=', 'soi.sortie_order_id')
            ->whereYear('so.sortie_date', $year)
            ->selectRaw('
                COALESCE(NULLIF(TRIM(soi.article_ref), ""), "—") as ref,
                COALESCE(NULLIF(TRIM(soi.description), ""), "—") as designation,
                MONTH(so.sortie_date) as mois,
                SUM(soi.quantity) as qty
            ')
            ->groupBy('soi.article_ref', 'soi.description', DB::raw('MONTH(so.sortie_date)'))
            ->get();

        foreach ($rows as $r) {
            $key = $this->mouvementKey($r->ref, $r->designation);
            $map[$key][(int) $r->mois] = (float) $r->qty;
        }

        return $map;
    }

    private function monthlySalesQty(int $year, bool $excludeFinishedRefs = false): array
    {
        $map = [];
        if (! Schema::hasTable('sales_orders') || ! Schema::hasTable('sales_order_items')) {
            return $map;
        }

        $finiRefs = $excludeFinishedRefs ? $this->finishedRefSet() : [];

        $rows = DB::table('sales_order_items as soi')
            ->join('sales_orders as so', 'so.id', '=', 'soi.sales_order_id')
            ->where('so.status', '!=', 'annule')
            ->whereYear('so.order_date', $year)
            ->selectRaw('
                COALESCE(NULLIF(TRIM(soi.article_ref), ""), "—") as ref,
                COALESCE(NULLIF(TRIM(soi.description), ""), "—") as designation,
                MONTH(so.order_date) as mois,
                SUM(soi.quantity) as qty
            ')
            ->groupBy('soi.article_ref', 'soi.description', DB::raw('MONTH(so.order_date)'))
            ->get();

        foreach ($rows as $r) {
            $refKey = mb_strtolower(trim((string) ($r->ref === '—' ? '' : $r->ref)));
            if ($excludeFinishedRefs && isset($finiRefs[$refKey])) {
                continue;
            }
            $key = $this->mouvementKey($r->ref, $r->designation);
            $map[$key][(int) $r->mois] = (float) $r->qty;
        }

        return $map;
    }

    private function purchaseQtyBeforeYear(int $year, string $destination, string $ref, string $designation): float
    {
        if (! Schema::hasTable('purchase_orders') || ! Schema::hasTable('purchase_order_items')) {
            return 0;
        }

        $hasDestination = Schema::hasColumn('purchase_orders', 'destination');
        $q = DB::table('purchase_order_items as poi')
            ->join('purchase_orders as po', 'po.id', '=', 'poi.purchase_order_id')
            ->where('po.status', '!=', 'annule')
            ->where(function ($inner) {
                $inner->where('po.doc_type', 'bon_achat')
                    ->orWhereNull('po.doc_type')
                    ->orWhere('po.doc_type', '');
            })
            ->whereYear('po.order_date', '<', $year)
            ->whereRaw('LOWER(TRIM(COALESCE(poi.article_ref, ""))) = ?', [mb_strtolower(trim($ref === '—' ? '' : $ref))])
            ->whereRaw('LOWER(TRIM(COALESCE(poi.description, ""))) = ?', [mb_strtolower(trim($designation === '—' ? '' : $designation))]);

        if ($hasDestination) {
            $q->where('po.destination', $destination);
        }

        return round((float) $q->sum('poi.quantity'), 3);
    }

    private function sortieQtyBeforeYear(int $year, string $ref, string $designation): float
    {
        if (! Schema::hasTable('sortie_orders') || ! Schema::hasTable('sortie_order_items')) {
            return 0;
        }

        return round((float) DB::table('sortie_order_items as soi')
            ->join('sortie_orders as so', 'so.id', '=', 'soi.sortie_order_id')
            ->whereYear('so.sortie_date', '<', $year)
            ->whereRaw('LOWER(TRIM(COALESCE(soi.article_ref, ""))) = ?', [mb_strtolower(trim($ref === '—' ? '' : $ref))])
            ->whereRaw('LOWER(TRIM(COALESCE(soi.description, ""))) = ?', [mb_strtolower(trim($designation === '—' ? '' : $designation))])
            ->sum('soi.quantity'), 3);
    }

    private function salesQtyBeforeYear(int $year, string $ref, string $designation, bool $excludeFinishedRefs = false): float
    {
        if (! Schema::hasTable('sales_orders') || ! Schema::hasTable('sales_order_items')) {
            return 0;
        }

        $refKey = mb_strtolower(trim($ref === '—' ? '' : $ref));
        if ($excludeFinishedRefs && isset($this->finishedRefSet()[$refKey])) {
            return 0;
        }

        return round((float) DB::table('sales_order_items as soi')
            ->join('sales_orders as so', 'so.id', '=', 'soi.sales_order_id')
            ->where('so.status', '!=', 'annule')
            ->whereYear('so.order_date', '<', $year)
            ->whereRaw('LOWER(TRIM(COALESCE(soi.article_ref, ""))) = ?', [$refKey])
            ->whereRaw('LOWER(TRIM(COALESCE(soi.description, ""))) = ?', [mb_strtolower(trim($designation === '—' ? '' : $designation))])
            ->sum('soi.quantity'), 3);
    }

    private function sortieQtyBeforeYearByRef(int $year, string $ref): float
    {
        if (! Schema::hasTable('sortie_orders') || ! Schema::hasTable('sortie_order_items')) {
            return 0;
        }

        return round((float) DB::table('sortie_order_items as soi')
            ->join('sortie_orders as so', 'so.id', '=', 'soi.sortie_order_id')
            ->whereYear('so.sortie_date', '<', $year)
            ->whereRaw('LOWER(TRIM(COALESCE(soi.article_ref, ""))) = ?', [mb_strtolower(trim($ref))])
            ->sum('soi.quantity'), 3);
    }

    private function salesQtyBeforeYearByRef(int $year, string $ref): float
    {
        if (! Schema::hasTable('sales_orders') || ! Schema::hasTable('sales_order_items')) {
            return 0;
        }

        return round((float) DB::table('sales_order_items as soi')
            ->join('sales_orders as so', 'so.id', '=', 'soi.sales_order_id')
            ->where('so.status', '!=', 'annule')
            ->whereYear('so.order_date', '<', $year)
            ->whereRaw('LOWER(TRIM(COALESCE(soi.article_ref, ""))) = ?', [mb_strtolower(trim($ref))])
            ->sum('soi.quantity'), 3);
    }
}

