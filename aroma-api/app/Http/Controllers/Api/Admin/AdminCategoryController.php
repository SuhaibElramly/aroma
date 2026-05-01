<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminCategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Category::withCount('products');

        if ($request->filled('label')) {
            $query->where('label', 'like', '%' . $request->label . '%');
        }

        if ($request->filled('min_products')) {
            $query->whereRaw(
                '(SELECT COUNT(*) FROM products WHERE products.category_id = categories.id) >= ?',
                [(int) $request->min_products]
            );
        }

        if ($request->filled('max_products')) {
            $query->whereRaw(
                '(SELECT COUNT(*) FROM products WHERE products.category_id = categories.id) <= ?',
                [(int) $request->max_products]
            );
        }

        $cats = $query->orderBy('label')->get();

        return response()->json($cats->map(fn($c) => [
            'id'           => $c->id,
            'slug'         => $c->slug,
            'label'        => $c->label,
            'bg'           => $c->bg,
            'productCount' => $c->products_count,
        ]));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'label' => 'required|string',
            'bg'    => 'required|string',
        ]);

        $base = Str::slug($data['label']);
        $slug = $base;
        $i    = 2;
        while (Category::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $i++;
        }
        $data['slug'] = $slug;

        $cat = Category::create($data);
        return response()->json(['id' => $cat->id], 201);
    }

    public function update(Request $request, int $id)
    {
        $cat  = Category::findOrFail($id);
        $data = $request->validate([
            'label' => 'sometimes|string',
            'bg'    => 'sometimes|string',
        ]);
        $cat->update($data);
        return response()->json(['id' => $cat->id]);
    }

    public function destroy(int $id)
    {
        Category::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
