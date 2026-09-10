<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SortieOrder extends Model
{
    protected $fillable = [
        'reference',
        'article_ref',
        'sortie_date',
        'designation',
        'unit',
        'quantity',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'sortie_date' => 'date',
            'quantity' => 'decimal:3',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SortieOrderItem::class);
    }
}
