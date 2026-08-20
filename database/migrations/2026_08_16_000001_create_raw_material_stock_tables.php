<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('raw_material_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->date('receipt_date');
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('raw_material_receipt_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('raw_material_receipt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('article_ref')->nullable();
            $table->string('designation');
            $table->decimal('quantity', 12, 3)->default(0);
            $table->string('unit')->nullable();
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('raw_material_receipt_items');
        Schema::dropIfExists('raw_material_receipts');
    }
};
