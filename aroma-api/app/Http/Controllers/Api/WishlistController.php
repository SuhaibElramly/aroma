<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\WishlistItem;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    public function index(Request $request)
    {
        $wishlistItems = $request->user()->wishlist()
            ->with(['product.brand', 'product.category', 'product.variants', 'product.notes', 'product.tags', 'product.images'])
            ->get();

        return ProductResource::collection($wishlistItems->pluck('product'));
    }

    public function store(Request $request)
    {
        $request->validate(['product_id' => 'required|integer|exists:products,id']);

        $existing = $request->user()->wishlist()
            ->where('product_id', $request->product_id)
            ->first();

        if ($existing) {
            return new ProductResource($existing->product->load(['brand', 'category', 'variants', 'notes', 'tags', 'images']));
        }

        $wishlistItem = $request->user()->wishlist()->create($request->only(['product_id']));
        return new ProductResource($wishlistItem->product->load(['brand', 'category', 'variants', 'notes', 'tags', 'images']));
    }

    public function destroy(Request $request, int $productId)
    {
        $wishlistItem = $request->user()->wishlist()
            ->where('product_id', $productId)
            ->firstOrFail();

        $wishlistItem->delete();
        return response()->json(null, 204);
    }
}
