<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdminBrandController extends Controller
{
    public function index(Request $request)
    {
        $query = Brand::withCount('products');

        if ($request->filled('name')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->name . '%')
                  ->orWhere('name_en', 'like', '%' . $request->name . '%');
            });
        }

        if ($request->filled('origin')) {
            $query->where('origin', 'like', '%' . $request->origin . '%');
        }

        if ($request->filled('tagline')) {
            $query->where('tagline', 'like', '%' . $request->tagline . '%');
        }

        if ($request->filled('min_products')) {
            $query->whereRaw(
                '(SELECT COUNT(*) FROM products WHERE products.brand_id = brands.id) >= ?',
                [(int) $request->min_products]
            );
        }

        if ($request->filled('max_products')) {
            $query->whereRaw(
                '(SELECT COUNT(*) FROM products WHERE products.brand_id = brands.id) <= ?',
                [(int) $request->max_products]
            );
        }

        $brands = $query->orderBy('name')->get();

        return response()->json($brands->map(fn ($b) => [
            'id'           => $b->id,
            'name'         => $b->name,
            'nameEn'       => $b->name_en,
            'origin'       => $b->origin,
            'tagline'      => $b->tagline,
            'bg'           => $b->bg,
            'logoUrl'      => $b->logo ? Storage::disk('public')->url($b->logo) : null,
            'productCount' => $b->products_count,
        ]));
    }

    public function show(string $id)
    {
        $brand = Brand::withCount('products')->findOrFail($id);

        return response()->json([
            'id'           => $brand->id,
            'name'         => $brand->name,
            'nameEn'       => $brand->name_en,
            'origin'       => $brand->origin,
            'tagline'      => $brand->tagline,
            'bg'           => $brand->bg,
            'logoUrl'      => $brand->logo ? Storage::disk('public')->url($brand->logo) : null,
            'productCount' => $brand->products_count,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id'       => 'required|string|unique:brands,id',
            'name'     => 'required|string',
            'name_en'  => 'nullable|string',
            'origin'   => 'nullable|string',
            'tagline'  => 'nullable|string',
            'bg'       => 'required|string',
        ]);
        $brand = Brand::create($data);
        return response()->json(['id' => $brand->id], 201);
    }

    public function update(Request $request, string $id)
    {
        $brand = Brand::findOrFail($id);
        $data  = $request->validate([
            'name'    => 'sometimes|string',
            'name_en' => 'nullable|string',
            'origin'  => 'nullable|string',
            'tagline' => 'nullable|string',
            'bg'      => 'sometimes|string',
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

    public function uploadLogo(Request $request, string $id)
    {
        $brand = Brand::findOrFail($id);

        $request->validate([
            'logo' => 'required|file|image|max:2048',
        ]);

        // Delete previous logo file if one exists
        if ($brand->logo) {
            Storage::disk('public')->delete($brand->logo);
        }

        $file     = $request->file('logo');
        $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path     = $file->storeAs("brands/{$id}", $filename, 'public');

        if ($path === false) {
            return response()->json(['message' => 'File could not be stored.'], 500);
        }

        $brand->update(['logo' => $path]);

        return response()->json([
            'logoUrl' => Storage::disk('public')->url($path),
        ]);
    }

    public function destroyLogo(string $id)
    {
        $brand = Brand::findOrFail($id);

        if ($brand->logo) {
            Storage::disk('public')->delete($brand->logo);
            $brand->update(['logo' => null]);
        }

        return response()->json(null, 204);
    }
}
