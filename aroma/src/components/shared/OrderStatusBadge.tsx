import type { OrderStatus } from '@/types'
import { cn } from '@/lib/utils'

const MAP: Record<OrderStatus, { label: string; classes: string }> = {
  placed:    { label: 'قيد المراجعة',    classes: 'text-aroma-muted   bg-aroma-border-lt' },
  confirmed: { label: 'تم التأكيد',      classes: 'text-status-blue-text bg-status-blue-bg' },
  preparing: { label: 'جارٍ التحضير',   classes: 'text-status-amber-text bg-status-amber-bg' },
  ready:     { label: 'جاهز للاستلام',  classes: 'text-status-green-text bg-status-green-bg' },
  delivered: { label: 'تم التسليم',      classes: 'text-status-green-text bg-status-green-bg' },
  cancelled: { label: 'ملغى',            classes: 'text-status-red-text   bg-status-red-bg'   },
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, classes } = MAP[status] ?? MAP['placed']
  return (
    <span className={cn('inline-flex text-[11px] font-medium px-2.5 py-1.5 rounded-full tracking-[0.02em]', classes)}>
      {label}
    </span>
  )
}
