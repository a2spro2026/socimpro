<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sortie_orders', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 30)->unique();
            $table->string('article_ref', 100)->nullable();
            $table->date('sortie_date');
            $table->string('designation');
            $table->string('unit', 20)->nullable();
            $table->decimal('quantity', 14, 3)->default(0);
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('sortie_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sortie_order_id')->constrained('sortie_orders')->cascadeOnDelete();
            $table->string('article_ref', 100)->nullable();
            $table->string('description');
            $table->string('unit', 20)->nullable();
            $table->decimal('quantity', 14, 3)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sortie_order_items');
        Schema::dropIfExists('sortie_orders');
    }
};
