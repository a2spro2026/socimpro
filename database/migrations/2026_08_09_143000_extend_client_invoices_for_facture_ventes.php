<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_invoices', function (Blueprint $table) {
            $table->string('city')->nullable()->after('notes');
            $table->string('address')->nullable()->after('city');
            $table->string('reglement', 20)->nullable()->after('address');
            $table->string('echeance', 20)->nullable()->after('reglement');
            $table->string('chauffeur')->nullable()->after('echeance');
            $table->string('matricule', 50)->nullable()->after('chauffeur');
            $table->decimal('quantity', 12, 3)->nullable()->after('matricule');
            $table->decimal('unit_price', 12, 2)->nullable()->after('quantity');
            $table->decimal('subtotal', 14, 2)->nullable()->after('unit_price');
            $table->string('designation')->nullable()->after('subtotal');
            $table->string('article_ref', 100)->nullable()->after('designation');
            $table->string('unit', 20)->nullable()->after('article_ref');
            $table->foreignId('user_id')->nullable()->after('unit')->constrained()->nullOnDelete();
        });

        Schema::table('client_invoice_items', function (Blueprint $table) {
            $table->foreignId('product_id')->nullable()->after('client_invoice_id')->constrained()->nullOnDelete();
            $table->string('article_ref', 100)->nullable()->after('product_id');
            $table->string('unit', 20)->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('client_invoice_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('product_id');
            $table->dropColumn(['article_ref', 'unit']);
        });

        Schema::table('client_invoices', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn([
                'city', 'address', 'reglement', 'echeance', 'chauffeur', 'matricule',
                'quantity', 'unit_price', 'subtotal', 'designation', 'article_ref', 'unit',
            ]);
        });
    }
};
