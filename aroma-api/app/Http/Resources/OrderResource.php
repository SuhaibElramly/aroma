<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'date' => $this->created_at->format('Y-m-d H:i:s'),
            'status' => str_replace('_', '', $this->status?->value),
            'items' => OrderItemResource::collection($this->items),
            'total' => $this->total,
            'timeline' => $this->timeline->map(function ($entry) {
                return [
                    'status' => str_replace('_', '', $entry->status),
                    'date' => $entry->occurred_at?->format('Y-m-d') ?? null,
                    'time' => $entry->occurred_at?->format('H:i:s') ?? null,
                    'done' => $entry->done,
                ];
            })->toArray(),
            'note' => $this->note,
            'adminNote' => $this->admin_note,
            'deliveryAddress' => $this->is_pickup ? null : [
                'city'        => $this->delivery_city,
                'description' => $this->delivery_description,
            ],
            'placeholder' => [
                'bg' => $this->placeholder_bg,
                'dot' => $this->placeholder_dot,
            ],
        ];
    }
}
