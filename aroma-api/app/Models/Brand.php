<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Brand extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = ['id', 'name', 'origin', 'tagline', 'bg'];

    public function products() {
        return $this->hasMany(Product::class, 'brand_id', 'id');
    }
}
