'use client'

import { Heart }          from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useWishlistStore }  from '@/store/wishlist'
import { useAuthStore }      from '@/store/auth'
import { useUIStore }        from '@/store/ui'
import { useAddToWishlist, useRemoveFromWishlist } from '@/lib/api/queries'
import { cn }                from '@/lib/utils'

interface Props {
  productId: number
  size?: number
  className?: string
  variant?: 'overlay' | 'block'
}

export function WishlistButton({ productId, size = 16, className, variant = 'overlay' }: Props) {
  const router     = useRouter()
  const pathname   = usePathname()
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const ids        = useWishlistStore(s => s.ids)
  const optimisticToggle = useWishlistStore(s => s.toggle)
  const showToast  = useUIStore(s => s.showToast)

  const addMutation    = useAddToWishlist()
  const removeMutation = useRemoveFromWishlist()

  const saved = isLoggedIn && ids.includes(productId)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(pathname ?? '/')}`)
      return
    }
    const result = optimisticToggle(productId)
    if (result === 'added') {
      showToast('أُضيف إلى المفضلة ♡')
      addMutation.mutate(productId)
    } else {
      showToast('حُذف من المفضلة')
      removeMutation.mutate(productId)
    }
  }

  if (variant === 'block') {
    return (
      <button
        onClick={handleClick}
        aria-label={saved ? 'حذف من المفضلة' : 'حفظ في المفضلة'}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-3 border border-aroma-border rounded',
          'font-sans text-[13px] transition-colors',
          saved
            ? 'text-aroma-accent border-aroma-accent'
            : 'text-aroma-muted hover:text-aroma-text hover:border-aroma-text',
          className,
        )}
      >
        <Heart size={15} fill={saved ? 'currentColor' : 'none'} />
        {saved ? 'محفوظ في المفضلة' : 'أضف إلى المفضلة'}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      aria-label={saved ? 'حذف من المفضلة' : 'أضف إلى المفضلة'}
      className={cn(
        'absolute top-2.5 right-2.5 z-10 w-[34px] h-[34px] rounded-full',
        'bg-white/90 flex items-center justify-center shadow-sm',
        'transition-transform hover:scale-110',
        saved ? 'text-aroma-accent' : 'text-aroma-faint',
        className,
      )}
    >
      <Heart size={size} fill={saved ? 'currentColor' : 'none'} />
    </button>
  )
}
