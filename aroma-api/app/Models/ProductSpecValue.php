<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductSpecValue extends Model
{
    protected $fillable = ['product_id', 'spec_type_id', 'value', 'sort_order'];

    public function specType(): BelongsTo
    {
        return $this->belongsTo(SpecType::class);
    }
}
