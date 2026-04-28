<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['slug' => 'women',  'label' => 'نساء',              'bg' => '#F5EBE8'],
            ['slug' => 'men',    'label' => 'رجال',               'bg' => '#E8E4DC'],
            ['slug' => 'unisex', 'label' => 'يونيسكس',            'bg' => '#E4EAE6'],
            ['slug' => 'oud',    'label' => 'مجموعة العود',       'bg' => '#EDE4D0'],
            ['slug' => 'fresh',  'label' => 'طازج وحمضي',         'bg' => '#E0EAF0'],
            ['slug' => 'niche',  'label' => 'نيش ونادر',           'bg' => '#EDE8F2'],
        ];

        DB::table('categories')->insert($categories);
    }
}
