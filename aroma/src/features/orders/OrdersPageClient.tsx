'use client'

import { useRouter }         from 'next/navigation'
import { motion }            from 'framer-motion'
import { ChevronLeft, Package } from 'lucide-react'
import { SectionHeader }     from '@/components/shared/SectionHeader'
import { OrderStatusBadge }  from '@/components/shared/OrderStatusBadge'
import { ProductPlaceholder } from '@/components/shared/ProductPlaceholder'
import { EmptyState }        from '@/components/shared/EmptyState'
import { useOrders }         from '@/lib/api/queries'
import { formatPrice }       from '@/lib/formatters'
import { PRODUCTS }          from '@/mocks/data'

function findProductForOrder(itemPrice: number) {
  return PRODUCTS.find(p => p.price === itemPrice) ?? PRODUCTS[0]
}

export function OrdersPageClient() {
  const router = useRouter()
  const { data: orders = [], isPending } = useOrders()

  return (
    <div className="pt-24 pb-20 px-6 md:px-12 max-w-[760px] mx-auto">
      <SectionHeader label="سجل" title="طلباتك" />

      {isPending ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-24 bg-aroma-border animate-pulse rounded-lg" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          Icon={Package}
          title="لا توجد طلبات بعد"
          subtitle="نتطلع إلى زيارتك! ابدأ أول طلب وستجد سجلك هنا. ❤️"
          action="استكشف المجموعة"
          onAction={() => router.push('/search')}
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          {orders.map(order => (
            <motion.div
              key={order.id}
              whileHover={{ y: -2, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
              transition={{ duration: 0.2 }}
              onClick={() => router.push(`/orders/${order.id}`)}
              className="bg-white border border-aroma-border rounded-lg px-6 py-5
                         cursor-pointer flex justify-between items-center"
            >
              <div className="flex gap-5 items-center">
                {/* Thumbnail */}
                <div className="w-[60px] h-[70px] rounded overflow-hidden shrink-0">
                  <ProductPlaceholder
                    product={findProductForOrder(order.items[0].price)}
                    height={70}
                  />
                </div>

                <div>
                  <p className="font-sans text-[12px] text-aroma-accent tracking-[0.06em] mb-1">
                    {order.id}
                  </p>
                  <p className="font-display text-[16px] font-medium text-aroma-text mb-1 leading-tight">
                    {order.items.map(i => i.name).join(', ')}
                  </p>
                  <p className="font-sans text-[12px] text-aroma-muted">
                    {order.date} · {(() => { const n = order.items.length; const l = n === 1 ? 'منتج' : n === 2 ? 'منتجان' : n <= 10 ? 'منتجات' : 'منتجًا'; return `${n} ${l}`; })()} · {formatPrice(order.total)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 shrink-0">
                <OrderStatusBadge status={order.status} />
                <ChevronLeft size={18} className="text-aroma-faint" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
