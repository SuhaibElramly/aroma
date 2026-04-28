import { cn } from '@/lib/utils'

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded bg-aroma-border', className)} />
  )
}

export function SkeletonCard({ compact = false }: { compact?: boolean }) {
  const imgH = compact ? 'h-48' : 'h-64'
  return (
    <div className="space-y-3">
      <Skeleton className={cn('w-full rounded', imgH)} />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  )
}

export function SkeletonGrid({
  count = 4,
  compact = false,
  cols = 'grid-cols-2 md:grid-cols-4',
}: {
  count?: number
  compact?: boolean
  cols?: string
}) {
  return (
    <div className={cn('grid gap-6', cols)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} compact={compact} />
      ))}
    </div>
  )
}
