<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finished_products', function (Blueprint $table) {
            $table->id();
            $table->string('article_ref', 100);
            $table->string('designation');
            $table->string('unit', 20)->nullable();
            $table->decimal('quantity', 14, 3)->default(0);
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index(['article_ref', 'designation']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finished_products');
    }
};
