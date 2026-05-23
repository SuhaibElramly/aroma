<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HomepageBlock extends Model
{
    protected $fillable = ['type', 'position', 'enabled', 'config'];
    protected $casts    = ['enabled' => 'boolean', 'config' => 'array'];
}
