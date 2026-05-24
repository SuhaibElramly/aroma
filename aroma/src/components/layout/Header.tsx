'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Search, Heart, ShoppingBag, User } from 'lucide-react'
import { useCart } from '@/lib/api/queries'
import { useWishlistStore } from '@/store/wishlist'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { label: 'اكتشف',       href: '/' },
  { label: 'الماركات',   href: '/brands' },
  { label: 'وصل حديثًا', href: '/search?filter=new' },
  { label: 'العروض',     href: '/search?filter=offer' },
]

const ICON_LINKS = [
  { icon: Search,      href: '/search',   label: 'بحث' },
  { icon: Heart,       href: '/wishlist', label: 'المفضلة' },
  { icon: ShoppingBag, href: '/cart',     label: 'السلة' },
  { icon: User,        href: '/profile',  label: 'حسابي' },
]

export function Header({ logoUrl }: { logoUrl?: string | null }) {
  const [hydrated, setHydrated] = useState(false)
  const pathname    = usePathname()
  const isLoggedIn  = useAuthStore(s => s.isLoggedIn)
  const { data: cartItems = [] } = useCart()
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)
  const wishCount   = useWishlistStore(s => s.count())

  useEffect(() => {
    setHydrated(true)
  }, [])

  const badgeFor = (href: string) => {
    if (!hydrated || !isLoggedIn) return 0
    if (href === '/cart')     return cartCount
    if (href === '/wishlist') return wishCount
    return 0
  }

  return (
    <div className="fixed top-5 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
      <nav
        aria-label="التنقل الرئيسي"
        className="pointer-events-auto flex items-center justify-between h-[50px]
                   px-2.5 pl-6 gap-2 rounded-full min-w-0 w-full max-w-[960px]"
        style={{
          background:       'rgba(18,15,12,0.72)',
          backdropFilter:   'blur(28px) saturate(140%)',
          WebkitBackdropFilter: 'blur(28px) saturate(140%)',
          border:           '1px solid rgba(184,150,110,0.22)',
          boxShadow:        '0 8px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <Link href="/" className="shrink-0 pr-6">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Aroma"
              height={32}
              width={120}
              className="object-contain object-left"
              style={{ height: 32, width: 'auto' }}
            />
          ) : (
            <span className="font-display text-[20px] font-semibold tracking-[0.18em] text-[#F4EFE8]">
              AROMA
            </span>
          )}
        </Link>

        {/* Nav links — hidden on small screens */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(link => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'font-sans text-[12px] tracking-[0.05em] px-3.5 py-1.5 rounded-full transition-colors',
                  active
                    ? 'bg-[rgba(184,150,110,0.18)] text-[#F4EFE8] font-medium'
                    : 'text-[rgba(244,239,232,0.5)] hover:text-[rgba(244,239,232,0.8)]',
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Icon buttons */}
        <div className="flex items-center gap-1">
          {ICON_LINKS.map(({ icon: Icon, href, label }) => {
            const badge = badgeFor(href)
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className="relative p-2 text-[rgba(244,239,232,0.75)] hover:text-[#F4EFE8]
                           transition-colors rounded-full"
              >
                <Icon size={19} strokeWidth={1.5} />
                {badge > 0 && (
                  <span
                    suppressHydrationWarning
                    className="absolute top-1 right-1 bg-aroma-accent text-white
                               text-[9px] w-[15px] h-[15px] rounded-full flex items-center
                               justify-center font-bold leading-none">
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
