'use client'

import { useRouter }    from 'next/navigation'
import { ChevronRight, Package, Heart, MapPin, Bell, Settings, User } from 'lucide-react'
import { LucideIcon }   from 'lucide-react'
import { useAuthStore } from '@/store/auth'

interface MenuItem {
  icon:  LucideIcon
  label: string
  sub:   string
  href:  string
}

const MENU_ITEMS: MenuItem[] = [
  { icon: Package,  label: 'طلباتي',         sub: 'تتبع طلباتك ومشاهدتها',          href: '/orders' },
  { icon: Heart,    label: 'المفضلة',         sub: 'العطور المحفوظة لديك',            href: '/wishlist' },
  { icon: MapPin,   label: 'العناوين',        sub: 'إدارة عناوين التوصيل',            href: '/profile/addresses' },
  { icon: Bell,     label: 'الإشعارات',       sub: 'تحديثات الطلبات والعروض',         href: '/profile/settings' },
  { icon: Settings, label: 'إعدادات الحساب',  sub: 'تعديل ملفك والتفضيلات',          href: '/profile/settings' },
]

export function ProfilePageClient() {
  const router     = useRouter()
  const user       = useAuthStore(s => s.user)
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)

  if (!isLoggedIn) {
    return (
      <div className="pt-24 pb-20 px-6 text-center">
        <div className="w-[72px] h-[72px] rounded-full bg-aroma-border-lt flex items-center
                        justify-center text-aroma-faint mx-auto mb-6">
          <User size={32} strokeWidth={1.2} />
        </div>
        <p className="font-display text-[24px] font-medium text-aroma-text mb-2">حسابي</p>
        <p className="font-sans text-[14px] text-aroma-muted mb-6">
          سجّل دخولك للوصول إلى طلباتك ومفضلتك وإعداداتك.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push('/login')}
            className="bg-aroma-text text-white px-6 py-3 rounded-md font-sans text-[13px] font-medium"
          >
            تسجيل الدخول
          </button>
          <button
            onClick={() => router.push('/register')}
            className="border border-aroma-border text-aroma-text px-6 py-3 rounded-md font-sans text-[13px]"
          >
            إنشاء حساب
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-24 pb-20 px-6 md:px-12 max-w-[640px] mx-auto">
      {/* Avatar row */}
      <div className="flex items-center gap-5 mb-12">
        <div className="w-[72px] h-[72px] rounded-full bg-aroma-border-lt flex items-center
                        justify-center text-aroma-faint">
          <User size={32} strokeWidth={1.2} />
        </div>
        <div>
          <p className="font-display text-[24px] font-medium text-aroma-text mb-0.5">
            {user?.name ?? 'أهلاً بك'}
          </p>
          <p className="font-sans text-[13px] text-aroma-muted">{user?.email}</p>
        </div>
      </div>

      {/* Menu */}
      <div className="bg-white border border-aroma-border rounded-lg overflow-hidden">
        {MENU_ITEMS.map((item, i) => {
          const Icon = item.icon
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className="w-full flex items-center justify-between px-6 py-4.5 text-left
                         transition-colors hover:bg-[#FAFAF7]"
              style={{ borderBottom: i < MENU_ITEMS.length - 1 ? '1px solid #F4F2EC' : 'none' }}
            >
              <div className="flex items-center gap-4">
                <Icon size={20} strokeWidth={1.5} className="text-aroma-faint" />
                <div>
                  <p className="font-sans text-[14px] font-medium text-aroma-text mb-0.5">
                    {item.label}
                  </p>
                  <p className="font-sans text-[12px] text-aroma-faint">{item.sub}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-aroma-faint shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
