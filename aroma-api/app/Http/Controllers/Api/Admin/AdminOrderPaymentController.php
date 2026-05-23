<?php
namespace App\Http\Controllers\Api\Admin;

use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderPayment;
use Illuminate\Http\Request;

class AdminOrderPaymentController extends Controller
{
    public function index(string $orderId)
    {
        $order = Order::with('payments')->findOrFail($orderId);

        return response()->json([
            'paymentStatus' => $order->payment_status?->value,
            'total'         => (float) $order->total,
            'paid'          => (float) $order->payments->sum('amount'),
            'payments'      => $order->payments->map(fn($p) => [
                'id'        => $p->id,
                'amount'    => (float) $p->amount,
                'note'      => $p->note,
                'createdAt' => $p->created_at->format('Y-m-d H:i'),
            ]),
        ]);
    }

    public function store(Request $request, string $orderId)
    {
        $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'note'   => 'nullable|string|max:255',
        ]);

        $order = Order::with('payments')->findOrFail($orderId);

        OrderPayment::create([
            'order_id' => $order->id,
            'amount'   => $request->amount,
            'note'     => $request->note,
        ]);

        // Reload payments after insertion
        $order->load('payments');
        $paidTotal = (float) $order->payments->sum('amount');
        $orderTotal = (float) $order->total;

        $newStatus = match(true) {
            $paidTotal <= 0               => PaymentStatus::NotPaid,
            $paidTotal >= $orderTotal     => PaymentStatus::Paid,
            default                       => PaymentStatus::PartiallyPaid,
        };

        $order->update(['payment_status' => $newStatus]);

        return response()->json([
            'paymentStatus' => $order->payment_status->value,
            'total'         => $orderTotal,
            'paid'          => $paidTotal,
            'payments'      => $order->payments->map(fn($p) => [
                'id'        => $p->id,
                'amount'    => (float) $p->amount,
                'note'      => $p->note,
                'createdAt' => $p->created_at->format('Y-m-d H:i'),
            ]),
        ]);
    }
}
