<?php

namespace App\Models;

use App\Enums\ProductType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug', 'brand_id', 'category_id', 'name', 'name_en', 'description', 'type',
        'rating', 'reviews_count', 'is_new', 'is_bestseller', 'is_offer',
        'placeholder_bg', 'placeholder_dot',
    ];

    protected $casts = [
        'type' => ProductType::class,
        'rating' => 'decimal:2',
        'is_new' => 'boolean',
        'is_bestseller' => 'boolean',
        'is_offer' => 'boolean',
    ];

    public function brand() {
        return $this->belongsTo(Brand::class, 'brand_id', 'id');
    }

    public function category() {
        return $this->belongsTo(Category::class, 'category_id', 'id');
    }

    public function variants(): HasMany {
        return $this->hasMany(ProductVariant::class);
    }

    public function images(): HasMany {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    public function thumbnail(): ?ProductImage {
        return $this->images()->where('is_thumbnail', true)->first()
            ?? $this->images()->first();
    }

    public function notes(): HasMany {
        return $this->hasMany(ProductNote::class);
    }

    public function tags(): HasMany {
        return $this->hasMany(ProductTag::class);
    }

    public function specAssignments(): HasMany
    {
        return $this->hasMany(ProductSpecAssignment::class);
    }

    public function specValues(): HasMany
    {
        return $this->hasMany(ProductSpecValue::class);
    }
}
