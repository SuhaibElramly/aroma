<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Enums\OrderStatus;
use Illuminate\Http\Request;

class AdminOrderController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'status'    => 'sometimes|in:placed,confirmed,preparing,ready,delivered,cancelled',
            'order_id'  => 'sometimes|string|max:100',
            'phone'     => 'sometimes|string|max:30',
            'date_from' => 'sometimes|date_format:Y-m-d',
            'date_to'   => 'sometimes|date_format:Y-m-d',
        ]);

        $query = Order::with(['user', 'items'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('order_id')) {
            $query->where('id', 'like', '%' . $request->order_id . '%');
        }

        if ($request->filled('phone')) {
            $query->whereHas('user', fn($q) => $q->where('phone', 'like', '%' . $request->phone . '%'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $orders = $query->paginate(20);

        return response()->json([
            'data' => $orders->map(fn($o) => $this->formatOrder($o)),
            'meta' => [
                'total' => $orders->total(),
                'currentPage' => $orders->currentPage(),
                'lastPage' => $orders->lastPage(),
            ],
        ]);
    }

    public function show(string $id)
    {
        $order = Order::with(['user', 'items', 'timeline'])->findOrFail($id);
        return response()->json($this->formatOrder($order, detailed: true));
    }

    public function updateStatus(Request $request, string $id)
    {
        $request->validate(['status' => 'required|in:placed,confirmed,preparing,ready,delivered,cancelled']);
        $order = Order::findOrFail($id);
        $order->update(['status' => $request->status]);

        // Mark timeline entry as done
        $statusMap = [
            'placed'    => 'Order Placed',
            'confirmed' => 'Confirmed',
            'preparing' => 'Preparing',
            'ready'     => 'Ready for Pickup',
            'delivered' => 'Delivered',
            'cancelled' => 'Cancelled',
        ];

        if (isset($statusMap[$request->status])) {
            $order->timeline()
                ->where('status', $statusMap[$request->status])
                ->update(['done' => true, 'occurred_at' => now()]);
        }

        return response()->json($this->formatOrder($order->fresh(['items', 'timeline']), detailed: true));
    }

    public function addAdminNote(Request $request, string $id)
    {
        $request->validate(['admin_note' => 'required|string|max:500']);
        $order = Order::findOrFail($id);
        $order->update(['admin_note' => $request->admin_note]);
        return response()->json(['admin_note' => $order->admin_note]);
    }

    private function formatOrder(Order $order, bool $detailed = false): array
    {
        $base = [
            'id' => $order->id,
            'user' => $order->user?->name,
            'userEmail' => $order->user?->email,
            'total' => $order->total,
            'status' => $order->status?->value,
            'isPickup' => $order->is_pickup,
            'note' => $order->note,
            'adminNote' => $order->admin_note,
            'date' => $order->created_at->format('Y-m-d H:i'),
            'itemCount' => $order->items->count(),
            'couponCode'     => $order->coupon_code,
            'discountAmount' => $order->discount_amount ? (float) $order->discount_amount : null,
        ];
        if ($detailed) {
            $base['items'] = $order->items->map(fn($i) => [
                'name' => $i->product_name,
                'brand' => $i->brand,
                'size' => $i->size,
                'qty' => $i->qty,
                'unitPrice' => $i->unit_price,
            ]);
            $base['timeline'] = $order->timeline->map(fn($t) => [
                'status' => $t->status,
                'done' => $t->done,
                'date' => $t->occurred_at?->format('Y-m-d H:i'),
            ]);
        }
        return $base;
    }
}
