<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('finished_products', function (Blueprint $table) {
            $table->string('photo')->nullable()->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('finished_products', function (Blueprint $table) {
            $table->dropColumn('photo');
        });
    }
};
