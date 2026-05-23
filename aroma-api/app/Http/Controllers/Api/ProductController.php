<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Product\ProductFilterRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\ProductService;

class ProductController extends Controller
{
    public function __construct(private ProductService $productService) {}

    public function index(ProductFilterRequest $request)
    {
        $filters = $request->validated();
        $products = $this->productService->search($filters)->paginate(9);
        return ProductResource::collection($products);
    }

    public function show(string $slug)
    {
        $product = Product::where('slug', $slug)
            ->with(['brand', 'category', 'variants.specValues.specType', 'notes', 'tags', 'images'])
            ->firstOrFail();

        return new ProductResource($product);
    }

    public function similar(int $id)
    {
        $products = $this->productService->getSimilar($id);
        return ProductResource::collection($products);
    }
}
