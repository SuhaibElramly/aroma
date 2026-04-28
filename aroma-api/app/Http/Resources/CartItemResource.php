<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CartItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $product = $this->variant->product;
        $variant = $this->variant;

        return [
            'id'        => $this->id,
            'variantId' => $this->product_variant_id,
            'product' => [
                'id' => $product->id,
                'slug' => $product->slug,
                'name' => $product->name,
                'brand' => $product->brand?->name,
                'brandId' => $product->brand_id,
                'price' => $variant->price,
                'originalPrice' => $variant->original_price,
                'sizes' => $product->variants->pluck('size')->toArray(),
                'selectedSize' => $variant->size,
                'type' => $product->type?->value,
                'category' => $product->category?->label,
                'notes' => $product->notes->groupBy('type')->map(function ($group) {
                    return $group->pluck('note')->toArray();
                })->toArray(),
                'tags' => $product->tags->pluck('tag')->toArray(),
                'description' => $product->description,
                'stock' => str_replace('_', '-', $variant->stock?->value),
                'rating' => $product->rating,
                'reviews' => $product->reviews_count,
                'new' => $product->is_new,
                'bestseller' => $product->is_bestseller,
                'offer' => $product->is_offer,
                'placeholder' => [
                    'bg' => $product->placeholder_bg,
                    'dot' => $product->placeholder_dot,
                ],
            ],
            'quantity' => $this->quantity,
        ];
    }
}
