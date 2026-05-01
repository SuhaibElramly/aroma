<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\Request;

class AdminCouponController extends Controller
{
    public function index(Request $request)
    {
        $query = Coupon::orderByDesc('created_at');

        if ($request->filled('search')) {
            $query->where('code', 'like', '%' . strtoupper($request->search) . '%');
        }

        return response()->json($query->get()->map(fn($c) => $this->format($c)));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code'             => 'required|string|min:4|unique:coupons,code',
            'type'             => 'required|in:percentage,fixed',
            'value'            => [
                'required', 'numeric', 'min:0.01',
                function ($attr, $val, $fail) use ($request) {
                    if ($request->type === 'percentage' && $val > 100) {
                        $fail('Percentage value cannot exceed 100.');
                    }
                },
            ],
            'min_order_amount' => 'nullable|numeric|min:0',
            'max_uses'         => 'nullable|integer|min:1',
            'expires_at'       => 'nullable|date|after:today',
            'is_active'        => 'boolean',
        ]);

        $data['code'] = strtoupper($data['code']);
        $coupon = Coupon::create($data);

        return response()->json($this->format($coupon), 201);
    }

    public function update(Request $request, int $id)
    {
        $coupon = Coupon::findOrFail($id);

        $data = $request->validate([
            'code'             => "sometimes|string|min:4|unique:coupons,code,{$id}",
            'type'             => 'sometimes|in:percentage,fixed',
            'value'            => [
                'sometimes', 'numeric', 'min:0.01',
                function ($attr, $val, $fail) use ($request, $coupon) {
                    $type = $request->type ?? $coupon->type;
                    if ($type === 'percentage' && $val > 100) {
                        $fail('Percentage value cannot exceed 100.');
                    }
                },
            ],
            'min_order_amount' => 'nullable|numeric|min:0',
            'max_uses'         => 'nullable|integer|min:1',
            'expires_at'       => 'nullable|date',
            'is_active'        => 'boolean',
        ]);

        if (isset($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }

        $coupon->update($data);

        return response()->json($this->format($coupon->fresh()));
    }

    public function toggle(int $id)
    {
        $coupon = Coupon::findOrFail($id);
        $coupon->update(['is_active' => ! $coupon->is_active]);

        return response()->json($this->format($coupon->fresh()));
    }

    public function destroy(int $id)
    {
        $coupon = Coupon::findOrFail($id);

        if ($coupon->usages()->exists()) {
            return response()->json([
                'message' => 'Cannot delete a coupon that has been used. Deactivate it instead.',
            ], 422);
        }

        $coupon->delete();
        return response()->json(null, 204);
    }

    private function format(Coupon $c): array
    {
        return [
            'id'             => $c->id,
            'code'           => $c->code,
            'type'           => $c->type,
            'value'          => $c->value,
            'minOrderAmount' => $c->min_order_amount,
            'maxUses'        => $c->max_uses,
            'usesCount'      => $c->uses_count,
            'expiresAt'      => $c->expires_at?->toISOString(),
            'isActive'       => $c->is_active,
            'createdAt'      => $c->created_at->toISOString(),
        ];
    }
}
