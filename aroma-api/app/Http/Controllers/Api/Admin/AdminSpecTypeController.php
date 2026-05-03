<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProductSpecAssignment;
use App\Models\SpecType;
use Illuminate\Http\Request;

class AdminSpecTypeController extends Controller
{
    public function index()
    {
        $specs = SpecType::withCount('assignments as product_count')->orderBy('name')->get();

        return response()->json($specs->map(fn($s) => [
            'id'           => $s->id,
            'name'         => $s->name,
            'unit'         => $s->unit,
            'productCount' => $s->product_count,
        ]));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100|unique:spec_types,name',
            'unit' => 'nullable|string|max:20',
        ]);
        $spec = SpecType::create($data);
        return response()->json($this->fmt($spec), 201);
    }

    public function update(Request $request, int $id)
    {
        $spec = SpecType::findOrFail($id);
        $data = $request->validate([
            'name' => "sometimes|string|max:100|unique:spec_types,name,{$id}",
            'unit' => 'nullable|string|max:20',
        ]);
        $spec->update($data);
        return response()->json($this->fmt($spec->fresh()));
    }

    public function destroy(int $id)
    {
        $spec  = SpecType::findOrFail($id);
        $count = ProductSpecAssignment::where('spec_type_id', $id)->count();

        if ($count > 0) {
            return response()->json(
                ['message' => "This spec type is assigned to {$count} product(s) and cannot be deleted."],
                422
            );
        }

        $spec->delete();
        return response()->json(null, 204);
    }

    private function fmt(SpecType $s): array
    {
        return ['id' => $s->id, 'name' => $s->name, 'unit' => $s->unit, 'productCount' => 0];
    }
}
