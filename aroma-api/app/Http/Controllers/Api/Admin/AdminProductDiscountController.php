<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductDiscount;
use Illuminate\Http\Request;

class AdminProductDiscountController extends Controller
{
    public function index(int $productId)
    {
        Product::findOrFail($productId);
        return response()->json(
            ProductDiscount::where('product_id', $productId)->orderByDesc('created_at')->get()
        );
    }

    public function store(Request $request, int $productId)
    {
        Product::findOrFail($productId);
        $data = $request->validate([
            'name'          => 'required|string|max:100',
            'type'          => 'required|in:percentage,fixed',
            'value'         => 'required|numeric|min:0',
            'scope'         => 'required|in:all,specific',
            'variant_ids'   => 'required_if:scope,specific|array|nullable',
            'variant_ids.*' => 'integer',
            'starts_at'     => 'nullable|date',
            'ends_at'       => array_filter(['nullable', 'date', $request->filled('starts_at') ? 'after_or_equal:starts_at' : null]),
        ]);

        if (!empty($data['ends_at'])) {
            $data['ends_at'] = \Carbon\Carbon::parse($data['ends_at'])->endOfDay();
        }

        $discount = ProductDiscount::create(['product_id' => $productId, 'is_active' => true] + $data);
        return response()->json($discount, 201);
    }

    public function destroy(int $productId, int $discountId)
    {
        $discount = ProductDiscount::where('product_id', $productId)->findOrFail($discountId);
        $discount->delete();
        return response()->json(null, 204);
    }

    public function toggle(int $productId, int $discountId)
    {
        $discount = ProductDiscount::where('product_id', $productId)->findOrFail($discountId);
        $discount->update(['is_active' => !$discount->is_active]);
        return response()->json($discount);
    }
}
