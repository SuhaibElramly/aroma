'use client'

import { useRouter } from 'next/navigation'
import { motion }    from 'framer-motion'
import { ArrowRight }     from 'lucide-react'
import { SectionHeader }  from '@/components/shared/SectionHeader'
import { SkeletonGrid }   from '@/components/feedback/SkeletonCard'
import { useBrands, useCategories } from '@/lib/api/queries'

export function BrandsPageClient() {
  const router = useRouter()
  const { data: brands = [],     isPending: brandsLoading }     = useBrands()
  const { data: categories = [], isPending: categoriesLoading } = useCategories()

  return (
    <div className="pt-24 pb-20 px-6 md:px-12">
      {/* Page header */}
      <div className="mb-14">
        <p className="font-sans text-[11px] text-aroma-accent mb-2.5">
          اكتشف
        </p>
        <h1 className="font-display text-[42px] font-normal text-aroma-text leading-tight">
          الماركات والدور
        </h1>
      </div>

      {/* Brands grid */}
      {brandsLoading ? (
        <SkeletonGrid count={8} cols="grid-cols-2 md:grid-cols-4" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-20">
          {brands.map(brand => (
            <motion.div
              key={brand.id}
              whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}
              transition={{ duration: 0.25 }}
              onClick={() => router.push(`/search?brand=${brand.id}`)}
              style={{ background: brand.bg || '#F2EBE4' }}
              className="rounded-md px-7 py-9 cursor-pointer relative overflow-hidden"
            >
              <p className="font-sans text-[11px] text-aroma-accent tracking-[0.1em] mb-2">
                {brand.origin}
              </p>
              <p className="font-display text-[22px] font-medium text-aroma-text leading-[1.2]">
                {brand.name}
              </p>
              <p className="font-sans text-[11px] text-aroma-faint mb-1">
                {brand.nameEn}
              </p>
              <p className="font-sans text-[12px] text-aroma-muted mb-4 italic">
                {brand.tagline}
              </p>
              <p className="font-sans text-[11px] text-aroma-faint">
                {brand.count} عطر
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Categories */}
      <SectionHeader label="تسوق حسب" title="الفئة" />
      {categoriesLoading ? (
        <SkeletonGrid count={6} cols="grid-cols-1 md:grid-cols-3" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map(cat => (
            <motion.div
              key={cat.id}
              whileHover={{ opacity: 0.88 }}
              onClick={() => router.push(`/search?category=${cat.id}`)}
              style={{ background: cat.bg }}
              className="rounded-md px-7 py-8 cursor-pointer flex items-center justify-between"
            >
              <div>
                <p className="font-display text-[20px] font-medium text-aroma-text mb-1">
                  {cat.label}
                </p>
                <p className="font-sans text-[12px] text-aroma-muted">{cat.count} عطر</p>
              </div>
              <ArrowRight size={18} className="text-aroma-muted" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
