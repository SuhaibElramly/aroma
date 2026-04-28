import { ArrowRight } from 'lucide-react'

interface Props {
  label?:    string
  title:     string
  action?:   string
  onAction?: () => void
}

export function SectionHeader({ label, title, action, onAction }: Props) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        {label && (
          <p className="font-sans text-[11px] tracking-[0.15em] text-aroma-accent uppercase mb-1.5">
            {label}
          </p>
        )}
        <h2 className="font-display text-[28px] font-normal text-aroma-text leading-[1.1]">
          {title}
        </h2>
      </div>
      {action && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-1 font-sans text-[13px] text-aroma-muted
                     hover:text-aroma-text transition-colors"
        >
          {action}
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}
