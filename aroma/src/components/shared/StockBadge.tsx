import type { StockStatus } from '@/types'
import { cn } from '@/lib/utils'

const MAP: Record<StockStatus, { label: string; classes: string }> = {
  'in-stock':    { label: 'متوفر',           classes: 'text-status-green-text bg-status-green-bg' },
  'low-stock':   { label: 'كميات محدودة',    classes: 'text-status-amber-text bg-status-amber-bg' },
  'out-of-stock':{ label: 'نفد المخزون',     classes: 'text-status-red-text   bg-status-red-bg'   },
}

export function StockBadge({ status }: { status: StockStatus }) {
  const { label, classes } = MAP[status] ?? MAP['in-stock']
  return (
    <span className={cn('inline-flex text-[11px] font-medium px-2.5 py-1 rounded-full tracking-[0.02em]', classes)}>
      {label}
    </span>
  )
}
