<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (! Schema::hasColumn('employees', 'contract_type')) {
                $table->string('contract_type', 20)->nullable()->after('hire_date');
            }
            if (! Schema::hasColumn('employees', 'remuneration_type')) {
                $table->string('remuneration_type', 20)->nullable()->after('contract_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $cols = array_filter(['contract_type', 'remuneration_type'], fn ($c) => Schema::hasColumn('employees', $c));
            if ($cols) {
                $table->dropColumn($cols);
            }
        });
    }
};
