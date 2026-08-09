<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class ClientInvoice extends Model
{
    protected $fillable = [
        'client_id', 'chantier_id', 'reference', 'invoice_date', 'due_date',
        'total_ht', 'tva', 'total_ttc', 'amount_paid', 'status', 'notes',
        'city', 'address', 'reglement', 'echeance', 'chauffeur', 'matricule',
        'quantity', 'unit_price', 'subtotal', 'designation', 'article_ref', 'unit', 'user_id',
    ];

    protected function casts(): array
    {
        return [
            'invoice_date' => 'date',
            'due_date' => 'date',
            'total_ht' => 'decimal:2',
            'tva' => 'decimal:2',
            'total_ttc' => 'decimal:2',
            'amount_paid' => 'decimal:2',
            'quantity' => 'decimal:3',
            'unit_price' => 'decimal:2',
            'subtotal' => 'decimal:2',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function chantier(): BelongsTo
    {
        return $this->belongsTo(Chantier::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(ClientInvoiceItem::class);
    }

    public function payments(): MorphMany
    {
        return $this->morphMany(Payment::class, 'payable');
    }

    public function remainingAmount(): float
    {
        return (float) $this->total_ttc - (float) $this->amount_paid;
    }
}
