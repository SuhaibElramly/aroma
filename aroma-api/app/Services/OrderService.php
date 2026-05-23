<?php
namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Address;
use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Order;
use App\Models\OrderTimeline;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function generateOrderId(): string
    {
        $random = str_pad(rand(1000, 9999), 4, '0', STR_PAD_LEFT);
        return 'ARM-' . $random . '-' . str_pad(rand(1000, 9999), 4, '0', STR_PAD_LEFT);
    }

    public function createOrder(User $user, array $data): Order
    {
        $deliveryCity        = null;
        $deliveryDescription = null;
        $addressId           = null;

        if (! $data['is_pickup'] && ! empty($data['address_id'])) {
            $address = Address::find($data['address_id']);
            if (! $address || $address->user_id !== $user->id) {
                throw ValidationException::withMessages([
                    'address_id' => ['العنوان المحدد غير صالح.'],
                ]);
            }
            $addressId           = $address->id;
            $deliveryCity        = $address->city;
            $deliveryDescription = $address->description;
        }

        // Resolve coupon
        $coupon         = null;
        $discountAmount = 0;
        $couponCode     = null;

        if (! empty($data['coupon_code'])) {
            $coupon = Coupon::where('code', strtoupper($data['coupon_code']))->first();

            if (! $coupon || ! $coupon->is_active) {
                throw ValidationException::withMessages(['coupon_code' => ['coupon_inactive']]);
            }
            if ($coupon->expires_at && $coupon->expires_at->isPast()) {
                throw ValidationException::withMessages(['coupon_code' => ['coupon_expired']]);
            }
            if ($coupon->min_order_amount && $data['total'] < $coupon->min_order_amount) {
                throw ValidationException::withMessages(['coupon_code' => ['min_order_not_met']]);
            }
            if ($coupon->max_uses !== null && $coupon->uses_count >= $coupon->max_uses) {
                throw ValidationException::withMessages(['coupon_code' => ['max_uses_reached']]);
            }
            if ($coupon->usages()->where('user_id', $user->id)->exists()) {
                throw ValidationException::withMessages(['coupon_code' => ['already_used']]);
            }

            $discountAmount = $coupon->computeDiscount((float) $data['total']);
            $couponCode     = $coupon->code;
        }

        $finalTotal = max(0, $data['total'] - $discountAmount);
        $orderId    = $this->generateOrderId();

        $order = Order::create([
            'id'                   => $orderId,
            'user_id'              => $user->id,
            'status'               => OrderStatus::Placed,
            'total'                => $finalTotal,
            'note'                 => $data['note'] ?? null,
            'is_pickup'            => $data['is_pickup'],
            'address_id'           => $addressId,
            'delivery_city'        => $deliveryCity,
            'delivery_description' => $deliveryDescription,
            'placeholder_bg'       => '#F2E8E5',
            'placeholder_dot'      => '#C9A0A0',
            'coupon_code'          => $couponCode,
            'discount_amount'      => $discountAmount > 0 ? $discountAmount : null,
            'payment_status'       => PaymentStatus::NotPaid,
        ]);

        foreach ($data['items'] as $item) {
            $variant = \App\Models\ProductVariant::find($item['product_variant_id']);
            $order->items()->create([
                'product_variant_id' => $variant->id,
                'product_name'       => $variant->product->name,
                'brand'              => $variant->product->brand->name,
                'size'               => $variant->size,
                'qty'                => $item['quantity'],
                'unit_price'         => $variant->price,
            ]);
        }

        // Record coupon usage and increment count
        if ($coupon) {
            CouponUsage::create([
                'coupon_id' => $coupon->id,
                'user_id'   => $user->id,
                'order_id'  => $orderId,
            ]);
            $coupon->increment('uses_count');
        }

        $statuses = ['Order Placed', 'Confirmed', 'Preparing', 'Ready for Pickup', 'Delivered'];
        foreach ($statuses as $index => $status) {
            \App\Models\OrderTimeline::create([
                'order_id'   => $orderId,
                'status'     => $status,
                'done'       => $index === 0,
                'sort_order' => $index,
            ]);
        }

        return $order->load(['items', 'timeline']);
    }

    public function cancelOrder(Order $order): Order
    {
        if ($order->status !== OrderStatus::Placed) {
            throw new \Exception('Only placed orders can be cancelled');
        }

        $order->update(['status' => OrderStatus::Cancelled]);
        return $order;
    }
}
