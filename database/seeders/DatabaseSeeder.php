<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\Client;
use App\Models\Chantier;
use App\Models\Employee;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\PurchaseOrder;
use App\Models\Role;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\SupplierInvoice;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RoleSeeder::class);

        $adminRole = Role::where('slug', 'administrateur')->first();

        // Migrer les anciens comptes administrateur si présents
        User::whereIn('email', ['admin@batixpert.ma', 'admin@batixpert.com'])->update([
            'email' => 'admin@socimpro.com',
        ]);

        User::updateOrCreate(
            ['email' => 'admin@socimpro.com'],
            [
                'name' => 'Mr SAIID MOHAMED',
                'password' => Hash::make('password'),
                'role_id' => $adminRole->id,
                'phone' => '0600000000',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        $client = Client::firstOrCreate(
            ['name' => 'Société Atlas BTP'],
            [
                'contact_person' => 'Mohamed Alami',
                'email' => 'contact@atlasbtp.ma',
                'phone' => '0522000000',
                'city' => 'Casablanca',
                'status' => 'actif',
            ]
        );

        $supplier = Supplier::firstOrCreate(
            ['name' => 'Matériaux du Nord'],
            [
                'contact_person' => 'Karim Bennani',
                'email' => 'ventes@materiauxnord.ma',
                'phone' => '0537000000',
                'city' => 'Rabat',
                'payment_terms' => '30 jours',
                'status' => 'actif',
                'initial_balance' => 0,
            ]
        );

        $category = ProductCategory::firstOrCreate(
            ['name' => 'Matériaux de construction'],
            ['description' => 'Ciment, briques, acier...']
        );

        Product::firstOrCreate(
            ['reference' => 'CIM-001'],
            [
                'category_id' => $category->id,
                'name' => 'Ciment CPJ 45',
                'unit' => 'sac',
                'unit_price' => 65.00,
                'quantity_in_stock' => 500,
                'min_stock_alert' => 100,
                'status' => 'actif',
            ]
        );

        Employee::firstOrCreate(
            ['cin' => 'AB123456'],
            [
                'matricule' => 'EMP-00001',
                'first_name' => 'Youssef',
                'last_name' => 'Idrissi',
                'position' => 'Maçon',
                'daily_rate' => 250,
                'monthly_salary' => 5500,
                'hire_date' => now()->subYear(),
                'status' => 'actif',
            ]
        );

        $chantier = Chantier::firstOrCreate(
            ['reference' => 'CH-2025-001'],
            [
                'client_id' => $client->id,
                'name' => 'Résidence Les Oliviers',
                'address' => 'Quartier Maarif',
                'city' => 'Casablanca',
                'start_date' => now()->subMonths(3),
                'end_date' => now()->addMonths(6),
                'budget' => 2500000,
                'status' => 'en_cours',
                'progress' => 70,
            ]
        );

        $supplier = Supplier::where('name', 'Matériaux du Nord')->first();
        $employee = Employee::where('cin', 'AB123456')->first();

        PurchaseOrder::firstOrCreate(
            ['reference' => 'BA-'.now()->format('Ymd').'-0001'],
            [
                'order_date' => now(),
                'supplier_id' => $supplier->id,
                'chantier_id' => $chantier->id,
                'total_ht' => 15000,
                'tva' => 3000,
                'total_ttc' => 18000,
                'status' => 'valide',
            ]
        );

        Task::firstOrCreate(
            ['chantier_id' => $chantier->id, 'title' => 'Finition façade sud'],
            [
                'due_date' => now()->subDays(5),
                'status' => 'en_retard',
                'priority' => 'haute',
                'assigned_to' => $employee->id,
            ]
        );

        Attendance::firstOrCreate(
            ['employee_id' => $employee->id, 'date' => today()],
            ['status' => 'present', 'chantier_id' => $chantier->id]
        );

        $chantierB = Chantier::firstOrCreate(
            ['reference' => 'CH-2025-002'],
            [
                'client_id' => $client->id,
                'name' => 'Chantier B — Villa Anfa',
                'address' => 'Anfa',
                'city' => 'Casablanca',
                'start_date' => now()->subMonths(2),
                'end_date' => now()->addMonths(4),
                'budget' => 1800000,
                'status' => 'en_cours',
                'progress' => 45,
            ]
        );

        Chantier::firstOrCreate(
            ['reference' => 'CH-2025-003'],
            [
                'client_id' => $client->id,
                'name' => 'Chantier C — Immeuble Hay Riad',
                'address' => 'Hay Riad',
                'city' => 'Rabat',
                'start_date' => now()->subMonth(),
                'end_date' => now()->addMonths(8),
                'budget' => 3200000,
                'status' => 'en_cours',
                'progress' => 20,
            ]
        );

        $product = Product::where('reference', 'CIM-001')->first();

        $supplierInvoice = SupplierInvoice::firstOrCreate(
            ['reference' => 'FA-2025-0001'],
            [
                'supplier_id' => $supplier->id,
                'chantier_id' => $chantier->id,
                'invoice_date' => now()->subDays(10),
                'due_date' => now()->addDays(20),
                'total_ht' => 12000,
                'tva' => 2400,
                'total_ttc' => 14400,
                'amount_paid' => 7200,
                'status' => 'partielle',
            ]
        );

        Payment::firstOrCreate(
            ['reference' => 'REG-F-001'],
            [
                'type' => 'fournisseur',
                'payable_type' => SupplierInvoice::class,
                'payable_id' => $supplierInvoice->id,
                'amount' => 7200,
                'payment_date' => now()->subDays(5),
                'method' => 'virement',
            ]
        );

        if ($product) {
            StockMovement::firstOrCreate(
                ['product_id' => $product->id, 'type' => 'sortie', 'chantier_id' => $chantier->id, 'quantity' => 50],
                ['notes' => 'Sortie chantier A', 'user_id' => User::first()?->id]
            );
            StockMovement::firstOrCreate(
                ['product_id' => $product->id, 'type' => 'sortie', 'chantier_id' => $chantierB->id, 'quantity' => 30],
                ['notes' => 'Sortie chantier B', 'user_id' => User::first()?->id]
            );
        }
    }
}
