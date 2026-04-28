'use client'

import { useState }          from 'react'
import { useRouter }         from 'next/navigation'
import { motion }            from 'framer-motion'
import { ChevronRight, Check, Store, MapPin, MessageSquare } from 'lucide-react'
import { OrderStatusBadge }  from '@/components/shared/OrderStatusBadge'
import { useOrder, useCancelOrder } from '@/lib/api/queries'
import { useUIStore }        from '@/store/ui'
import { formatPrice }       from '@/lib/formatters'
import type { OrderItem }    from '@/types'

// Map English backend status names → Arabic display labels
const TIMELINE_AR: Record<string, string> = {
  'Order Placed':      'تم استلام الطلب',
  'Confirmed':         'تم التأكيد',
  'Preparing':         'جارٍ التحضير',
  'Ready for Pickup':  'جاهز للاستلام',
  'Delivered':         'تم التسليم',
  'Cancelled':         'ملغى',
}

function timelineLabel(status: string) {
  return TIMELINE_AR[status] ?? status
}

// Group order items by (name + size) and sum qty
function groupItems(items: OrderItem[]) {
  const map = new Map<string, OrderItem & { qty: number }>()
  for (const item of items) {
    const key = `${item.name}__${item.size}`
    const existing = map.get(key)
    if (existing) {
      existing.qty += item.qty ?? 1
    } else {
      map.set(key, { ...item, qty: item.qty ?? 1 })
    }
  }
  return Array.from(map.values())
}

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const router     = useRouter()
  const showToast  = useUIStore(s => s.showToast)
  const cancelMut  = useCancelOrder()
  const [cancelling, setCancelling] = useState(false)

  const { data: order, isPending, isError } = useOrder(orderId)

  if (isPending) {
    return (
      <div className="pt-24 pb-20 px-6 md:px-12 max-w-[1000px] mx-auto animate-pulse space-y-4">
        <div className="h-4 w-24 bg-aroma-border rounded" />
        <div className="h-8 w-48 bg-aroma-border rounded" />
        <div className="h-40 bg-aroma-border rounded-lg" />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="pt-24 text-center py-20 text-aroma-muted font-sans text-sm">
        الطلب غير موجود.
      </div>
    )
  }

  const canCancel   = order.status === 'placed'
  const groupedItems = groupItems(order.items)

  const handleCancel = async () => {
    if (!canCancel) return
    setCancelling(true)
    try {
      await cancelMut.mutateAsync(order.id)
      showToast('تم إلغاء الطلب')
      router.push('/orders')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="pt-24 pb-20 px-6 md:px-12 max-w-[1000px] mx-auto">
      {/* Back */}
      <button
        onClick={() => router.push('/orders')}
        className="flex items-center gap-1.5 font-sans text-[13px] text-aroma-muted
                   hover:text-aroma-text transition-colors mb-6"
      >
        <ChevronRight size={16} /> رجوع
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <p className="font-sans text-[12px] text-aroma-accent mb-1.5">{order.id}</p>
          <h1 className="font-display text-[30px] font-normal text-aroma-text mb-2">
            تفاصيل الطلب
          </h1>
          <p className="font-sans text-[13px] text-aroma-muted">بتاريخ {order.date}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* ── Two-column layout on large screens ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── LEFT COLUMN: items, note, address ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Items */}
          <div className="bg-white border border-aroma-border rounded-lg p-6">
            <p className="font-sans text-[11px] tracking-widest text-aroma-faint uppercase mb-4">
              المنتجات
            </p>
            {groupedItems.map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-start py-3"
                style={{ borderBottom: i < groupedItems.length - 1 ? '1px solid #F0EFEB' : 'none' }}
              >
                <div className="flex gap-3 items-start">
                  {/* Qty bubble */}
                  <span className="mt-0.5 min-w-[22px] h-[22px] rounded-full bg-aroma-border-lt
                                   flex items-center justify-center font-sans text-[11px]
                                   text-aroma-muted shrink-0">
                    {item.qty}
                  </span>
                  <div>
                    <p className="font-display text-[16px] font-medium text-aroma-text leading-tight mb-0.5">
                      {item.name}
                    </p>
                    <p className="font-sans text-[12px] text-aroma-faint">
                      {item.brand} · {item.size}
                    </p>
                  </div>
                </div>
                <p className="font-sans font-medium text-aroma-text text-[14px] shrink-0 mr-4">
                  {formatPrice(item.price * item.qty)}
                </p>
              </div>
            ))}
            <div className="flex justify-between pt-4 mt-1 border-t border-aroma-border-lt
                            font-sans text-[14px] font-semibold text-aroma-text">
              <span>الإجمالي</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* Admin note */}
          {order.adminNote && (
            <div className="bg-status-amber-bg border border-[#F0D8A0] rounded-lg px-5 py-4">
              <p className="font-sans text-[11px] tracking-widest text-status-amber-text uppercase mb-2">
                ملاحظة من أروما
              </p>
              <p className="font-sans text-[14px] text-[#4A4540] leading-[1.7]">
                {order.adminNote}
              </p>
            </div>
          )}

          {/* Customer note + Delivery — side by side if both exist, else full width */}
          {(order.note || order.isPickup || order.deliveryAddress) && (
            <div className={`grid gap-4 ${order.note && (order.isPickup || order.deliveryAddress) ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>

              {/* Customer note */}
              {order.note && (
                <div className="bg-aroma-bg border border-aroma-border rounded-lg p-5 flex gap-3">
                  <MessageSquare size={16} className="text-aroma-faint shrink-0 mt-0.5" />
                  <div>
                    <p className="font-sans text-[11px] tracking-widest text-aroma-faint uppercase mb-1.5">
                      ملاحظتك
                    </p>
                    <p className="font-sans text-[13px] text-aroma-muted leading-[1.7]">
                      {order.note}
                    </p>
                  </div>
                </div>
              )}

              {/* Delivery / pickup */}
              {order.isPickup ? (
                <div className="bg-aroma-accent-lt border border-aroma-accent/20 rounded-lg p-5 flex gap-3">
                  <Store size={16} className="text-aroma-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="font-sans text-[11px] tracking-widest text-aroma-accent/70 uppercase mb-1.5">
                      طريقة الاستلام
                    </p>
                    <p className="font-sans text-[13px] text-aroma-accent font-medium">
                      استلام من المتجر
                    </p>
                  </div>
                </div>
              ) : order.deliveryAddress ? (
                <div className="bg-aroma-bg border border-aroma-border rounded-lg p-5 flex gap-3">
                  <MapPin size={16} className="text-aroma-faint shrink-0 mt-0.5" />
                  <div>
                    <p className="font-sans text-[11px] tracking-widest text-aroma-faint uppercase mb-1.5">
                      عنوان التوصيل
                    </p>
                    <p className="font-sans text-[13px] text-aroma-text font-medium">
                      {order.deliveryAddress.city}
                    </p>
                    {order.deliveryAddress.description && (
                      <p className="font-sans text-[12px] text-aroma-muted mt-0.5 leading-[1.6]">
                        {order.deliveryAddress.description}
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: timeline + cancel ── */}
        <div className="lg:w-[280px] shrink-0 space-y-5">

          {/* Timeline */}
          <div className="bg-aroma-bg rounded-lg p-6">
            <p className="font-sans text-[11px] tracking-widest text-aroma-faint uppercase mb-6">
              مراحل الطلب
            </p>
            {order.timeline.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex gap-4 relative"
                style={{ paddingBottom: i < order.timeline.length - 1 ? 24 : 0 }}
              >
                {/* Dot — first in DOM = rightmost in RTL flex */}
                <div
                  className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center z-10"
                  style={{
                    background: step.done ? '#1C1917' : '#F0EFEB',
                    border:     step.done ? 'none' : '1.5px solid #D0CCC8',
                  }}
                >
                  {step.done && <Check size={13} strokeWidth={2.5} color="white" />}
                </div>

                {/* Connector line — anchored to right edge, aligned with dot center */}
                {i < order.timeline.length - 1 && (
                  <div
                    className="absolute right-[13px] top-7 w-px"
                    style={{ height: '100%', background: step.done ? '#1C1917' : '#D0CCC8' }}
                  />
                )}

                {/* Text */}
                <div className="pt-0.5 flex-1 text-right">
                  <p className={`font-sans text-[13px] mb-0.5 ${step.done ? 'font-medium text-aroma-text' : 'text-aroma-faint'}`}>
                    {timelineLabel(step.status)}
                  </p>
                  {step.date && (
                    <p className="font-sans text-[11px] text-aroma-faint">
                      {step.date} · {step.time}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Cancel */}
          {canCancel && (
            <div className="bg-white border border-aroma-border rounded-lg p-5">
              <p className="font-sans text-[12px] text-aroma-muted mb-3 leading-[1.6]">
                هل غيّرت رأيك؟ يمكنك إلغاء هذا الطلب طالما هو قيد المراجعة.
              </p>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full border border-status-red-text text-status-red-text font-sans
                           text-[13px] px-5 py-2.5 rounded hover:bg-status-red-bg
                           transition-colors disabled:opacity-50"
              >
                {cancelling ? 'جارٍ الإلغاء…' : 'إلغاء الطلب'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
