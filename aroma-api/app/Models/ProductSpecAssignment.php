<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductSpecAssignment extends Model
{
    use HasFactory;
    protected $fillable = ['product_id', 'spec_type_id', 'sort_order'];

    public function specType(): BelongsTo
    {
        return $this->belongsTo(SpecType::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
