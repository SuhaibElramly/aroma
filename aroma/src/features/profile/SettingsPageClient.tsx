'use client'

import { useState }    from 'react'
import { useRouter }   from 'next/navigation'
import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion }      from 'framer-motion'
import { ChevronLeft, Eye, EyeOff, Check, LogOut } from 'lucide-react'
import { useAuthStore }       from '@/store/auth'
import { useUIStore }         from '@/store/ui'
import { useUpdateProfile, useChangePassword } from '@/lib/api/queries'
import {
  AccountSettingsSchema, type AccountSettingsValues,
  ChangePasswordSchema, type ChangePasswordValues,
} from '@/lib/schemas'

const inputBase =
  'w-full px-3.5 py-3 border border-aroma-border rounded-md font-sans text-[14px] ' +
  'bg-white text-aroma-text outline-none focus:border-aroma-text transition-colors'

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title:    string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-aroma-border rounded-xl px-6 py-6">
      <div className="mb-6 pb-5 border-b border-aroma-border-lt">
        <h2 className="font-display text-[22px] font-medium text-aroma-text leading-tight mb-1">
          {title}
        </h2>
        <p className="font-sans text-[13px] text-aroma-muted">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function SavedBadge() {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-1.5 font-sans text-[12px] text-status-green-text"
    >
      <Check size={13} /> تم الحفظ
    </motion.span>
  )
}

// ── Profile Info Section ───────────────────────────────────────────────

