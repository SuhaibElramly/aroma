'use client'

import { useState }    from 'react'
import Link             from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm }      from 'react-hook-form'
import { zodResolver }  from '@hookform/resolvers/zod'
import { Eye, EyeOff }  from 'lucide-react'
import { motion }       from 'framer-motion'
import { AuthCard }     from './AuthCard'
import { useAuthStore } from '@/store/auth'
import { useUIStore }   from '@/store/ui'
import { LoginSchema, type LoginValues } from '@/lib/schemas'
import * as services    from '@/mocks/services'

const inputBase =
  'w-full px-4 py-3 border border-aroma-border rounded-md font-sans text-[14px] ' +
  'bg-white text-aroma-text outline-none focus:border-aroma-text transition-colors'

export function LoginPageClient() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const storeLogin    = useAuthStore(s => s.login)
  const showToast     = useUIStore(s => s.showToast)
  const [showPwd, setShowPwd]   = useState(false)
  const [apiError, setApiError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginValues>({
    resolver:     zodResolver(LoginSchema),
    mode:         'onChange',
    defaultValues: { remember: false },
  })

  const onSubmit = async (data: LoginValues) => {
    setApiError('')
    try {
      const { user, token } = await services.login(data.email, data.password)
      localStorage.setItem('token', token)
      storeLogin(user)
      showToast(`أهلاً بعودتك، ${user.name.split(' ')[0]}`)
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
            أهلاً بعودتك
          </h1>
          <p className="font-sans text-[14px] text-aroma-muted">
            سجّل دخولك إلى حساب أروما
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
                placeholder="••••••••"
                autoComplete="current-password"
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
            {errors.password && (
              <p className="mt-1 font-sans text-[12px] text-status-red-text">{errors.password.message}</p>
            )}
          </div>

          {/* Remember + forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                {...register('remember')}
                type="checkbox"
                className="w-4 h-4 accent-aroma-text rounded"
              />
              <span className="font-sans text-[13px] text-aroma-muted">تذكّرني</span>
            </label>
            <button
              type="button"
              className="font-sans text-[13px] text-aroma-accent hover:underline"
            >
              نسيت كلمة المرور؟
            </button>
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
            {isSubmitting ? 'جارٍ تسجيل الدخول…' : 'تسجيل الدخول'}
          </button>
        </form>

        {/* Demo hint */}
        <div className="mt-4 px-3 py-2.5 bg-aroma-accent-lt rounded-md">
          <p className="font-sans text-[11px] text-aroma-muted text-center leading-[1.6]">
            تجربة: <span className="font-medium text-aroma-text">sarah@example.com</span> / <span className="font-medium text-aroma-text">password123</span>
          </p>
        </div>

        {/* Footer link */}
        <p className="mt-6 font-sans text-[13px] text-aroma-muted text-center">
          ليس لديك حساب؟{' '}
          <Link href="/register" className="text-aroma-text font-medium hover:underline">
            أنشئ حسابًا
          </Link>
        </p>
      </motion.div>
    </AuthCard>
  )
}
