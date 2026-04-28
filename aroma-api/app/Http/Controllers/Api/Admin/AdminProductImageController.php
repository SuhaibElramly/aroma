<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdminProductImageController extends Controller
{
    public function index(int $productId)
    {
        $product = Product::findOrFail($productId);
        return response()->json($product->images->map(fn($img) => $this->fmt($img)));
    }

    public function store(Request $request, int $productId)
    {
        $product = Product::findOrFail($productId);

        $request->validate([
            'images'   => 'required|array|min:1',
            'images.*' => 'required|file|image|max:5120', // 5 MB per image
        ]);

        $nextOrder = $product->images()->max('sort_order') + 1;
        $isFirst   = $product->images()->count() === 0;
        $created   = [];

        foreach ($request->file('images') as $index => $file) {
            $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
            $path     = $file->storeAs("products/{$productId}", $filename, 'public');

            $created[] = ProductImage::create([
                'product_id'    => $productId,
                'path'          => $path,
                'original_name' => $file->getClientOriginalName(),
                'is_thumbnail'  => $isFirst && $index === 0, // first upload auto-thumbnails the first image
                'sort_order'    => $nextOrder + $index,
            ]);
        }

        return response()->json(array_map(fn($img) => $this->fmt($img), $created), 201);
    }

    public function setThumbnail(int $productId, int $imageId)
    {
        $product = Product::findOrFail($productId);

        // Clear existing thumbnail
        $product->images()->update(['is_thumbnail' => false]);

        $image = ProductImage::where('product_id', $productId)->findOrFail($imageId);
        $image->update(['is_thumbnail' => true]);

        return response()->json($this->fmt($image));
    }

    public function destroy(int $productId, int $imageId)
    {
        $image = ProductImage::where('product_id', $productId)->findOrFail($imageId);
        Storage::disk('public')->delete($image->path);

        $wasThumbnail = $image->is_thumbnail;
        $image->delete();

        // Promote next image to thumbnail if the deleted one was the thumbnail
        if ($wasThumbnail) {
            $next = ProductImage::where('product_id', $productId)->orderBy('sort_order')->first();
            $next?->update(['is_thumbnail' => true]);
        }

        return response()->json(null, 204);
    }

    private function fmt(ProductImage $img): array
    {
        return [
            'id'           => $img->id,
            'url'          => Storage::disk('public')->url($img->path),
            'originalName' => $img->original_name,
            'isThumbnail'  => $img->is_thumbnail,
            'sortOrder'    => $img->sort_order,
        ];
    }
}
