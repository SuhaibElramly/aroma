<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    public $timestamps = false;
    protected $fillable = [
        'order_id', 'product_variant_id', 'product_name', 'brand', 'size', 'qty', 'unit_price',
    ];

    protected $casts = ['unit_price' => 'decimal:2'];

    public function order() {
        return $this->belongsTo(Order::class);
    }

    public function variant() {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
