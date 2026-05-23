'use client'

import { useRouter }    from 'next/navigation'
import { Package, Heart, MapPin, Settings, User, ChevronLeft, LogOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useUIStore }   from '@/store/ui'

interface MenuItem {
  icon:  LucideIcon
  label: string
  sub:   string
  href:  string
}

const ACTIVITY_ITEMS: MenuItem[] = [
  { icon: Package, label: 'طلباتي',   sub: 'تتبع طلباتك ومشاهدتها',   href: '/orders'    },
  { icon: Heart,   label: 'المفضلة',  sub: 'العطور المحفوظة لديك',    href: '/wishlist'  },
]

const ACCOUNT_ITEMS: MenuItem[] = [
  { icon: MapPin,    label: 'العناوين',       sub: 'إدارة عناوين التوصيل',  href: '/profile/addresses' },
  { icon: Settings,  label: 'إعدادات الحساب', sub: 'الملف الشخصي وكلمة المرور', href: '/profile/settings'  },
]

function NavRow({ item }: { item: MenuItem }) {
  const router = useRouter()
  const Icon   = item.icon
  return (
    <button
      onClick={() => router.push(item.href)}
      className="w-full flex items-center gap-4 py-4 text-start
                 hover:bg-aroma-bg/60 transition-colors"
    >
      <div className="w-9 h-9 rounded-xl bg-aroma-accent-lt flex items-center justify-center shrink-0">
        <Icon size={17} strokeWidth={1.6} className="text-aroma-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-[14px] font-medium text-aroma-text leading-snug">
          {item.label}
        </p>
        <p className="font-sans text-[12px] text-aroma-faint mt-0.5">{item.sub}</p>
      </div>
      <ChevronLeft size={16} strokeWidth={1.5} className="text-aroma-faint shrink-0" />
    </button>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="font-sans text-[11px] text-aroma-faint tracking-wide px-0.5 pt-6 pb-2">
      {children}
    </p>
  )
}

// ── Logged-out state ────────────────────────────────────────────────────

function GuestView() {
  const router = useRouter()
  return (
    <div dir="rtl" className="pt-20 pb-24 px-5 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-aroma-accent-lt flex items-center
                      justify-center mb-5 mt-12">
        <User size={28} strokeWidth={1.4} className="text-aroma-accent" />
      </div>
      <p className="font-sans text-[18px] font-semibold text-aroma-text mb-2">حسابي</p>
      <p className="font-sans text-[14px] text-aroma-muted mb-8 max-w-[260px]">
        سجّل دخولك للوصول إلى طلباتك ومفضلتك وإعداداتك.
      </p>
      <button
        onClick={() => router.push('/login')}
        className="w-full max-w-[280px] bg-aroma-text text-white py-3.5 rounded-xl
                   font-sans text-[14px] font-medium mb-3 transition-opacity hover:opacity-90"
      >
        تسجيل الدخول
      </button>
      <button
        onClick={() => router.push('/register')}
        className="w-full max-w-[280px] border border-aroma-border text-aroma-text py-3.5
                   rounded-xl font-sans text-[14px] transition-colors hover:bg-aroma-border-lt"
      >
        إنشاء حساب
      </button>
    </div>
  )
}

// ── Page root ───────────────────────────────────────────────────────────

export function ProfilePageClient() {
  const router     = useRouter()
  const user       = useAuthStore(s => s.user)
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const logout     = useAuthStore(s => s.logout)
  const showToast  = useUIStore(s => s.showToast)

  if (!isLoggedIn) return <GuestView />

  const initial = user?.name?.trim()?.[0] ?? '؟'

  const handleLogout = () => {
    logout()
    showToast('تم تسجيل الخروج بنجاح')
    router.push('/')
  }

  return (
    <div dir="rtl" className="pt-20 pb-24 px-5 max-w-[480px] mx-auto">

      {/* Profile header */}
      <div className="bg-aroma-accent-lt rounded-2xl px-5 py-5 flex items-center gap-4 mt-4 mb-1">
        <div className="w-14 h-14 rounded-full bg-white/70 border border-aroma-accent/25
                        flex items-center justify-center shrink-0">
          <span className="font-sans text-[22px] font-semibold text-aroma-accent select-none">
            {initial}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-sans text-[16px] font-semibold text-aroma-text truncate leading-snug">
            {user?.name ?? 'أهلاً بك'}
          </p>
          <p className="font-sans text-[13px] text-aroma-muted truncate mt-0.5">
            {user?.email}
          </p>
        </div>
        <button
          onClick={() => router.push('/profile/settings')}
          className="font-sans text-[12px] font-medium text-aroma-accent hover:opacity-75
                     transition-opacity shrink-0"
        >
          تعديل
        </button>
      </div>

      {/* Activity items */}
      <SectionLabel>الأنشطة</SectionLabel>
      <div className="divide-y divide-aroma-border-lt">
        {ACTIVITY_ITEMS.map(item => <NavRow key={item.href} item={item} />)}
      </div>

      {/* Account items */}
      <SectionLabel>الحساب</SectionLabel>
      <div className="divide-y divide-aroma-border-lt">
        {ACCOUNT_ITEMS.map(item => <NavRow key={item.href} item={item} />)}
      </div>

      {/* Logout */}
      <div className="mt-8 pt-5 border-t border-aroma-border-lt">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 font-sans text-[14px] text-status-red-text
                     hover:opacity-75 transition-opacity"
        >
          <LogOut size={15} strokeWidth={1.5} />
          تسجيل الخروج
        </button>
      </div>
    </div>
  )
}
