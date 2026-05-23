<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Http\Resources\BrandResource;
use App\Http\Resources\CategoryResource;
use App\Services\HomeService;

class HomeController extends Controller
{
    public function index(HomeService $homeService)
    {
        $data = $homeService->getHomeData();

        return response()->json([
            'featuredBrand' => $data['featuredBrand'] ? new BrandResource($data['featuredBrand']) : null,
            'featuredBrandProducts' => ProductResource::collection($data['featuredBrandProducts']),
            'bestsellers' => ProductResource::collection($data['bestsellers']),
            'newArrivals' => ProductResource::collection($data['newArrivals']),
            'offers' => ProductResource::collection($data['offers']),
            'categories' => CategoryResource::collection($data['categories']),
            'brands' => BrandResource::collection($data['brands']),
        ]);
    }
}
