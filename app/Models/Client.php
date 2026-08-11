<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    protected $fillable = [
        'name', 'contact_person', 'email', 'phone', 'address', 'city', 'ice', 'status', 'notes',
        'chantier_type', 'reglement', 'chantier_address', 'budget', 'initial_balance_paid', 'work_delay',
    ];

    protected function casts(): array
    {
        return [
            'budget' => 'decimal:2',
            'initial_balance_paid' => 'decimal:2',
        ];
    }

    public function remainingInitialBalance(): float
    {
        return round(max((float) ($this->budget ?? 0) - (float) ($this->initial_balance_paid ?? 0), 0), 2);
    }

    /**
     * Solde client total = solde initial + ventes − paiements.
     */
    public function totalSolde(?float $totalVentes = null, ?float $montantPaye = null): float
    {
        $budget = (float) ($this->budget ?? 0);

        if ($totalVentes === null) {
            $totalVentes = (float) SaleOrder::query()
                ->where('client_id', $this->id)
                ->where('status', '!=', 'annule')
                ->sum('total_ttc')
                + (float) ClientOrder::query()
                    ->where('client_id', $this->id)
                    ->where('status', '!=', 'annule')
                    ->sum('total_ttc');
        }

        if ($montantPaye === null) {
            $montantPaye = (float) ClientPayment::query()
                ->where('client_id', $this->id)
                ->sum('montant');
        }

        return round(max($budget + (float) $totalVentes - (float) $montantPaye, 0), 2);
    }

    public function getCodeAttribute(): string
    {
        return 'CR-'.str_pad((string) $this->id, 4, '0', STR_PAD_LEFT);
    }

    public function chantiers(): HasMany
    {
        return $this->hasMany(Chantier::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(ClientInvoice::class);
    }

    public function saleOrders(): HasMany
    {
        return $this->hasMany(SaleOrder::class);
    }

    public function clientOrders(): HasMany
    {
        return $this->hasMany(ClientOrder::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(ClientPayment::class);
    }
}
