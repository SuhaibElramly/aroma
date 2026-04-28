import type { StockStatus } from '@/types'
import { cn } from '@/lib/utils'

const MAP: Record<StockStatus, { label: string; classes: string }> = {
  'in-stock':    { label: 'In Stock',        classes: 'text-status-green-text bg-status-green-bg' },
  'low-stock':   { label: 'Only a few left', classes: 'text-status-amber-text bg-status-amber-bg' },
  'out-of-stock':{ label: 'Out of Stock',    classes: 'text-status-red-text   bg-status-red-bg'   },
}

export function StockBadge({ status }: { status: StockStatus }) {
  const { label, classes } = MAP[status] ?? MAP['in-stock']
  return (
    <span className={cn('inline-flex text-[11px] font-medium px-2.5 py-1 rounded-full tracking-[0.02em]', classes)}>
      {label}
    </span>
  )
}
