<?php

namespace App\Models;

use App\Enums\StockStatus;
use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id', 'size', 'price', 'original_price',
        'quantity', 'low_stock_threshold', 'stock', 'is_default',
    ];

    protected $casts = [
        'price'               => 'decimal:2',
        'original_price'      => 'decimal:2',
        'quantity'            => 'integer',
        'low_stock_threshold' => 'integer',
        'stock'               => StockStatus::class,
        'is_default'          => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saving(function (ProductVariant $variant) {
            $variant->stock = self::computeStock(
                $variant->quantity ?? 0,
                $variant->low_stock_threshold ?? 5,
            );
        });

        static::created(function (ProductVariant $variant) {
            $count = static::where('product_id', $variant->product_id)->count();
            if ($count === 1) {
                $variant->updateQuietly(['is_default' => true]);
            }
        });
    }

    public static function computeStock(int $quantity, int $threshold): string
    {
        if ($quantity === 0)          return 'out_of_stock';
        if ($quantity <= $threshold)  return 'low_stock';
        return 'in_stock';
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
