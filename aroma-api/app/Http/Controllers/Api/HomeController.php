<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\HomeService;

class HomeController extends Controller
{
    public function index(HomeService $homeService)
    {
        return response()->json([
            'hero'   => $homeService->getHero(),
            'blocks' => $homeService->getBlocks(),
        ]);
    }
}
