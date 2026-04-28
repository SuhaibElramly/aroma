<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Order\CreateOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(private OrderService $orderService) {}

    public function index(Request $request)
    {
        $orders = $request->user()->orders()
            ->with(['items', 'timeline'])
            ->orderBy('created_at', 'desc')
            ->get();

        return OrderResource::collection($orders);
    }

    public function store(CreateOrderRequest $request)
    {
        $order = $this->orderService->createOrder($request->user(), $request->validated());
        return new OrderResource($order);
    }

    public function show(string $id, Request $request)
    {
        $order = $request->user()->orders()
            ->with(['items', 'timeline'])
            ->findOrFail($id);

        return new OrderResource($order);
    }

    public function cancel(string $id, Request $request)
    {
        $order = $request->user()->orders()->findOrFail($id);
        $order = $this->orderService->cancelOrder($order);

        return new OrderResource($order);
    }
}
