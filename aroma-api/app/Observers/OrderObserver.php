<?php
namespace App\Observers;

use App\Models\AdminNotification;
use App\Models\Order;

class OrderObserver
{
    public function created(Order $order): void
    {
        $order->loadMissing('user');
        $userName = $order->user?->name ?? 'Guest';
        $total    = number_format((float) $order->total, 0);

        AdminNotification::create([
            'kind'  => 'order',
            'title' => 'New order #' . $order->id,
            'sub'   => $userName . ' · ' . $total . ' LYD',
            'data'  => ['order_id' => $order->id],
        ]);
    }
}
