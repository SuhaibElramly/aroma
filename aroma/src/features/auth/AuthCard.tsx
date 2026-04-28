import { cn } from '@/lib/utils'

interface Props {
  children:   React.ReactNode
  className?: string
}

/** Shared layout wrapper for login / register pages */
export function AuthCard({ children, className }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-aroma-bg">
      {/* Logo mark */}
      <p className="font-display text-[22px] font-semibold tracking-[0.2em] text-aroma-text mb-8">
        AROMA
      </p>

      <div
        className={cn(
          'w-full max-w-[440px] bg-white border border-aroma-border rounded-xl px-8 py-10 shadow-sm',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
