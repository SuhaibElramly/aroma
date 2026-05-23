<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'search'      => 'sometimes|string|max:100',
            'phone'       => 'sometimes|string|max:30',
            'joined_from' => 'sometimes|date_format:Y-m-d',
            'joined_to'   => 'sometimes|date_format:Y-m-d',
            'min_orders'  => 'sometimes|integer|min:0',
            'max_orders'  => 'sometimes|integer|min:0',
        ]);

        $query = User::where('is_admin', false)
            ->withCount('orders')
            ->orderByDesc('created_at');

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%");
            });
        }

        if ($request->filled('phone')) {
            $query->where('phone', 'like', "%{$request->phone}%");
        }

        if ($request->filled('joined_from')) {
            $query->whereDate('created_at', '>=', $request->joined_from);
        }

        if ($request->filled('joined_to')) {
            $query->whereDate('created_at', '<=', $request->joined_to);
        }

        if ($request->filled('min_orders')) {
            $query->has('orders', '>=', $request->integer('min_orders'));
        }

        if ($request->filled('max_orders')) {
            $query->has('orders', '<=', $request->integer('max_orders'));
        }

        $users = $query->paginate(20);

        return response()->json([
            'data' => $users->map(fn($u) => $this->formatRow($u)),
            'meta' => [
                'total' => $users->total(),
                'currentPage' => $users->currentPage(),
                'lastPage' => $users->lastPage(),
            ],
        ]);
    }

    public function show(int $id)
    {
        $user = User::where('is_admin', false)
            ->withCount('orders')
            ->findOrFail($id);

        return response()->json($this->formatRow($user));
    }

    private function formatRow(User $u): array
    {
        return [
            'id'         => $u->id,
            'name'       => $u->name,
            'email'      => $u->email,
            'phone'      => $u->phone,
            'orderCount' => $u->orders_count,
            'joinedAt'   => $u->created_at->format('Y-m-d'),
        ];
    }
}
