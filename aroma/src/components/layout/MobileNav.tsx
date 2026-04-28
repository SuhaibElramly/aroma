'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Heart, ShoppingBag, User } from 'lucide-react'
import { useCart } from '@/lib/api/queries'
import { cn } from '@/lib/utils'

const TABS = [
  { icon: Home,        label: 'الرئيسية', href: '/' },
  { icon: Search,      label: 'بحث',      href: '/search' },
  { icon: Heart,       label: 'المفضلة',  href: '/wishlist' },
  { icon: ShoppingBag, label: 'السلة',    href: '/cart' },
  { icon: User,        label: 'حسابي',    href: '/profile' },
]

export function MobileNav() {
  const pathname  = usePathname()
  const { data: cartItems = [] } = useCart()
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <nav
      aria-label="التنقل في الجوال"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 flex justify-around
                 pt-2.5 pb-5 border-t border-aroma-border"
      style={{ background: 'rgba(249,248,244,0.97)', backdropFilter: 'blur(16px)' }}
    >
      {TABS.map(({ icon: Icon, label, href }) => {
        const active = pathname === href
        const badge  = href === '/cart' ? cartCount : 0

        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={cn(
              'relative flex flex-col items-center gap-0.5',
              active ? 'text-aroma-text' : 'text-aroma-faint',
            )}
          >
            <Icon size={22} strokeWidth={1.5} />
            {badge > 0 && (
              <span
                suppressHydrationWarning
                className="absolute -top-1 -right-1 bg-aroma-text text-white
                           text-[8px] w-3.5 h-3.5 rounded-full flex items-center
                           justify-center font-semibold">
                {badge}
              </span>
            )}
            <span className="font-sans text-[10px]">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