function ProfileInfoSection() {
  const user       = useAuthStore(s => s.user)
  const updateUser = useAuthStore(s => s.updateUser)
  const showToast  = useUIStore(s => s.showToast)
  const updateMut  = useUpdateProfile()
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
  } = useForm<AccountSettingsValues>({
    resolver:      zodResolver(AccountSettingsSchema),
    mode:          'onChange',
    defaultValues: {
      name:  user?.name  ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    },
  })

  const onSubmit = async (data: AccountSettingsValues) => {
    if (!user) return
    const updated = await updateMut.mutateAsync({ userId: user.id, updates: data })
    updateUser(updated)
    showToast('تم تحديث الملف الشخصي')
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <SectionCard
      title="معلومات الملف الشخصي"
      subtitle="تحديث اسمك وبريدك الإلكتروني ورقم هاتفك"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block font-sans text-[12px] text-aroma-muted mb-1.5">الاسم الكامل</label>
          <input {...register('name')} className={inputBase} />
          {errors.name && (
            <p className="mt-1 font-sans text-[12px] text-status-red-text">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block font-sans text-[12px] text-aroma-muted mb-1.5">البريد الإلكتروني</label>
          <input {...register('email')} type="email" className={inputBase} />
          {errors.email && (
            <p className="mt-1 font-sans text-[12px] text-status-red-text">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block font-sans text-[12px] text-aroma-muted mb-1.5">
            رقم الهاتف <span className="text-aroma-faint">(اختياري)</span>
          </label>
          <input {...register('phone')} type="tel" placeholder="+218 91 000 0000" className={inputBase} />
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            disabled={!isValid || !isDirty || updateMut.isPending}
            className="px-6 py-2.5 rounded-md font-sans text-[13px] font-medium text-white
                       transition-colors disabled:cursor-not-allowed"
            style={{ background: isValid && isDirty ? '#1C1917' : '#D0CCC8' }}
          >
            {updateMut.isPending ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}
          </button>
          {saved && <SavedBadge />}
        </div>
      </form>
    </SectionCard>
  )
}

// ── Change Password Section ────────────────────────────────────────────

function ChangePasswordSection() {
  const user      = useAuthStore(s => s.user)
  const showToast = useUIStore(s => s.showToast)
  const changeMut = useChangePassword()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [showConf,    setShowConf]    = useState(false)
  const [apiError,    setApiError]    = useState('')
  const [saved,       setSaved]       = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(ChangePasswordSchema),
    mode:     'onChange',
  })

  const onSubmit = async (data: ChangePasswordValues) => {
    if (!user) return
    setApiError('')
    try {
      await changeMut.mutateAsync({
        userId:          user.id,
        currentPassword: data.currentPassword,
        newPassword:     data.newPassword,
      })
      showToast('تم تغيير كلمة المرور بنجاح')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      reset()
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'حدث خطأ ما')
    }
  }

  const PasswordField = ({
    name,
    label,
    placeholder,
    show,
    onToggle,
  }: {
    name:        'currentPassword' | 'newPassword' | 'confirmPassword'
    label:       string
    placeholder: string
    show:        boolean
    onToggle:    () => void
  }) => (
    <div>
      <label className="block font-sans text-[12px] text-aroma-muted mb-1.5">{label}</label>
      <div className="relative">
        <input
          {...register(name)}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete="new-password"
          className={`${inputBase} pr-11`}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-aroma-faint
                     hover:text-aroma-muted transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {errors[name] && (
        <p className="mt-1 font-sans text-[12px] text-status-red-text">{errors[name]!.message}</p>
      )}
    </div>
  )

  return (
    <SectionCard
      title="تغيير كلمة المرور"
      subtitle="اختر كلمة مرور قوية للحفاظ على أمان حسابك"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <PasswordField
          name="currentPassword"
          label="كلمة المرور الحالية"
          placeholder="كلمة مرورك الحالية"
          show={showCurrent}
          onToggle={() => setShowCurrent(v => !v)}
        />
        <PasswordField
          name="newPassword"
          label="كلمة المرور الجديدة"
          placeholder="8 أحرف على الأقل"
          show={showNew}
          onToggle={() => setShowNew(v => !v)}
        />
        <PasswordField
          name="confirmPassword"
          label="تأكيد كلمة المرور"
          placeholder="أعد إدخال كلمة المرور الجديدة"
          show={showConf}
          onToggle={() => setShowConf(v => !v)}
        />

        {apiError && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-sans text-[13px] text-status-red-text bg-status-red-bg
                       px-3 py-2.5 rounded-md"
          >
            {apiError}
          </motion.p>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            disabled={!isValid || changeMut.isPending}
            className="px-6 py-2.5 rounded-md font-sans text-[13px] font-medium text-white
                       transition-colors disabled:cursor-not-allowed"
            style={{ background: isValid ? '#1C1917' : '#D0CCC8' }}
          >
            {changeMut.isPending ? 'جارٍ التغيير…' : 'تحديث كلمة المرور'}
          </button>
          {saved && <SavedBadge />}
        </div>
      </form>
    </SectionCard>
  )
}

// ── Notification Preferences Section ─────────────────────────────────

const NOTIFICATION_PREFS = [
  { id: 'order-updates', label: 'تحديثات الطلبات',    sub: 'تغييرات حالة طلباتك' },
  { id: 'new-arrivals',  label: 'وصول جديد',           sub: 'كن أول من يعلم بالإصدارات الجديدة' },
  { id: 'offers',        label: 'عروض حصرية',          sub: 'خصومات وعروض موسمية' },
  { id: 'restock',       label: 'عودة المخزون',        sub: 'عندما تعود منتجات مفضلتك للتوفر' },
]

function NotificationSection() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    'order-updates': true,
    'new-arrivals':  false,
    'offers':        true,
    'restock':       true,
  })
  const showToast = useUIStore(s => s.showToast)

  const toggle = (id: string) => {
    setPrefs(p => ({ ...p, [id]: !p[id] }))
    showToast('تم تحديث التفضيلات')
  }

  return (
    <SectionCard
      title="الإشعارات"
      subtitle="اختر ما تريد أن يتم إشعارك به"
    >
      <div className="space-y-0 divide-y divide-aroma-border-lt">
        {NOTIFICATION_PREFS.map(pref => (
          <div key={pref.id} className="flex items-center justify-between py-4 first:pt-0">
            <div>
              <p className="font-sans text-[14px] font-medium text-aroma-text">{pref.label}</p>
              <p className="font-sans text-[12px] text-aroma-faint mt-0.5">{pref.sub}</p>
            </div>
            {/* Toggle switch */}
            <button
              role="switch"
              aria-checked={prefs[pref.id]}
              onClick={() => toggle(pref.id)}
              className="relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4"
              style={{ background: prefs[pref.id] ? '#1C1917' : '#D0CCC8' }}
            >
              <span
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform"
                style={{ left: prefs[pref.id] ? '1.375rem' : '0.25rem' }}
              />
            </button>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ── Danger Zone ────────────────────────────────────────────────────────

function DangerZone() {
  const logout    = useAuthStore(s => s.logout)
  const router    = useRouter()
  const showToast = useUIStore(s => s.showToast)

  const handleLogout = () => {
    logout()
    showToast('تم تسجيل الخروج بنجاح')
    router.push('/')
  }

  return (
    <div className="border border-status-red-bg rounded-xl px-6 py-5">
      <h3 className="font-sans text-[14px] font-medium text-aroma-text mb-1">تسجيل الخروج</h3>
      <p className="font-sans text-[13px] text-aroma-muted mb-4">
        ستحتاج إلى تسجيل الدخول مرة أخرى للوصول إلى حسابك.
      </p>
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 border border-status-red-text text-status-red-text
                   font-sans text-[13px] px-5 py-2.5 rounded-md hover:bg-status-red-bg transition-colors"
      >
        <LogOut size={14} /> تسجيل الخروج
      </button>
    </div>
  )
}

// ── Page root ─────────────────────────────────────────────────────────

export function SettingsPageClient() {
  const router     = useRouter()
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)

  if (!isLoggedIn) {
    return (
      <div className="pt-24 pb-20 px-6 text-center">
        <p className="font-sans text-aroma-muted mb-4">سجّل دخولك لإدارة إعدادات حسابك.</p>
        <button
          onClick={() => router.push('/login')}
          className="bg-aroma-text text-white px-6 py-3 rounded-md font-sans text-[13px]"
        >
          تسجيل الدخول
        </button>
      </div>
    )
  }

  return (
    <div className="pt-24 pb-20 px-6 md:px-12 max-w-[700px] mx-auto">
      {/* Back */}
      <button
        onClick={() => router.push('/profile')}
        className="flex items-center gap-1.5 font-sans text-[13px] text-aroma-muted
                   hover:text-aroma-text transition-colors mb-6"
      >
        <ChevronLeft size={16} /> الملف الشخصي
      </button>

      {/* Page header */}
      <div className="mb-8">
        <p className="font-sans text-[11px] text-aroma-accent mb-2">
          تعديل
        </p>
        <h1 className="font-display text-[32px] font-normal text-aroma-text leading-tight">
          إعداداتك
        </h1>
      </div>

      {/* Sections */}
      <div className="space-y-5">
        <ProfileInfoSection />
        <ChangePasswordSection />
        <NotificationSection />
        <DangerZone />
      </div>
    </div>
  )
}
