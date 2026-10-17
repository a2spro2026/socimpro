<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Employee extends Model
{
    protected $fillable = [
        'user_id', 'first_name', 'last_name', 'matricule', 'cin', 'phone', 'email', 'address', 'position',
        'daily_rate', 'monthly_salary', 'hire_date', 'contract_type', 'remuneration_type', 'status', 'notes', 'photo',
    ];

    protected function casts(): array
    {
        return [
            'hire_date' => 'date',
            'daily_rate' => 'decimal:2',
            'monthly_salary' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function advances(): HasMany
    {
        return $this->hasMany(EmployeeAdvance::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(EmployeePayment::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(ChantierAssignment::class);
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}
