<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RawMaterialReceipt extends Model
{
    protected $fillable = [
        'reference',
        'receipt_date',
        'supplier_id',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'receipt_date' => 'date',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(RawMaterialReceiptItem::class);
    }
}
