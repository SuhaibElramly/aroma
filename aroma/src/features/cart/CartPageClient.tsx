'use client'

import { useEffect, useState } from 'react'
import Link            from 'next/link'
import Image           from 'next/image'
import { useRouter }   from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus, X, ShoppingBag } from 'lucide-react'
import { SectionHeader }      from '@/components/shared/SectionHeader'
import { ProductPlaceholder } from '@/components/shared/ProductPlaceholder'
import { EmptyState }         from '@/components/shared/EmptyState'
import { useAuthStore }       from '@/store/auth'
import { useUIStore }         from '@/store/ui'
import { useCart, useUpdateCartItem, useRemoveFromCart } from '@/lib/api/queries'
import { formatPrice }        from '@/lib/formatters'
import { getProductPlaceholder } from '@/lib/product-placeholder'

export function CartPageClient() {
  const router     = useRouter()
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const showToast  = useUIStore(s => s.showToast)
  const [ready, setReady] = useState(false)

  const { data: items = [], isPending } = useCart()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveFromCart()

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)

  useEffect(() => { setReady(true) }, [])
  useEffect(() => {
    if (ready && !isLoggedIn) router.replace('/login?redirect=/cart')
  }, [ready, isLoggedIn, router])

  if (!ready || !isLoggedIn) return null

  const handleRemove = (id: number) => {
    removeItem.mutate(id, {
      onSuccess: () => showToast('تمت إزالة المنتج'),
      onError:   () => showToast('تعذّر إزالة المنتج، حاول مرة أخرى'),
    })
  }

  if (isPending) {
    return (
      <div className="pt-24 pb-20 px-6 md:px-12 max-w-[900px] mx-auto space-y-4">
        <SectionHeader label="مراجعة" title="سلة التسوق" />
        {[1, 2].map(i => (
          <div key={i} className="h-28 bg-aroma-border animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="pt-24 pb-20 px-6 md:px-12 max-w-[900px] mx-auto">
      <SectionHeader label="مراجعة" title="سلة التسوق" />

      {items.length === 0 ? (
        <EmptyState
          Icon={ShoppingBag}
          title="سلتك فارغة"
          subtitle="مرحباً في أرومـا 🌟 — ابدأ باختيار عطرك المفضل."
          action="استكشف المجموعة"
          onAction={() => router.push('/search')}
        />
      ) : (
        <>
          <div className="divide-y divide-aroma-border-lt">
            <AnimatePresence>
              {items.map(item => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-5 py-6 items-center"
                >
                  <Link
                    href={`/product/${item.product.slug}`}
                    className="w-[90px] h-[110px] rounded shrink-0 overflow-hidden"
                  >
                    {item.product.thumbnailUrl ? (
                      <div
                        className="relative w-full h-full"
                        style={{ backgroundColor: (item.product.placeholder ?? getProductPlaceholder(item.product)).bg }}
                      >
                        <Image
                          src={item.product.thumbnailUrl}
                          alt={item.product.name}
                          fill
                          sizes="90px"
                          className="object-contain p-2"
                        />
                      </div>
                    ) : (
                      <ProductPlaceholder product={item.product} height={110} />
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-[11px] text-aroma-accent tracking-[0.08em] uppercase mb-1">
                      {item.product.brand}
                    </p>
                    <p className="font-display text-[17px] font-medium text-aroma-text mb-1 truncate">
                      {item.product.name}
                    </p>
                    <p className="font-sans text-[12px] text-aroma-muted mb-4">
                      {[item.product.selectedVariant, item.product.type].filter(Boolean).join(' · ')}
                    </p>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-aroma-border rounded">
                        <button
                          onClick={() => {
                            if (item.quantity > 1) {
                              updateItem.mutate({ id: item.id, quantity: item.quantity - 1 })
                            } else {
                              handleRemove(item.id)
                            }
                          }}
                          disabled={updateItem.isPending || removeItem.isPending}
                          className="w-9 h-9 flex items-center justify-center text-[#4A4540]
                                     hover:bg-aroma-bg transition-colors"
                          aria-label="تقليل الكمية"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-sans text-[13px]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateItem.mutate({ id: item.id, quantity: item.quantity + 1 })
                          }
                          disabled={updateItem.isPending}
                          className="w-9 h-9 flex items-center justify-center text-[#4A4540]
                                     hover:bg-aroma-bg transition-colors"
                          aria-label="زيادة الكمية"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemove(item.id)}
                        className="font-sans text-[12px] text-aroma-faint hover:text-aroma-text
                                   transition-colors flex items-center gap-1"
                      >
                        <X size={13} /> إزالة
                      </button>
                    </div>
                  </div>

                  <p className="font-sans text-[17px] font-medium text-aroma-text shrink-0">
                    {formatPrice(item.product.price * item.quantity)}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-8 flex justify-end">
            <div className="w-full max-w-[320px] space-y-0">
              <div className="flex justify-between py-2.5 font-sans text-[13px] text-aroma-muted">
                <span>المجموع الفرعي</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between py-2.5 font-sans text-[13px] text-aroma-muted">
                <span>الشحن</span>
                <span className="text-status-green-text">مجاني</span>
              </div>
              <div className="flex justify-between pt-3.5 pb-6 mt-1 border-t border-aroma-border
                              font-sans text-[16px] font-medium text-aroma-text">
                <span>الإجمالي</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <button
                onClick={() => router.push('/checkout')}
                className="w-full bg-aroma-text text-white py-4 rounded font-sans text-[13px]
                           font-medium hover:bg-aroma-accent transition-colors"
              >
                المتابعة للدفع
              </button>
              <button
                onClick={() => router.push('/search')}
                className="w-full py-3 font-sans text-[13px] text-aroma-muted
                           hover:text-aroma-text transition-colors"
              >
                مواصلة التسوق
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
