<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductDiscount extends Model
{
    protected $fillable = [
        'product_id', 'name', 'type', 'value', 'scope', 'variant_ids',
        'starts_at', 'ends_at', 'is_active',
    ];

    protected $casts = [
        'value'       => 'decimal:2',
        'variant_ids' => 'array',
        'starts_at'   => 'datetime',
        'ends_at'     => 'datetime',
        'is_active'   => 'boolean',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
