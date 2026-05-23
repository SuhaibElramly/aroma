<?php

namespace App\Models;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = [
        'id', 'user_id', 'status', 'payment_status', 'total', 'note', 'admin_note',
        'is_pickup', 'address_id', 'delivery_city', 'delivery_description',
        'placeholder_bg', 'placeholder_dot',
        'coupon_code', 'discount_amount',
    ];

    protected $casts = [
        'status'          => OrderStatus::class,
        'payment_status'  => PaymentStatus::class,
        'total'           => 'decimal:2',
        'is_pickup'       => 'boolean',
        'discount_amount' => 'decimal:2',
    ];

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function items() {
        return $this->hasMany(OrderItem::class);
    }

    public function timeline() {
        return $this->hasMany(OrderTimeline::class)->orderBy('sort_order');
    }

    public function payments() {
        return $this->hasMany(OrderPayment::class)->orderBy('created_at');
    }
}
