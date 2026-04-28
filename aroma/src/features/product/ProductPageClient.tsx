'use client'

import { useState }       from 'react'
import Link               from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion }         from 'framer-motion'
import { ChevronLeft, Minus, Plus, Check } from 'lucide-react'
import Image from 'next/image'
import { ProductPlaceholder } from '@/components/shared/ProductPlaceholder'
import { ProductCard }    from '@/components/shared/ProductCard'
import { StockBadge }     from '@/components/shared/StockBadge'
import { WishlistButton } from '@/components/shared/WishlistButton'
import { SectionHeader }  from '@/components/shared/SectionHeader'
import { SkeletonGrid }   from '@/components/feedback/SkeletonCard'
import { useAuthStore }   from '@/store/auth'
import { useUIStore }     from '@/store/ui'
import { formatPrice }    from '@/lib/formatters'
import { useProduct, useSimilarProducts, useAddToCart } from '@/lib/api/queries'

export function ProductPageClient({ slug }: { slug: string }) {
  const router      = useRouter()
  const pathname    = usePathname()
  const isLoggedIn  = useAuthStore(s => s.isLoggedIn)
  const showToast   = useUIStore(s => s.showToast)
  const addToCartMutation = useAddToCart()

  const { data: product, isPending, isError } = useProduct(slug)

  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [qty,  setQty]  = useState(1)
  const [added, setAdded] = useState(false)
  const [activeImg, setActiveImg] = useState<string | null>(null)

  const { data: similar = [], isPending: similarLoading } =
    useSimilarProducts(product?.id ?? 0)

  if (isPending) return <ProductDetailSkeleton />
  if (isError || !product) return (
    <div className="pt-24 text-center py-20 text-aroma-muted font-sans text-sm">
      المنتج غير موجود. <Link href="/search" className="underline">العودة للبحث</Link>
    </div>
  )

  const allVariants   = product.variants ?? []
  const size          = selectedSize ?? product.selectedSize
  const activeVariant = allVariants.find(v => String(v.size) === String(size))
                     ?? allVariants.find(v => v.isDefault)
                     ?? allVariants[0]
  const displayPrice    = activeVariant ? activeVariant.price    : Number(product.price)
  const displayOriginal = activeVariant ? activeVariant.originalPrice : (product.originalPrice ?? null)
  const displayStock    = (activeVariant?.stock ?? product.stock) as import('@/types').StockStatus

  const images = product.images ?? []
  const displayImg = activeImg ?? product.thumbnailUrl ?? null

  const handleAdd = () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(pathname ?? '/')}`)
      return
    }
    if (displayStock === 'out-of-stock') return
    if (!activeVariant?.id) return

    addToCartMutation.mutate(
      { variantId: activeVariant.id, quantity: qty },
      {
        onSuccess: () => {
          showToast('تمت إضافة المنتج إلى السلة')
          setAdded(true)
          setTimeout(() => setAdded(false), 2000)
        },
        onError: () => {
          showToast('تعذّر إضافة المنتج، حاول مرة أخرى')
        },
      },
    )
  }

  return (
    <div className="pt-16">
      {/* Back */}
      <div className="px-6 md:px-12 pt-5">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 font-sans text-[13px] text-aroma-muted
                     hover:text-aroma-text transition-colors"
        >
          <ChevronLeft size={16} /> رجوع
        </button>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_480px] gap-0 px-6 md:px-12 py-8
                      max-w-[1200px] mx-auto">
        {/* Gallery */}
        <div className="md:pl-12 mb-8 md:mb-0">
          {/* Main image */}
          <div className="rounded-lg overflow-hidden mb-4 relative" style={{ height: 480 }}>
            {displayImg ? (
              <Image
                src={displayImg}
                alt={product.nameEn || product.name}
                fill
                sizes="(max-width: 768px) 100vw, 480px"
                className="object-cover"
                priority
              />
            ) : (
              <ProductPlaceholder product={product} height={480} />
            )}
          </div>
          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-3">
              {images.map(img => (
                <div
                  key={img.id}
                  onClick={() => setActiveImg(img.url)}
                  className="flex-1 rounded overflow-hidden cursor-pointer relative"
                  style={{
                    height: 90,
                    border: (activeImg ?? product.thumbnailUrl) === img.url
                      ? '2px solid #1C1917'
                      : '2px solid transparent',
                  }}
                >
                  <Image
                    src={img.url}
                    alt=""
                    fill
                    sizes="100px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
          {/* Fallback thumbnails when no real images */}
          {images.length === 0 && (
            <div className="flex gap-3">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="flex-1 rounded overflow-hidden"
                  style={{ border: i === 0 ? '2px solid #1C1917' : '2px solid transparent' }}
                >
                  <ProductPlaceholder product={product} height={90} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Purchase module */}
        <div className="md:sticky md:top-20 md:self-start space-y-0">
          <p className="font-sans text-[12px] text-aroma-accent tracking-[0.12em] uppercase mb-2">
            {product.brand}
          </p>
          <h1 className="font-display text-[36px] font-normal text-aroma-text leading-[1.1]">
            {product.name}
          </h1>
          <p className="font-sans text-[14px] text-aroma-faint mb-2">
            {product.nameEn}
          </p>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6">
            <span className="font-sans text-[28px] font-medium text-aroma-text">
              {formatPrice(displayPrice)}
            </span>
            {displayOriginal && (
              <span className="font-sans text-[18px] text-aroma-faint line-through">
                {formatPrice(displayOriginal)}
              </span>
            )}
          </div>

          {/* Stock */}
          <div className="mb-6">
            <StockBadge status={displayStock} />
          </div>

          {/* Size selector */}
          <div className="mb-8">
            <p className="font-sans text-[12px] text-aroma-muted mb-2.5">
              الحجم — {size}
            </p>
            <div className="flex gap-2.5">
              {product.sizes.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  className="px-4 py-2 rounded font-sans text-[13px] transition-all"
                  style={{
                    border:     s === size ? '1.5px solid #1C1917' : '1.5px solid #D0CCC8',
                    background: s === size ? '#1C1917' : '#fff',
                    color:      s === size ? '#fff' : '#4A4540',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Qty + Add */}
          <div className="flex gap-4 mb-5">
            <div className="flex items-center border border-aroma-border rounded overflow-hidden">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-10 h-12 flex items-center justify-center text-[#4A4540]
                           hover:bg-aroma-bg transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center font-sans text-[14px] text-aroma-text">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="w-10 h-12 flex items-center justify-center text-[#4A4540]
                           hover:bg-aroma-bg transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              onClick={handleAdd}
              disabled={displayStock === 'out-of-stock' || addToCartMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded
                         font-sans text-[13px] font-medium text-white
                         transition-colors disabled:cursor-not-allowed"
              style={{
                background: added
                  ? '#5A8A6A'
                  : displayStock === 'out-of-stock'
                  ? '#D0CCC8'
                  : '#1C1917',
              }}
            >
              {added ? (
                <><Check size={16} /> تمت الإضافة</>
              ) : displayStock === 'out-of-stock' ? (
                'نفذ المخزون'
              ) : (
                'أضف إلى السلة'
              )}
            </button>
          </div>

          <div className="mt-3">
            <WishlistButton productId={product.id} variant="block" />
          </div>

          {/* Description */}
          <div className="mt-7 pt-7 border-t border-aroma-border-lt">
            <p className="font-sans text-[14px] text-[#4A4540] leading-[1.8]">
              {product.description}
            </p>
          </div>

          {/* Scent Profile */}
          <div className="mt-6 bg-aroma-bg rounded-md p-5">
            <p className="font-sans text-[11px] text-aroma-faint uppercase mb-4">
              ملف العطر
            </p>
            {[
              ['رائحة افتتاحية', product.notes.top],
              ['رائحة القلب',   product.notes.heart],
              ['رائحة القاعدة', product.notes.base],
            ].map(([layer, notes]) => (
              <div key={layer as string} className="flex gap-3 mb-3 last:mb-0 items-start">
                <span className="font-sans text-[11px] text-aroma-faint w-20 shrink-0 pt-0.5">
                  {layer as string}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(notes as string[]).map(n => (
                    <span
                      key={n}
                      className="font-sans text-[12px] text-[#4A4540] bg-white border
                                 border-aroma-border px-2.5 py-0.5 rounded-full"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {product.tags.map(t => (
              <span
                key={t}
                className="font-sans text-[11px] text-aroma-muted border border-aroma-border
                           px-2.5 py-1 rounded-full tracking-[0.04em]"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Related products */}
      {(similar.length > 0 || similarLoading) && (
        <div className="px-6 md:px-12 py-12 border-t border-aroma-border-lt bg-aroma-bg">
          <SectionHeader label="قد يعجبك أيضًا" title="عطور مشابهة" />
          {similarLoading ? (
            <SkeletonGrid count={4} compact cols="grid-cols-2 md:grid-cols-4" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
              {similar.map(p => <ProductCard key={p.id} product={p} compact />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ProductDetailSkeleton() {
  return (
    <div className="pt-16 px-6 md:px-12 py-8 animate-pulse">
      <div className="h-4 w-16 bg-aroma-border rounded mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="h-[480px] bg-aroma-border rounded-lg" />
        <div className="space-y-4">
          <div className="h-3 w-24 bg-aroma-border rounded" />
          <div className="h-9 w-2/3 bg-aroma-border rounded" />
          <div className="h-4 w-32 bg-aroma-border rounded" />
          <div className="h-8 w-28 bg-aroma-border rounded" />
        </div>
      </div>
    </div>
  )
}
