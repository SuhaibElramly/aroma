'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useInView } from 'framer-motion'
import { SectionHeader }  from '@/components/shared/SectionHeader'
import { ProductCard }    from '@/components/shared/ProductCard'
import { ProductPlaceholder } from '@/components/shared/ProductPlaceholder'
import { formatPrice }    from '@/lib/formatters'
import type { Product, Category, Brand, HomePageData } from '@/types'

// ── Reusable reveal wrapper ───────────────────────────────────────────
function RevealSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref     = useRef<HTMLDivElement>(null)
  const inView  = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Bestsellers ───────────────────────────────────────────────────────
export function BestsellersSection({ products }: { products: Product[] }) {
  const router = useRouter()
  return (
    <RevealSection className="px-6 md:px-12 py-16 md:py-[72px]">
      <SectionHeader
        label="أكثر العطور طلبًا"
        title="الأكثر مبيعًا"
        action="عرض الكل"
        onAction={() => router.push('/search?filter=bestseller')}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-7">
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </RevealSection>
  )
}

// ── Categories Strip ──────────────────────────────────────────────────
export function CategoriesStrip({ categories }: { categories: Category[] }) {
  const router = useRouter()
  return (
    <RevealSection className="bg-aroma-accent-lt px-6 md:px-12 py-14 md:py-16">
      <SectionHeader label="تسوق حسب" title="الفئة" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
        {categories.map(cat => (
          <motion.div
            key={cat.id}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            onClick={() => router.push(`/search?category=${cat.id}`)}
            style={{ background: cat.bg }}
            className="rounded cursor-pointer px-4 py-6 text-center"
          >
            <p className="font-display text-[16px] font-medium text-aroma-text mb-1">{cat.label}</p>
            <p className="font-sans text-[11px] text-aroma-muted">{`${cat.count} عطر`}</p>
          </motion.div>
        ))}
      </div>
    </RevealSection>
  )
}

// ── New Arrivals ──────────────────────────────────────────────────────
export function NewArrivalsSection({ products }: { products: Product[] }) {
  const router = useRouter()
  return (
    <RevealSection className="px-6 md:px-12 py-16 md:py-[72px]">
      <SectionHeader
        label="وصل حديثًا"
        title="كل ماهو جديد"
        action="عرض الكل"
        onAction={() => router.push('/search?filter=new')}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
        {products.map(p => <ProductCard key={p.id} product={p} compact />)}
      </div>
    </RevealSection>
  )
}

// ── Featured Brand Banner ─────────────────────────────────────────────
export function FeaturedBrandBanner({
  brand,
  products,
}: {
  brand: Brand
  products: Product[]
}) {
  const router = useRouter()
  return (
    <RevealSection className="mx-6 md:mx-12 mb-16 md:mb-[72px]">
      <div
        className="rounded-lg px-10 md:px-14 py-12 md:py-[60px] flex flex-col md:flex-row
                   items-start md:items-center justify-between gap-8"
        style={{ background: 'linear-gradient(110deg, #1C1917, #2E2820)' }}
      >
        <div className="max-w-[480px]">
          <p className="font-sans text-[11px] tracking-[0.2em] text-aroma-accent uppercase mb-4">
            دار مميزة
          </p>
          <h2 className="font-display font-light italic text-[44px] text-[#F9F8F4] mb-4 leading-[1.1]">
            {brand.name}
          </h2>
          <p className="font-sans text-[15px] font-light text-[rgba(249,248,244,0.6)] leading-[1.7] mb-7">
            {brand.tagline}
          </p>
          <button
            onClick={() => router.push(`/search?brand=${brand.id}`)}
            className="border border-aroma-accent/50 text-aroma-accent font-sans text-[12px]
                       tracking-[0.1em] px-7 py-3 rounded hover:bg-aroma-accent/10 transition-colors"
          >
            استكشف {brand.name}
          </button>
        </div>

        <div className="flex gap-4 shrink-0">
          {products.map(p => (
            <motion.div
              key={p.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => router.push(`/product/${p.slug}`)}
              className="w-40 cursor-pointer rounded overflow-hidden border border-white/[0.08]"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <ProductPlaceholder product={p} height={180} />
              <div className="px-3.5 py-3">
                <p className="font-display text-[13px] font-medium text-[#F9F8F4] mb-1">{p.name}</p>
                <p className="font-sans text-[12px] text-aroma-accent">{formatPrice(p.price)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </RevealSection>
  )
}

// ── Offers ────────────────────────────────────────────────────────────
export function OffersSection({ products }: { products: Product[] }) {
  const router = useRouter()
  return (
    <RevealSection className="px-6 md:px-12 pb-16 md:pb-20">
      <SectionHeader
        label="وقت محدود"
        title="العروض الحالية"
        action="كل العروض"
        onAction={() => router.push('/search?filter=offer')}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-7">
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </RevealSection>
  )
}

// ── Home Page Client root ─────────────────────────────────────────────
export function HomeSections({ data }: { data: HomePageData }) {
  return (
    <>
      <BestsellersSection   products={data.bestsellers} />
      <CategoriesStrip      categories={data.categories} />
      <NewArrivalsSection   products={data.newArrivals} />
      <FeaturedBrandBanner  brand={data.featuredBrand} products={data.featuredBrandProducts} />
      <OffersSection        products={data.offers} />
    </>
  )
}
