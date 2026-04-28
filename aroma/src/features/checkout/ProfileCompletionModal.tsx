'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth'
import { useUpdateProfile } from '@/lib/api/queries'

const schema = z.object({
  name:  z.string().min(2, 'الاسم مطلوب'),
  phone: z.string().min(7, 'رقم الهاتف مطلوب'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  initialName?: string
  initialPhone?: string
  onSaved: (name: string, phone: string) => void
}

const inputBase =
  'w-full px-3.5 py-3 border border-aroma-border rounded font-sans text-[14px] ' +
  'bg-white text-aroma-text outline-none focus:border-aroma-text transition-colors'

export function ProfileCompletionModal({ open, initialName, initialPhone, onSaved }: Props) {
  const user          = useAuthStore(s => s.user)
  const updateProfile = useUpdateProfile()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: initialName ?? '', phone: initialPhone ?? '' },
  })

  async function onSubmit(values: FormValues) {
    if (!user) return
    try {
      await updateProfile.mutateAsync({ userId: String(user.id), updates: { name: values.name, phone: values.phone } })
      onSaved(values.name, values.phone)
    } catch {
      // error rendered via updateProfile.isError
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-sm bg-white rounded-lg px-6 py-7 shadow-xl"
        dir="rtl"
      >
        <h2 className="font-display text-[22px] font-normal text-aroma-text mb-1">
          أكمل بياناتك أولاً
        </h2>
        <p className="font-sans text-[13px] text-aroma-muted mb-6 leading-relaxed">
          نحتاج إلى اسمك ورقم هاتفك لتأكيد الطلب وتسهيل التواصل معك.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block font-sans text-[12px] text-aroma-muted mb-1.5">
              الاسم الكامل
            </label>
            <input
              {...register('name')}
              placeholder="سارة الرشيدي"
              className={inputBase}
            />
            {errors.name && (
              <p className="mt-1 font-sans text-[11px] text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block font-sans text-[12px] text-aroma-muted mb-1.5">
              رقم الهاتف
            </label>
            <input
              {...register('phone')}
              type="tel"
              placeholder="+218 91 000 0000"
              className={inputBase}
            />
            {errors.phone && (
              <p className="mt-1 font-sans text-[11px] text-red-500">{errors.phone.message}</p>
            )}
          </div>

          {updateProfile.isError && (
            <p className="text-xs text-red-500 text-center">حدث خطأ، يرجى المحاولة مرة أخرى.</p>
          )}
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="w-full mt-2 py-3.5 rounded font-sans text-[13px] font-medium
                       text-white transition-colors disabled:cursor-not-allowed"
            style={{ background: updateProfile.isPending ? '#D0CCC8' : '#1C1917' }}
          >
            {updateProfile.isPending ? 'جاري الحفظ...' : 'حفظ والمتابعة'}
          </button>
        </form>
      </div>
    </div>
  )
}
