'use client'

import { useState }    from 'react'
import Link             from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm }      from 'react-hook-form'
import { zodResolver }  from '@hookform/resolvers/zod'
import { Eye, EyeOff, Check } from 'lucide-react'
import { motion }       from 'framer-motion'
import { AuthCard }     from './AuthCard'
import { useAuthStore } from '@/store/auth'
import { useUIStore }   from '@/store/ui'
import { RegisterSchema, type RegisterValues } from '@/lib/schemas'
import * as services    from '@/mocks/services'

const inputBase =
  'w-full px-4 py-3 border border-aroma-border rounded-md font-sans text-[14px] ' +
  'bg-white text-aroma-text outline-none focus:border-aroma-text transition-colors'

const PASSWORD_RULES = [
  { label: '٨ أحرف على الأقل',        test: (v: string) => v.length >= 8 },
  { label: 'حرف كبير واحد على الأقل', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'رقم واحد على الأقل',       test: (v: string) => /\d/.test(v) },
]

export function RegisterPageClient() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const storeLogin    = useAuthStore(s => s.login)
  const showToast     = useUIStore(s => s.showToast)
  const [showPwd,  setShowPwd]  = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [apiError, setApiError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RegisterValues>({
    resolver:     zodResolver(RegisterSchema),
    mode:         'onChange',
  })

  const passwordValue = watch('password', '')

  const onSubmit = async (data: RegisterValues) => {
    setApiError('')
    try {
      const { user, token } = await services.register({
        name:                  data.name,
        email:                 data.email,
        password:              data.password,
        password_confirmation: data.confirmPassword,
      })
      localStorage.setItem('token', token)
      storeLogin(user)
      showToast('مرحباً في أرومـا 🌟 — تم إنشاء حسابك بنجاح')
      const raw      = searchParams.get('redirect') || '/profile'
      const redirect = raw.startsWith('/') ? raw : '/profile'
      router.push(redirect)
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'حدث خطأ ما')
    }
  }

  return (
    <AuthCard>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-[32px] font-normal text-aroma-text mb-2 leading-tight">
            إنشاء حساب
          </h1>
          <p className="font-sans text-[14px] text-aroma-muted">
            انضم إلى أروما لتجربة عطور استثنائية
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Full name */}
          <div>
            <label className="block font-sans text-[12px] text-aroma-muted mb-1.5">
              الاسم الكامل
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder="سارة الرشيدي"
              autoComplete="name"
              className={inputBase}
            />
            {errors.name && (
              <p className="mt-1 font-sans text-[12px] text-status-red-text">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block font-sans text-[12px] text-aroma-muted mb-1.5">
              البريد الإلكتروني
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="sarah@example.com"
              autoComplete="email"
              className={inputBase}
            />
            {errors.email && (
              <p className="mt-1 font-sans text-[12px] text-status-red-text">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block font-sans text-[12px] text-aroma-muted mb-1.5">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPwd ? 'text' : 'password'}
                placeholder="أنشئ كلمة مرور قوية"
                autoComplete="new-password"
                className={`${inputBase} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-aroma-faint
                           hover:text-aroma-muted transition-colors"
                aria-label={showPwd ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Password strength rules */}
            {passwordValue && (
              <ul className="mt-2 space-y-1">
                {PASSWORD_RULES.map(rule => {
                  const met = rule.test(passwordValue)
                  return (
                    <li key={rule.label} className="flex items-center gap-1.5">
                      <Check
                        size={11}
                        className={met ? 'text-status-green-text' : 'text-aroma-faint'}
                      />
                      <span
                        className={`font-sans text-[11px] ${met ? 'text-status-green-text' : 'text-aroma-faint'}`}
                      >
                        {rule.label}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}

            {errors.password && (
              <p className="mt-1 font-sans text-[12px] text-status-red-text">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block font-sans text-[12px] text-aroma-muted mb-1.5">
              تأكيد كلمة المرور
            </label>
            <div className="relative">
              <input
                {...register('confirmPassword')}
                type={showConf ? 'text' : 'password'}
                placeholder="أعد كتابة كلمة المرور"
                autoComplete="new-password"
                className={`${inputBase} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowConf(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-aroma-faint
                           hover:text-aroma-muted transition-colors"
                aria-label={showConf ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 font-sans text-[12px] text-status-red-text">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* API error */}
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

          {/* Submit */}
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full py-3.5 rounded-md font-sans text-[13px] font-medium
                       text-white transition-colors mt-2 disabled:cursor-not-allowed"
            style={{ background: isValid && !isSubmitting ? '#1C1917' : '#D0CCC8' }}
          >
            {isSubmitting ? 'جارٍ إنشاء الحساب…' : 'إنشاء الحساب'}
          </button>
        </form>

        {/* Footer link */}
        <p className="mt-6 font-sans text-[13px] text-aroma-muted text-center">
          لديك حساب بالفعل؟{' '}
          <Link href="/login" className="text-aroma-text font-medium hover:underline">
            سجّل دخولك
          </Link>
        </p>
      </motion.div>
    </AuthCard>
  )
}
