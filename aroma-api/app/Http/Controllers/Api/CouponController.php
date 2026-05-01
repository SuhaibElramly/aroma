<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    public function validate(Request $request)
    {
        $request->validate([
            'code'        => 'required|string',
            'order_total' => 'required|numeric|min:0',
        ]);

        $coupon = Coupon::where('code', strtoupper($request->code))->first();

        if (! $coupon) {
            return response()->json(['valid' => false, 'error' => 'coupon_not_found']);
        }

        if (! $coupon->is_active) {
            return response()->json(['valid' => false, 'error' => 'coupon_inactive']);
        }

        if ($coupon->expires_at && $coupon->expires_at->isPast()) {
            return response()->json(['valid' => false, 'error' => 'coupon_expired']);
        }

        if ($coupon->min_order_amount && $request->order_total < $coupon->min_order_amount) {
            return response()->json(['valid' => false, 'error' => 'min_order_not_met']);
        }

        if ($coupon->max_uses !== null && $coupon->uses_count >= $coupon->max_uses) {
            return response()->json(['valid' => false, 'error' => 'max_uses_reached']);
        }

        $alreadyUsed = $coupon->usages()->where('user_id', $request->user()->id)->exists();
        if ($alreadyUsed) {
            return response()->json(['valid' => false, 'error' => 'already_used']);
        }

        $discount   = $coupon->computeDiscount((float) $request->order_total);
        $finalTotal = max(0, $request->order_total - $discount);

        return response()->json([
            'valid'          => true,
            'type'           => $coupon->type,
            'value'          => number_format($coupon->value, 2),
            'discountAmount' => number_format($discount, 2),
            'finalTotal'     => number_format($finalTotal, 2),
        ]);
    }
}
