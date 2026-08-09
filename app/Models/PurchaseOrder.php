<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    protected $fillable = [
        'reference', 'doc_type', 'bc_number', 'order_date', 'supplier_id', 'chantier_id',
        'designation', 'article_ref', 'consistance', 'unit', 'unit_price', 'quantity', 'subtotal',
        'reglement', 'echeance', 'city', 'client_livre', 'chauffeur', 'matricule',
        'address', 'chantier_type', 'responsible_name',
        'total_ht', 'tva', 'total_ttc', 'montant_paye', 'payment_action', 'status', 'notes', 'user_id',
    ];

    protected function casts(): array
    {
        return [
            'order_date' => 'date',
            'unit_price' => 'decimal:2',
            'quantity' => 'decimal:3',
            'subtotal' => 'decimal:2',
            'total_ttc' => 'decimal:2',
            'montant_paye' => 'decimal:2',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function chantier(): BelongsTo
    {
        return $this->belongsTo(Chantier::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
