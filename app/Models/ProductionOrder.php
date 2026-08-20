<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionOrder extends Model
{
    protected $fillable = [
        'reference',
        'article_ref',
        'production_date',
        'designation',
        'unit',
        'quantity',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'production_date' => 'date',
            'quantity' => 'decimal:3',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
