<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    protected $fillable = [
        'name', 'contact_person', 'email', 'phone', 'address', 'city', 'ice',
        'payment_terms', 'reglement', 'status', 'notes', 'initial_balance', 'initial_balance_paid',
    ];

    protected function casts(): array
    {
        return [
            'initial_balance' => 'decimal:2',
            'initial_balance_paid' => 'decimal:2',
        ];
    }

    public function getSoldeAttribute(): float
    {
        return $this->totalSolde();
    }

    public function remainingInitialBalance(): float
    {
        return round(max((float) $this->initial_balance - (float) ($this->initial_balance_paid ?? 0), 0), 2);
    }

    /**
     * Solde fournisseur = solde initial + bons d'achat − règlements.
     * Les bons non soldés s'ajoutent donc au solde initial.
     */
    public function totalSolde(?float $totalAchats = null, ?float $montantPaye = null): float
    {
        $initial = (float) ($this->initial_balance ?? 0);

        if ($totalAchats === null) {
            $totalAchats = (float) PurchaseOrder::query()
                ->where('supplier_id', $this->id)
                ->where('status', '!=', 'annule')
                ->where(function ($q) {
                    $q->where('doc_type', 'bon_achat')
                        ->orWhereNull('doc_type')
                        ->orWhere('doc_type', '');
                })
                ->sum('total_ttc');
        }

        if ($montantPaye === null) {
            $montantPaye = (float) SupplierPayment::query()
                ->where('supplier_id', $this->id)
                ->sum('montant');
        }

        return round(max($initial + (float) $totalAchats - (float) $montantPaye, 0), 2);
    }

    public function getCodeAttribute(): string
    {
        return 'CF-'.str_pad((string) $this->id, 4, '0', STR_PAD_LEFT);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(SupplierInvoice::class);
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class);
    }
}
