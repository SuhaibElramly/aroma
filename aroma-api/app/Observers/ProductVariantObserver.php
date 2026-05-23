<?php
namespace App\Observers;

use App\Models\AdminNotification;
use App\Models\ProductVariant;

class ProductVariantObserver
{
    public function updated(ProductVariant $variant): void
    {
        if (! $variant->wasChanged('stock')) {
            return;
        }

        $oldStock = $variant->getOriginal('stock');  // raw string from DB
        $newStock = $variant->stock->value;           // enum → string

        // Only notify on transition into a problem state (prevents duplicate spam)
        if (! in_array($newStock, ['low_stock', 'out_of_stock'], true)) {
            return;
        }
        if ($oldStock === $newStock) {
            return;
        }

        $variant->loadMissing('product');
        $product = $variant->product;
        $label   = $newStock === 'out_of_stock' ? 'Out of stock' : 'Low stock';

        AdminNotification::create([
            'kind'  => 'stock',
            'title' => $label . ': ' . $product->name,
            'sub'   => $newStock === 'out_of_stock' ? 'No units remaining' : 'Only ' . $variant->quantity . ' units left',
            'data'  => ['product_id' => $product->id, 'variant_id' => $variant->id],
        ]);
    }
}
