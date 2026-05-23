<?php

namespace App\Services;

use App\Models\HomepageBlock;
use App\Models\Setting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class HomepageAdminService
{
    public function getConfig(): array
    {
        return [
            'hero'   => Setting::get('homepage_hero', []),
            'blocks' => HomepageBlock::orderBy('position')->get()->toArray(),
        ];
    }

    public function updateHero(array $fields, ?UploadedFile $image): void
    {
        $existing = Setting::get('homepage_hero', []);
        $bgPath   = $existing['bg_image_path'] ?? null;

        if ($image) {
            if ($bgPath) Storage::disk('public')->delete($bgPath);
            $bgPath = $image->store('homepage', 'public');
        }

        Setting::set('homepage_hero', array_merge($fields, ['bg_image_path' => $bgPath]));
    }

    public function addBlock(string $type, array $config, bool $enabled): HomepageBlock
    {
        $maxPosition = HomepageBlock::max('position') ?? 0;

        return HomepageBlock::create([
            'type'     => $type,
            'position' => $maxPosition + 1,
            'enabled'  => $enabled,
            'config'   => $config,
        ]);
    }

    public function updateBlock(HomepageBlock $block, array $data): void
    {
        $block->update($data);
    }

    public function deleteBlock(HomepageBlock $block): void
    {
        $block->delete();
    }

    public function reorder(array $order): void
    {
        foreach ($order as $item) {
            HomepageBlock::where('id', $item['id'])->update(['position' => $item['position']]);
        }
    }
}
