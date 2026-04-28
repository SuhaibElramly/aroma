<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $defaultVariant = $this->variants->firstWhere('is_default', true)
            ?? $this->variants->first();

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'nameEn' => $this->name_en,
            'brand' => $this->brand?->name_en ?: $this->brand?->name,
            'brandId' => $this->brand_id,
            'price' => $defaultVariant?->price,
            'originalPrice' => $defaultVariant?->original_price,
            'sizes' => $this->variants->pluck('size')->toArray(),
            'selectedSize' => $defaultVariant?->size,
            'type' => $this->type?->value,
            'category' => $this->category?->label,
            'notes' => $this->notes->groupBy('type')->map(function ($group) {
                return $group->pluck('note')->toArray();
            })->toArray(),
            'tags' => $this->tags->pluck('tag')->toArray(),
            'description' => $this->description,
            'stock' => str_replace('_', '-', $defaultVariant?->stock?->value),
            'variants' => $this->variants->map(fn($v) => [
                'id'            => $v->id,
                'size'          => $v->size,
                'price'         => (float) $v->price,
                'originalPrice' => $v->original_price ? (float) $v->original_price : null,
                'stock'         => str_replace('_', '-', $v->stock?->value),
                'isDefault'     => (bool) $v->is_default,
            ])->values(),
            'rating' => $this->rating,
            'reviews' => $this->reviews_count,
            'new' => $this->is_new,
            'bestseller' => $this->is_bestseller,
            'offer' => $this->is_offer,
            'placeholder' => [
                'bg'  => $this->placeholder_bg,
                'dot' => $this->placeholder_dot,
            ],
            'images'       => $this->whenLoaded('images', fn() =>
                $this->images->map(fn($img) => [
                    'id'          => $img->id,
                    'url'         => $img->url,
                    'isThumbnail' => $img->is_thumbnail,
                ])->values()
            ),
            'thumbnailUrl' => $this->whenLoaded('images', fn() =>
                $this->images->firstWhere('is_thumbnail', true)?->url
                ?? $this->images->first()?->url
            ),
        ];
    }
}
