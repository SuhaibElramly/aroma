<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VariantSpecValue extends Model
{
    protected $fillable = ['variant_id', 'spec_type_id', 'value'];

    public function specType(): BelongsTo
    {
        return $this->belongsTo(SpecType::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }
}
