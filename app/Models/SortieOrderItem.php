<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SortieOrderItem extends Model
{
    protected $fillable = [
        'sortie_order_id',
        'article_ref',
        'description',
        'unit',
        'quantity',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(SortieOrder::class, 'sortie_order_id');
    }
}
