import { LucideIcon } from 'lucide-react'

interface Props {
  Icon:     LucideIcon
  title:    string
  subtitle: string
  action?:  string
  onAction?: () => void
}

export function EmptyState({ Icon, title, subtitle, action, onAction }: Props) {
  return (
    <div className="flex flex-col items-center text-center py-20 px-8 gap-4">
      <div className="w-16 h-16 bg-aroma-border-lt rounded-full flex items-center justify-center text-aroma-faint">
        <Icon size={28} strokeWidth={1.4} />
      </div>
      <div className="space-y-2">
        <p className="font-display text-xl font-medium text-aroma-text">{title}</p>
        <p className="font-sans text-sm text-aroma-muted leading-relaxed max-w-xs">{subtitle}</p>
      </div>
      {action && onAction && (
        <button
          onClick={onAction}
          className="mt-2 bg-aroma-text text-white px-7 py-3 rounded text-[13px]
                     font-sans tracking-[0.06em] hover:bg-aroma-accent transition-colors"
        >
          {action}
        </button>
      )}
    </div>
  )
}
