<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChargeApiController;
use App\Http\Controllers\Api\ChantierApiController;
use App\Http\Controllers\Api\ClientInvoiceApiController;
use App\Http\Controllers\Api\ClientOrderApiController;
use App\Http\Controllers\Api\ClientPaymentApiController;
use App\Http\Controllers\Api\ClientApiController;
use App\Http\Controllers\Api\DashboardApiController;
use App\Http\Controllers\Api\DocumentApiController;
use App\Http\Controllers\Api\EmployeeApiController;
use App\Http\Controllers\Api\ExpenseApiController;
use App\Http\Controllers\Api\FinishedProductApiController;
use App\Http\Controllers\Api\ProductApiController;
use App\Http\Controllers\Api\ProductionOrderApiController;
use App\Http\Controllers\Api\PurchaseOrderApiController;
use App\Http\Controllers\Api\SaleOrderApiController;
use App\Http\Controllers\Api\StockApiController;
use App\Http\Controllers\Api\SupplierInvoiceApiController;
use App\Http\Controllers\Api\SupplierPaymentApiController;
use App\Http\Controllers\Api\QuoteApiController;
use App\Http\Controllers\Api\RawMaterialStockApiController;
use App\Http\Controllers\Api\ReportApiController;
use App\Http\Controllers\Api\SupplierApiController;
use App\Http\Controllers\Api\TaskApiController;
use App\Http\Controllers\Api\TransactionApiController;
use App\Http\Controllers\Api\UserApiController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    Route::get('/dashboard', [DashboardApiController::class, 'index']);

    Route::apiResource('chantiers', ChantierApiController::class);
    Route::post('chantiers/{chantier}/archive', [ChantierApiController::class, 'archive']);

    Route::apiResource('clients', ClientApiController::class);
    Route::get('client-payments/meta', [ClientPaymentApiController::class, 'meta']);
    Route::get('client-payments/orders', [ClientPaymentApiController::class, 'orders']);
    Route::patch('client-payments/orders/{sales_order}/action', [ClientPaymentApiController::class, 'updateAction']);
    Route::get('client-payments', [ClientPaymentApiController::class, 'index']);
    Route::post('client-payments', [ClientPaymentApiController::class, 'store']);
    Route::get('client-payments/{client_payment}', [ClientPaymentApiController::class, 'show']);
    Route::put('client-payments/{client_payment}', [ClientPaymentApiController::class, 'update']);
    Route::patch('client-payments/{client_payment}/statut', [ClientPaymentApiController::class, 'updateStatut']);
    Route::delete('client-payments/{client_payment}', [ClientPaymentApiController::class, 'destroy']);
    Route::get('client-orders/balance', [ClientOrderApiController::class, 'balance']);
    Route::apiResource('client-orders', ClientOrderApiController::class)->only(['index', 'show']);
    Route::get('raw-material-stock/meta', [RawMaterialStockApiController::class, 'meta']);
    Route::get('raw-material-stock', [RawMaterialStockApiController::class, 'index']);
    Route::post('raw-material-stock', [RawMaterialStockApiController::class, 'store']);

    Route::apiResource('quotes', QuoteApiController::class);
    Route::post('quotes/{quote}/send', [QuoteApiController::class, 'send']);
    Route::post('quotes/{quote}/validate', [QuoteApiController::class, 'validateQuote']);
    Route::apiResource('suppliers', SupplierApiController::class);
    Route::apiResource('products', ProductApiController::class);
    Route::get('stock/matiere-premiere', [StockApiController::class, 'matierePremiere']);
    Route::apiResource('production-orders', ProductionOrderApiController::class);
    Route::apiResource('finished-products', FinishedProductApiController::class);
    Route::get('purchase-orders/balance', [PurchaseOrderApiController::class, 'balance']);
    Route::apiResource('purchase-orders', PurchaseOrderApiController::class);
    Route::post('purchase-orders/{purchase_order}/validate', [PurchaseOrderApiController::class, 'validateOrder']);
    Route::apiResource('sales-orders', SaleOrderApiController::class);
    Route::post('sales-orders/{sales_order}/validate', [SaleOrderApiController::class, 'validateOrder']);

    Route::get('supplier-invoices/meta', [SupplierInvoiceApiController::class, 'meta']);
    Route::apiResource('supplier-invoices', SupplierInvoiceApiController::class);

    Route::get('client-invoices/meta', [ClientInvoiceApiController::class, 'meta']);
    Route::apiResource('client-invoices', ClientInvoiceApiController::class);

    Route::get('supplier-payments/meta', [SupplierPaymentApiController::class, 'meta']);
    Route::get('supplier-payments/orders', [SupplierPaymentApiController::class, 'orders']);
    Route::patch('supplier-payments/orders/{purchase_order}/action', [SupplierPaymentApiController::class, 'updateAction']);
    Route::get('supplier-payments', [SupplierPaymentApiController::class, 'index']);
    Route::post('supplier-payments', [SupplierPaymentApiController::class, 'store']);
    Route::get('supplier-payments/{supplier_payment}', [SupplierPaymentApiController::class, 'show']);
    Route::put('supplier-payments/{supplier_payment}', [SupplierPaymentApiController::class, 'update']);
    Route::patch('supplier-payments/{supplier_payment}/statut', [SupplierPaymentApiController::class, 'updateStatut']);
    Route::delete('supplier-payments/{supplier_payment}', [SupplierPaymentApiController::class, 'destroy']);

    Route::apiResource('employees', EmployeeApiController::class);
    Route::apiResource('expenses', ExpenseApiController::class);
    Route::get('charges/meta', [ChargeApiController::class, 'meta']);
    Route::apiResource('charges', ChargeApiController::class);
    Route::apiResource('transactions', TransactionApiController::class)
        ->parameters(['transactions' => 'monetary_transaction']);
    Route::apiResource('documents', DocumentApiController::class)->except(['update']);
    Route::get('documents/{document}/download', [DocumentApiController::class, 'download']);

    Route::get('/tasks', [TaskApiController::class, 'index']);
    Route::get('/tasks/overdue', [TaskApiController::class, 'overdue']);
    Route::post('/tasks', [TaskApiController::class, 'store']);
    Route::put('/tasks/{task}', [TaskApiController::class, 'update']);

    Route::get('/reports/financial', [ReportApiController::class, 'financial']);
    Route::get('/reports/export/{type}', [ReportApiController::class, 'export']);

    Route::apiResource('users', UserApiController::class);
    Route::post('users/{user}/suspend', [UserApiController::class, 'suspend']);
});
