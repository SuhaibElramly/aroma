<?php

namespace Database\Seeders;

use App\Models\HomepageBlock;
use App\Models\Setting;
use Illuminate\Database\Seeder;

class HomepageBlockSeeder extends Seeder
{
    public function run(): void
    {
        Setting::set('homepage_hero', [
            'headline'            => 'حيث تبدأ الحكايات',
            'subtext'             => 'عطور مختارة من أرقى دور العطور في العالم — كلٌّ منها حكاية تنتظر أن تبدأ.',
            'cta_primary_label'   => 'استكشف المجموعة',
            'cta_primary_url'     => '/search',
            'cta_secondary_label' => 'تصفح الماركات',
            'cta_secondary_url'   => '/brands',
            'bg_image_path'       => null,
        ]);

        $blocks = [
            ['type' => 'bestsellers',    'position' => 1, 'config' => ['label' => 'أكثر العطور طلبًا', 'title' => 'الأكثر مبيعًا',   'limit' => 3]],
            ['type' => 'categories',     'position' => 2, 'config' => ['label' => 'تسوق حسب',          'title' => 'الفئة']],
            ['type' => 'new_arrivals',   'position' => 3, 'config' => ['label' => 'وصل حديثًا',         'title' => 'كل ماهو جديد',    'limit' => 4]],
            ['type' => 'featured_brand', 'position' => 4, 'config' => ['label' => 'دار مميزة',          'title' => 'Parfums de Marly', 'brand_id' => 'parfums-de-marly', 'product_limit' => 2]],
            ['type' => 'offers',         'position' => 5, 'config' => ['label' => 'وقت محدود',          'title' => 'العروض الحالية',   'limit' => 3]],
        ];

        foreach ($blocks as $block) {
            HomepageBlock::create(array_merge($block, ['enabled' => true]));
        }
    }
}
