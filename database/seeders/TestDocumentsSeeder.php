<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\ClientPayment;
use App\Models\ClientPaymentAllocation;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\SaleOrder;
use App\Models\SaleOrderItem;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Models\SupplierPaymentAllocation;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TestDocumentsSeeder extends Seeder
{
    private const REGLEMENTS = ['Esp', 'Chq', 'Eff', 'Vir', 'Vers'];

    private const STATUTS = ['Inst', 'Payé', 'Report', 'Imp'];

    public function run(): void
    {
        $user = User::first();
        $product = Product::first();

        if (! $user || ! $product) {
            $this->command?->error('Utilisateur ou produit manquant. Lancez d\'abord DatabaseSeeder.');

            return;
        }

        $suppliers = $this->ensureSuppliers();
        $clients = $this->ensureClients();

        DB::transaction(function () use ($user, $product, $suppliers, $clients) {
            $purchaseOrders = $this->seedPurchaseOrders($suppliers, $product, $user->id);
            $saleOrders = $this->seedSaleOrders($clients, $product, $user->id);
            $this->seedSupplierPayments($suppliers, $purchaseOrders, $user->id);
            $this->seedClientPayments($clients, $saleOrders, $user->id);
        });

        $this->command?->info('10 bons d\'achat, 10 bons de vente, 10 règlements fournisseur et 10 règlements client créés.');
    }

    private function ensureSuppliers()
    {
        $names = [
            'Matériaux du Nord',
            'BTP Casablanca',
            'Steel Maroc',
            'Ciment Atlas',
        ];

        $suppliers = collect();
        foreach ($names as $i => $name) {
            $suppliers->push(Supplier::firstOrCreate(
                ['name' => $name],
                [
                    'contact_person' => 'Contact '.($i + 1),
                    'email' => 'contact'.($i + 1).'@test.ma',
                    'phone' => '0522'.str_pad((string) ($i + 1), 6, '0', STR_PAD_LEFT),
                    'city' => ['Casablanca', 'Rabat', 'Tanger', 'Marrakech'][$i],
                    'payment_terms' => '30 jours',
                    'status' => 'actif',
                    'initial_balance' => 0,
                ]
            ));
        }

        return $suppliers;
    }

    private function ensureClients()
    {
        $names = [
            'Société Atlas BTP',
            'Promoteur Anfa',
            'Groupe Hay Riad',
            'Entreprise Bouskoura',
        ];

        $clients = collect();
        foreach ($names as $i => $name) {
            $clients->push(Client::firstOrCreate(
                ['name' => $name],
                [
                    'contact_person' => 'Client '.($i + 1),
                    'email' => 'client'.($i + 1).'@test.ma',
                    'phone' => '0537'.str_pad((string) ($i + 1), 6, '0', STR_PAD_LEFT),
                    'city' => ['Casablanca', 'Rabat', 'Tanger', 'Marrakech'][$i],
                    'status' => 'actif',
                ]
            ));
        }

        return $clients;
    }

    private function seedPurchaseOrders($suppliers, Product $product, int $userId): array
    {
        $orders = [];
        $designations = [
            'Ciment CPJ 45', 'Fer à béton 12mm', 'Gravier 15/25', 'Sable fin',
            'Brique rouge', 'Peinture façade', 'Carrelage 60x60', 'Tôle bac acier',
            'Isolant thermique', 'Coffrage métallique',
        ];

        for ($i = 0; $i < 10; $i++) {
            $supplier = $suppliers[$i % $suppliers->count()];
            $qty = rand(5, 50);
            $unitPrice = rand(80, 450);
            $total = round($qty * $unitPrice, 2);
            $orderDate = now()->subDays(rand(1, 45));

            $order = PurchaseOrder::create([
                'reference' => 'PENDING',
                'doc_type' => 'bon_achat',
                'order_date' => $orderDate,
                'supplier_id' => $supplier->id,
                'designation' => $designations[$i],
                'article_ref' => $product->reference,
                'unit' => $product->unit ?? 'u',
                'unit_price' => $unitPrice,
                'quantity' => $qty,
                'subtotal' => $total,
                'total_ht' => $total,
                'tva' => 0,
                'total_ttc' => $total,
                'montant_paye' => 0,
                'payment_action' => 'Inst',
                'reglement' => self::REGLEMENTS[$i % count(self::REGLEMENTS)],
                'echeance' => rand(15, 60).' j',
                'city' => $supplier->city,
                'client_livre' => ['Chantier A', 'Chantier B', 'Dépôt central'][$i % 3],
                'chauffeur' => 'Chauffeur Test '.($i + 1),
                'matricule' => '12345-'.str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT).'-'.rand(10, 99),
                'status' => 'valide',
                'notes' => 'Bon d\'achat test #'.($i + 1),
                'user_id' => $userId,
            ]);

            $order->update(['reference' => $this->nextPurchaseReference()]);

            PurchaseOrderItem::create([
                'purchase_order_id' => $order->id,
                'product_id' => $product->id,
                'article_ref' => $product->reference,
                'description' => $designations[$i],
                'unit' => $product->unit ?? 'u',
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'tva_rate' => 0,
                'total' => $total,
            ]);

            $orders[] = $order->fresh();
        }

        return $orders;
    }

    private function seedSaleOrders($clients, Product $product, int $userId): array
    {
        $orders = [];
        $designations = [
            'Livraison ciment', 'Fourniture acier', 'Vente gravier', 'Sable livré',
            'Briques rouges', 'Peinture extérieure', 'Carrelage sol', 'Tôle toiture',
            'Isolation combles', 'Location coffrage',
        ];

        for ($i = 0; $i < 10; $i++) {
            $client = $clients[$i % $clients->count()];
            $qty = rand(3, 40);
            $unitPrice = rand(120, 600);
            $total = round($qty * $unitPrice, 2);
            $orderDate = now()->subDays(rand(1, 40));

            $order = SaleOrder::create([
                'reference' => 'BV-PENDING',
                'order_date' => $orderDate,
                'client_id' => $client->id,
                'designation' => $designations[$i],
                'article_ref' => $product->reference,
                'unit' => $product->unit ?? 'u',
                'unit_price' => $unitPrice,
                'quantity' => $qty,
                'subtotal' => $total,
                'total_ht' => $total,
                'tva' => 0,
                'total_ttc' => $total,
                'montant_paye' => 0,
                'payment_action' => 'Inst',
                'reglement' => self::REGLEMENTS[$i % count(self::REGLEMENTS)],
                'echeance' => rand(15, 45).' j',
                'city' => $client->city,
                'address' => 'Chantier test '.($i + 1).', '.$client->city,
                'chauffeur' => 'Livreur Test '.($i + 1),
                'matricule' => '54321-'.str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT).'-'.rand(10, 99),
                'status' => 'valide',
                'notes' => 'Bon de vente test #'.($i + 1),
                'user_id' => $userId,
            ]);

            $order->update(['reference' => $this->nextSaleReference()]);

            SaleOrderItem::create([
                'sales_order_id' => $order->id,
                'product_id' => $product->id,
                'article_ref' => $product->reference,
                'description' => $designations[$i],
                'unit' => $product->unit ?? 'u',
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'tva_rate' => 0,
                'total' => $total,
            ]);

            $orders[] = $order->fresh();
        }

        return $orders;
    }

    private function seedSupplierPayments($suppliers, array $purchaseOrders, int $userId): void
    {
        for ($i = 0; $i < 10; $i++) {
            $order = $purchaseOrders[$i];
            $supplier = $suppliers->firstWhere('id', $order->supplier_id);
            $amount = round((float) $order->total_ttc * (rand(30, 100) / 100), 2);
            $statut = self::STATUTS[$i % count(self::STATUTS)];
            $paymentDate = now()->subDays(rand(0, 20));

            $payment = SupplierPayment::create([
                'reference' => 'RF-PENDING',
                'payment_date' => $paymentDate,
                'supplier_id' => $supplier->id,
                'reglement' => self::REGLEMENTS[$i % count(self::REGLEMENTS)],
                'numero' => 'CHQ-'.str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT),
                'banque' => ['BMCE', 'Attijariwafa', 'Banque Populaire'][$i % 3],
                'nom_tire' => $supplier->name,
                'montant' => $amount,
                'date_decaissement' => $statut === 'Payé' ? $paymentDate : null,
                'remarque' => 'Règlement fournisseur test #'.($i + 1),
                'total_ttc' => (float) $order->total_ttc,
                'solde_ttc' => round((float) $order->total_ttc - $amount, 2),
                'statut' => $statut,
                'user_id' => $userId,
            ]);

            $payment->update(['reference' => 'RF-'.str_pad((string) $payment->id, 4, '0', STR_PAD_LEFT)]);

            SupplierPaymentAllocation::create([
                'supplier_payment_id' => $payment->id,
                'purchase_order_id' => $order->id,
                'allocation_type' => 'order',
                'amount' => $amount,
                'action' => $statut === 'Payé' ? 'Payé' : 'Inst',
            ]);

            $order->update([
                'montant_paye' => $amount,
                'payment_action' => $statut === 'Payé' ? 'Payé' : 'Inst',
            ]);
        }
    }

    private function seedClientPayments($clients, array $saleOrders, int $userId): void
    {
        for ($i = 0; $i < 10; $i++) {
            $order = $saleOrders[$i];
            $client = $clients->firstWhere('id', $order->client_id);
            $amount = round((float) $order->total_ttc * (rand(25, 100) / 100), 2);
            $statut = self::STATUTS[$i % count(self::STATUTS)];
            $paymentDate = now()->subDays(rand(0, 18));

            $payment = ClientPayment::create([
                'reference' => 'RC-PENDING',
                'payment_date' => $paymentDate,
                'client_id' => $client->id,
                'client_name' => $client->name,
                'ville_chantier' => $order->city,
                'chantier_type' => $i % 2 === 0 ? 'Public' : 'Privé',
                'montant_total' => (float) $order->total_ttc,
                'reglement' => self::REGLEMENTS[$i % count(self::REGLEMENTS)],
                'numero' => 'VIR-'.str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT),
                'banque' => ['CIH', 'BMCI', 'Crédit du Maroc'][$i % 3],
                'nom_tire' => $client->name,
                'montant' => $amount,
                'date_decaissement' => $statut === 'Payé' ? $paymentDate : null,
                'remarque' => 'Règlement client test #'.($i + 1),
                'solde' => round((float) $order->total_ttc - $amount, 2),
                'statut' => $statut,
                'user_id' => $userId,
            ]);

            $payment->update(['reference' => 'RC-'.str_pad((string) $payment->id, 4, '0', STR_PAD_LEFT)]);

            ClientPaymentAllocation::create([
                'client_payment_id' => $payment->id,
                'sales_order_id' => $order->id,
                'allocation_type' => 'order',
                'amount' => $amount,
                'action' => $statut === 'Payé' ? 'Payé' : 'Inst',
            ]);

            $order->update([
                'montant_paye' => $amount,
                'payment_action' => $statut === 'Payé' ? 'Payé' : 'Inst',
            ]);
        }
    }

    private function nextPurchaseReference(): string
    {
        $prefix = 'B-A'.now()->format('y').'/';
        $last = PurchaseOrder::where('doc_type', 'bon_achat')
            ->where('reference', 'like', $prefix.'%')
            ->where('reference', '!=', 'PENDING')
            ->pluck('reference')
            ->map(fn ($ref) => (int) substr($ref, strrpos($ref, '/') + 1))
            ->max() ?? 0;

        return $prefix.str_pad((string) ($last + 1), 4, '0', STR_PAD_LEFT);
    }

    private function nextSaleReference(): string
    {
        $prefix = 'B-V'.now()->format('y').'/';
        $last = SaleOrder::where('reference', 'like', $prefix.'%')
            ->where('reference', '!=', 'BV-PENDING')
            ->pluck('reference')
            ->map(fn ($ref) => (int) substr($ref, strrpos($ref, '/') + 1))
            ->max() ?? 0;

        return $prefix.str_pad((string) ($last + 1), 4, '0', STR_PAD_LEFT);
    }
}
