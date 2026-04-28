<?php
namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Address;
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

        $orderId = $this->generateOrderId();

        $order = Order::create([
            'id'                   => $orderId,
            'user_id'              => $user->id,
            'status'               => OrderStatus::Placed,
            'total'                => $data['total'],
            'note'                 => $data['note'] ?? null,
            'is_pickup'            => $data['is_pickup'],
            'address_id'           => $addressId,
            'delivery_city'        => $deliveryCity,
            'delivery_description' => $deliveryDescription,
            'placeholder_bg'       => '#F2E8E5',
            'placeholder_dot'      => '#C9A0A0',
        ]);

        foreach ($data['items'] as $item) {
            $variant = \App\Models\ProductVariant::find($item['product_variant_id']);
            $order->items()->create([
                'product_variant_id' => $variant->id,
                'product_name' => $variant->product->name,
                'brand' => $variant->product->brand->name,
                'size' => $variant->size,
                'qty' => $item['quantity'],
                'unit_price' => $variant->price,
            ]);
        }

        $statuses = ['Order Placed', 'Confirmed', 'Preparing', 'Ready for Pickup', 'Delivered'];
        foreach ($statuses as $index => $status) {
            OrderTimeline::create([
                'order_id' => $orderId,
                'status' => $status,
                'done' => $index === 0,
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
