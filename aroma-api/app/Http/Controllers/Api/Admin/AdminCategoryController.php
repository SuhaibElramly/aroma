<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;

class AdminCategoryController extends Controller
{
    public function index()
    {
        $cats = Category::withCount('products')->orderBy('label')->get();
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
            'slug'  => 'required|string|unique:categories,slug',
            'label' => 'required|string',
            'bg'    => 'required|string',
        ]);
        $cat = Category::create($data);
        return response()->json(['id' => $cat->id], 201);
    }

    public function update(Request $request, int $id)
    {
        $cat = Category::findOrFail($id);
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
