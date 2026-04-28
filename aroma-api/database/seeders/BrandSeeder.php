<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BrandSeeder extends Seeder
{
    public function run(): void
    {
        $brands = [
            [
                'id'      => 'dior',
                'name'    => 'ديور',
                'name_en' => 'Dior',
                'origin'  => 'باريس، فرنسا',
                'tagline' => 'إرث من الأناقة الفرنسية منذ ١٩٤٦',
                'bg'      => '#F2EBE4',
            ],
            [
                'id'      => 'chanel',
                'name'    => 'شانيل',
                'name_en' => 'Chanel',
                'origin'  => 'باريس، فرنسا',
                'tagline' => 'لا تُقلَّد، ولا تُنسى',
                'bg'      => '#E8E8E8',
            ],
            [
                'id'      => 'tom-ford',
                'name'    => 'توم فورد',
                'name_en' => 'Tom Ford',
                'origin'  => 'نيويورك، أمريكا',
                'tagline' => 'جرأة تتحدى الزمن',
                'bg'      => '#E5E0D8',
            ],
            [
                'id'      => 'creed',
                'name'    => 'كريد',
                'name_en' => 'Creed',
                'origin'  => 'باريس، فرنسا',
                'tagline' => 'عطور الملوك منذ عام ١٧٦٠',
                'bg'      => '#EDE0C8',
            ],
            [
                'id'      => 'parfums-de-marly',
                'name'    => 'بارفومز دو مارلي',
                'name_en' => 'Parfums de Marly',
                'origin'  => 'باريس، فرنسا',
                'tagline' => 'إرث قصر فرساي الملكي',
                'bg'      => '#EDE8F2',
            ],
            [
                'id'      => 'amouage',
                'name'    => 'عمواج',
                'name_en' => 'Amouage',
                'origin'  => 'مسقط، عُمان',
                'tagline' => 'هدية الملوك من قلب عُمان',
                'bg'      => '#DDE8EC',
            ],
            [
                'id'      => 'lattafa',
                'name'    => 'لطافة',
                'name_en' => 'Lattafa',
                'origin'  => 'دبي، الإمارات',
                'tagline' => 'عبق الشرق بأرقى الأسعار',
                'bg'      => '#E4EDE5',
            ],
            [
                'id'      => 'al-haramain',
                'name'    => 'الحرمين',
                'name_en' => 'Al Haramain',
                'origin'  => 'دبي، الإمارات',
                'tagline' => 'عطور تصلك من قلب الخليج',
                'bg'      => '#F0EDE0',
            ],
        ];

        DB::table('brands')->insert($brands);
    }
}
