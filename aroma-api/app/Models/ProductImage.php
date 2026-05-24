<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class ProductImage extends Model
{
    protected $fillable = ['product_id', 'path', 'original_name', 'is_thumbnail', 'sort_order'];

    protected $casts = [
        'is_thumbnail' => 'boolean',
        'sort_order'   => 'integer',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk(config('filesystems.default'))->url($this->path);
    }
}
