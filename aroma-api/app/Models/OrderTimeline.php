<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderTimeline extends Model
{
    public $timestamps = false;
    protected $table = 'order_timeline';
    protected $fillable = ['order_id', 'status', 'occurred_at', 'done', 'sort_order'];

    protected $casts = ['done' => 'boolean', 'occurred_at' => 'datetime'];

    public function order() {
        return $this->belongsTo(Order::class);
    }
}
