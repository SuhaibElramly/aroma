<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'name' => $this->product_name,
            'brand' => $this->brand,
            'size' => $this->size,
            'qty' => $this->qty,
            'price' => $this->unit_price,
        ];
    }
}
