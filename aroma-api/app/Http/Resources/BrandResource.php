<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class BrandResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'      => $this->id,
            'name'    => $this->name,
            'nameEn'  => $this->name_en,
            'origin'  => $this->origin,
            'tagline' => $this->tagline,
            'count'   => $this->products_count ?? $this->products()->count(),
            'bg'      => $this->bg,
            'logoUrl' => $this->logo ? Storage::disk('public')->url($this->logo) : null,
        ];
    }
}
