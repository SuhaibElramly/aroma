'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { formatPrice } from '@/lib/formatters'
import { ProductPlaceholder } from './ProductPlaceholder'
import { WishlistButton } from './WishlistButton'
import type { Product } from '@/types'

interface Props {
  product: Product
  compact?: boolean
}

export function ProductCard({ product, compact = false }: Props) {
  const imgH = compact ? 200 : 260

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="group cursor-pointer"
    >
      <Link href={`/product/${product.slug}`} className="block">
        {/* Image area */}
        <div className="relative rounded overflow-hidden mb-3.5" style={{ height: imgH }}>
          {product.thumbnailUrl ? (
            <Image
              src={product.thumbnailUrl}
              alt={product.nameEn || product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover"
            />
          ) : (
            <ProductPlaceholder product={product} height={imgH} />
          )}

          {/* Badges top-left */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.new && (
              <span className="bg-aroma-text text-white text-[10px] font-medium
                               px-2 py-0.5 rounded-sm">
                جديد
              </span>
            )}
            {product.offer && (
              <span className="bg-status-red-text text-white text-[10px] font-medium
                               px-2 py-0.5 rounded-sm">
                عرض
              </span>
            )}
          </div>

          {/* Wishlist button */}
          <WishlistButton productId={product.id} />

          {/* Bestseller strip */}
          {product.bestseller && (
            <div className="absolute bottom-0 inset-x-0 bg-aroma-text/70 text-white
                            text-[10px] font-medium text-center py-1.5">
              الأكثر مبيعًا
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="font-sans text-[11px] text-aroma-accent tracking-[0.1em] uppercase mb-1">
            {product.brand}
          </p>
          <h3 className={`font-display font-medium text-aroma-text leading-tight ${compact ? 'text-[15px]' : 'text-[17px]'}`}>
            {product.name}
          </h3>
          <p className="font-sans text-[11px] text-aroma-faint mb-1.5">
            {product.nameEn}
          </p>
          <div className="flex items-center gap-2">
            <span className="font-sans text-[15px] font-medium text-aroma-text">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="font-sans text-[13px] text-aroma-faint line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
            <span className="font-sans text-[11px] text-aroma-faint">
              {product.selectedSize}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
