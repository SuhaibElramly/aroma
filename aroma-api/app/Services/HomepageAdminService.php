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
            'hero'     => Setting::get('homepage_hero', []),
            'blocks'   => HomepageBlock::orderBy('position')->get()->toArray(),
            'logo_url' => $this->getLogoUrl(),
        ];
    }

    private function getLogoUrl(): ?string
    {
        $path = Setting::get('site_logo_path');
        return $path ? asset('storage/' . $path) : null;
    }

    public function updateHero(array $fields, ?UploadedFile $image): void
    {
        $existing = Setting::get('homepage_hero', []);
        $bgPath   = $existing['bg_image_path'] ?? null;

        if ($image) {
            if ($bgPath) Storage::disk(config('filesystems.default'))->delete($bgPath);
            $bgPath = $image->store('homepage', config('filesystems.default'));
        }

        Setting::set('homepage_hero', array_merge($fields, ['bg_image_path' => $bgPath]));
    }

    public function updateLogo(UploadedFile $image): string
    {
        $existing = Setting::get('site_logo_path');
        if ($existing) Storage::disk(config('filesystems.default'))->delete($existing);
        $path = $image->store('logos', config('filesystems.default'));
        Setting::set('site_logo_path', $path);
        return asset('storage/' . $path);
    }

    public function deleteLogo(): void
    {
        $path = Setting::get('site_logo_path');
        if ($path) Storage::disk(config('filesystems.default'))->delete($path);
        Setting::set('site_logo_path', null);
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
