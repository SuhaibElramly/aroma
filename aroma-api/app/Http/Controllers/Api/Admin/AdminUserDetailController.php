<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CartItemResource;
use App\Http\Resources\ProductResource;
use App\Models\User;

class AdminUserDetailController extends Controller
{
    public function cart(int $userId)
    {
        $user = User::findOrFail($userId);
        $cartItems = $user->cart()
            ->with(['variant.product.brand', 'variant.product.category',
                    'variant.product.variants', 'variant.product.notes',
                    'variant.product.tags', 'variant.product.images'])
            ->get();
        return CartItemResource::collection($cartItems);
    }

    public function wishlist(int $userId)
    {
        $user = User::findOrFail($userId);
        $items = $user->wishlist()
            ->with(['product.brand', 'product.category', 'product.variants',
                    'product.notes', 'product.tags', 'product.images'])
            ->get();
        return ProductResource::collection($items->pluck('product'));
    }
}
