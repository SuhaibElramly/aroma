<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\HomepageBlock;
use App\Services\HomepageAdminService;
use Illuminate\Http\Request;

class AdminHomepageController extends Controller
{
    public function __construct(private HomepageAdminService $service) {}

    public function show(): \Illuminate\Http\JsonResponse
    {
        return response()->json($this->service->getConfig());
    }

    public function updateHero(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'headline'            => 'required|string|max:255',
            'subtext'             => 'required|string|max:1000',
            'cta_primary_label'   => 'required|string|max:100',
            'cta_primary_url'     => 'required|string|max:255',
            'cta_secondary_label' => 'required|string|max:100',
            'cta_secondary_url'   => 'required|string|max:255',
            'bg_image'            => 'nullable|image|max:4096',
        ]);

        $this->service->updateHero(
            $request->only(['headline', 'subtext', 'cta_primary_label', 'cta_primary_url',
                            'cta_secondary_label', 'cta_secondary_url']),
            $request->file('bg_image'),
        );

        return response()->json(['message' => 'Hero updated']);
    }

    public function storeBlock(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'type'    => 'required|in:bestsellers,new_arrivals,offers,categories,featured_brand',
            'config'  => 'nullable|array',
            'enabled' => 'boolean',
        ]);

        $block = $this->service->addBlock(
            $request->type,
            $request->input('config', []),
            $request->boolean('enabled', true),
        );

        return response()->json($block, 201);
    }

    public function updateBlock(Request $request, HomepageBlock $block): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'config'  => 'nullable|array',
            'enabled' => 'nullable|boolean',
        ]);

        $this->service->updateBlock($block, $request->only(['config', 'enabled']));

        return response()->json($block->fresh());
    }

    public function destroyBlock(HomepageBlock $block): \Illuminate\Http\JsonResponse
    {
        $this->service->deleteBlock($block);

        return response()->json(['message' => 'Block deleted']);
    }

    public function reorder(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'order'            => 'required|array',
            'order.*.id'       => 'required|integer|exists:homepage_blocks,id',
            'order.*.position' => 'required|integer|min:1',
        ]);

        $this->service->reorder($request->input('order'));

        return response()->json(['message' => 'Reordered']);
    }
}
