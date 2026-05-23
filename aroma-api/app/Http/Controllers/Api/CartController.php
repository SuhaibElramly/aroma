<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CartItemResource;
use App\Models\CartItem;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function index(Request $request)
    {
        $cartItems = $request->user()->cart()
            ->with(['variant.specValues.specType', 'variant.product.brand', 'variant.product.category', 'variant.product.notes', 'variant.product.tags'])
            ->get();

        return CartItemResource::collection($cartItems);
    }

    public function store(Request $request)
    {
        $request->validate([
            'product_variant_id' => 'required|integer|exists:product_variants,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $existing = $request->user()->cart()
            ->where('product_variant_id', $request->product_variant_id)
            ->first();

        if ($existing) {
            $existing->update(['quantity' => $existing->quantity + $request->quantity]);
            $cartItem = $existing;
        } else {
            $cartItem = $request->user()->cart()->create($request->only(['product_variant_id', 'quantity']));
        }

        $cartItem = $cartItem->load(['variant.specValues.specType', 'variant.product.brand', 'variant.product.category', 'variant.product.notes', 'variant.product.tags']);

        return new CartItemResource($cartItem);
    }

    public function update(Request $request, CartItem $cartItem)
    {
        $this->authorize('update', $cartItem);

        $request->validate(['quantity' => 'required|integer|min:1']);
        $cartItem->update(['quantity' => $request->quantity]);

        return new CartItemResource($cartItem->load(['variant.specValues.specType', 'variant.product.brand', 'variant.product.category', 'variant.product.notes', 'variant.product.tags']));
    }

    public function destroy(Request $request, CartItem $cartItem)
    {
        $this->authorize('delete', $cartItem);
        $cartItem->delete();

        return response()->json(null, 204);
    }
}
