<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\Request;

class AdminBrandController extends Controller
{
    public function index()
    {
        $brands = Brand::withCount('products')->orderBy('name')->get();
        return response()->json($brands->map(fn($b) => [
            'id' => $b->id,
            'name' => $b->name,
            'nameEn' => $b->name_en,
            'origin' => $b->origin,
            'tagline' => $b->tagline,
            'bg' => $b->bg,
            'productCount' => $b->products_count,
        ]));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string|unique:brands,id',
            'name' => 'required|string',
            'name_en' => 'nullable|string',
            'origin' => 'nullable|string',
            'tagline' => 'nullable|string',
            'bg' => 'required|string',
        ]);
        $brand = Brand::create($data);
        return response()->json(['id' => $brand->id], 201);
    }

    public function update(Request $request, string $id)
    {
        $brand = Brand::findOrFail($id);
        $data = $request->validate([
            'name' => 'sometimes|string',
            'name_en' => 'nullable|string',
            'origin' => 'nullable|string',
            'tagline' => 'nullable|string',
            'bg' => 'sometimes|string',
        ]);
        $brand->update($data);
        return response()->json(['id' => $brand->id]);
    }

    public function destroy(string $id)
    {
        $brand = Brand::withCount('products')->findOrFail($id);

        if ($brand->products_count > 0) {
            return response()->json([
                'message' => "Cannot delete brand with {$brand->products_count} product(s). Reassign or delete products first.",
            ], 422);
        }

        $brand->delete();
        return response()->json(null, 204);
    }
}
