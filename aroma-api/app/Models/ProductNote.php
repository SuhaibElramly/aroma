<?php

namespace App\Models;

use App\Enums\NoteType;
use Illuminate\Database\Eloquent\Model;

class ProductNote extends Model
{
    public $timestamps = false;
    protected $fillable = ['product_id', 'type', 'note'];

    protected $casts = ['type' => NoteType::class];

    public function product() {
        return $this->belongsTo(Product::class);
    }
}
