<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Order;

class AdminUserDetailController extends Controller
{
    public function orders(int $id)
    {
        $user = User::findOrFail($id);

        $orders = Order::with('items')
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($orders->map(fn($o) => [
            'id'        => $o->id,
            'total'     => $o->total,
            'status'    => $o->status?->value,
            'isPickup'  => $o->is_pickup,
            'itemCount' => $o->items->count(),
            'date'      => $o->created_at->format('Y-m-d H:i'),
        ])->values());
    }

    public function cart(int $id)
    {
        $user = User::findOrFail($id);

        $items = $user->cart()
            ->with(['variant.product.brand', 'variant.product.images'])
            ->get();

        return response()->json($items->map(function ($item) {
            $product = $item->variant->product;
            $variant = $item->variant;
            $thumb   = $product->images->firstWhere('is_thumbnail', true) ?? $product->images->first();

            return [
                'product' => [
                    'id'           => $product->id,
                    'name'         => $product->name,
                    'brand'        => $product->brand?->name,
                    'price'        => $variant->price,
                    'selectedSize' => $variant->size,
                    'thumbnailUrl' => $thumb?->url ?? null,
                ],
                'quantity' => $item->quantity,
            ];
        })->values());
    }

    public function wishlist(int $id)
    {
        $user = User::findOrFail($id);

        $items = $user->wishlist()
            ->with(['product.brand', 'product.variants', 'product.images'])
            ->get();

        return response()->json($items->map(function ($item) {
            $product        = $item->product;
            $defaultVariant = $product->variants->firstWhere('is_default', true)
                           ?? $product->variants->first();
            $thumb          = $product->images->firstWhere('is_thumbnail', true)
                           ?? $product->images->first();

            return [
                'id'           => $product->id,
                'name'         => $product->name,
                'brand'        => $product->brand?->name,
                'price'        => $defaultVariant?->price,
                'selectedSize' => $defaultVariant?->size,
                'stock'        => $defaultVariant?->stock?->value,
                'thumbnailUrl' => $thumb?->url ?? null,
            ];
        })->values());
    }
}
