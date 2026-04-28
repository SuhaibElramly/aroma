'use client'

import { useState }    from 'react'
import { useRouter }   from 'next/navigation'
import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft, MapPin, Plus, Pencil, Trash2, Star, X,
} from 'lucide-react'
import { useAuthStore }  from '@/store/auth'
import { useUIStore }    from '@/store/ui'
import { useAddresses, useAddAddress, useUpdateAddress, useDeleteAddress } from '@/lib/api/queries'
import { AddressSchema, type AddressValues } from '@/lib/schemas'
import type { Address } from '@/types'

const inputBase =
  'w-full px-3.5 py-3 border border-aroma-border rounded-md font-sans text-[14px] ' +
  'bg-white text-aroma-text outline-none focus:border-aroma-text transition-colors'

// ── Address Form (add / edit) ──────────────────────────────────────────

function AddressForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial?:  Partial<Address>
  onSave:    (data: AddressValues) => void
  onCancel:  () => void
  isSaving:  boolean
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<AddressValues>({
    resolver:      zodResolver(AddressSchema),
    mode:          'onChange',
    defaultValues: {
      label:       initial?.label       ?? '',
      city:        initial?.city        ?? '',
      description: initial?.description ?? '',
      isDefault:   initial?.isDefault   ?? false,
    },
  })

  const LABEL_PRESETS = ['المنزل', 'العمل', 'آخر'] as const

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      {/* Label presets */}
      <div>
        <label className="block font-sans text-[12px] text-aroma-muted mb-1.5">التسمية</label>
        <div className="flex gap-2 mb-2 flex-wrap">
          {LABEL_PRESETS.map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => setValue('label', preset)}
              className={`px-3.5 py-1.5 rounded-full font-sans text-[13px] border transition-colors ${
                watch('label') === preset
                  ? 'bg-aroma-text text-white border-aroma-text'
                  : 'border-aroma-border text-aroma-muted hover:border-aroma-text'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
        <input
          {...register('label')}
          placeholder="تسمية مخصصة"
          className={inputBase}
        />
        {errors.label && (
          <p className="mt-1 font-sans text-[12px] text-status-red-text">{errors.label.message}</p>
        )}
      </div>

      {/* City */}
      <div>
        <label className="block font-sans text-[12px] text-aroma-muted mb-1.5">المدينة</label>
        <input {...register('city')} placeholder="بنغازي" className={inputBase} />
        {errors.city && (
          <p className="mt-1 font-sans text-[12px] text-status-red-text">{errors.city.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block font-sans text-[12px] text-aroma-muted mb-1.5">
          تفاصيل العنوان <span className="text-aroma-faint">(اختياري)</span>
        </label>
        <textarea
          {...register('description')}
          placeholder="المبنى، الطابق، الحي…"
          rows={2}
          className={`${inputBase} resize-vertical`}
        />
        {errors.description && (
          <p className="mt-1 font-sans text-[12px] text-status-red-text">{errors.description.message}</p>
        )}
      </div>

      {/* Default */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          {...register('isDefault')}
          type="checkbox"
          className="w-4 h-4 accent-aroma-text rounded"
        />
        <span className="font-sans text-[13px] text-[#4A4540]">تعيين كعنوان افتراضي</span>
      </label>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={!isValid || isSaving}
          className="flex-1 py-3 rounded-md font-sans text-[13px] font-medium text-white
                     transition-colors disabled:cursor-not-allowed"
          style={{ background: isValid && !isSaving ? '#1C1917' : '#D0CCC8' }}
        >
          {isSaving ? 'جارٍ الحفظ…' : 'حفظ العنوان'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 rounded-md border border-aroma-border font-sans text-[13px]
                     text-aroma-muted hover:text-aroma-text hover:border-aroma-text transition-colors"
        >
          إلغاء
        </button>
      </div>
    </form>
  )
}

// ── Address Card ───────────────────────────────────────────────────────

function AddressCard({
  address,
  onEdit,
  onDelete,
}: {
  address:  Address
  onEdit:   () => void
  onDelete: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, height: 0, overflow: 'hidden' }}
      transition={{ duration: 0.22 }}
      className="bg-white border border-aroma-border rounded-xl px-6 py-5 relative"
    >
      {/* Default badge */}
      {address.isDefault && (
        <span className="absolute top-4 right-4 flex items-center gap-1 font-sans text-[11px]
                         font-medium text-status-amber-text bg-status-amber-bg px-2 py-0.5 rounded-full">
          <Star size={10} fill="currentColor" stroke="none" /> افتراضي
        </span>
      )}

      {/* Label */}
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={15} className="text-aroma-accent shrink-0" />
        <span className="font-sans text-[13px] font-medium text-aroma-text">
          {address.label}
        </span>
      </div>

      {/* Details */}
      <p className="font-sans text-[14px] text-aroma-text mb-0.5">{address.city}</p>
      {address.description && (
        <p className="font-sans text-[13px] text-aroma-muted">{address.description}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-4 pt-4 border-t border-aroma-border-lt">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 font-sans text-[12px] text-aroma-muted
                     hover:text-aroma-text transition-colors"
        >
          <Pencil size={13} /> تعديل
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 font-sans text-[12px] text-aroma-muted
                     hover:text-status-red-text transition-colors"
        >
          <Trash2 size={13} /> حذف
        </button>
      </div>
    </motion.div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────

export function AddressesPageClient() {
  const router    = useRouter()
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const showToast = useUIStore(s => s.showToast)

  const { data: addresses = [], isPending } = useAddresses(isLoggedIn)
  const addMut    = useAddAddress()
  const updateMut = useUpdateAddress()
  const deleteMut = useDeleteAddress()

  const [mode,       setMode]       = useState<'list' | 'add' | 'edit'>('list')
  const [editTarget, setEditTarget] = useState<Address | null>(null)

  if (!isLoggedIn) {
    return (
      <div className="pt-24 pb-20 px-6 text-center">
        <p className="font-sans text-aroma-muted mb-4">سجّل دخولك لإدارة عناوينك.</p>
        <button
          onClick={() => router.push('/login')}
          className="bg-aroma-text text-white px-6 py-3 rounded-md font-sans text-[13px]"
        >
          تسجيل الدخول
        </button>
      </div>
    )
  }

  const handleSave = async (data: AddressValues) => {
    if (mode === 'edit' && editTarget) {
      await updateMut.mutateAsync({ id: editTarget.id, data })
      showToast('تم تحديث العنوان')
    } else {
      await addMut.mutateAsync(data)
      showToast('تم حفظ العنوان')
    }
    setMode('list')
    setEditTarget(null)
  }

  const handleDelete = async (id: number) => {
    await deleteMut.mutateAsync(id)
    showToast('تم حذف العنوان')
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

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="font-sans text-[11px] text-aroma-accent mb-2">
            إدارة
          </p>
          <h1 className="font-display text-[32px] font-normal text-aroma-text leading-tight">
            عناوينك
          </h1>
        </div>
        {mode === 'list' && (
          <button
            onClick={() => { setMode('add'); setEditTarget(null); }}
            className="flex items-center gap-2 bg-aroma-text text-white font-sans text-[13px]
                       px-4 py-2.5 rounded-md hover:bg-aroma-accent transition-colors"
          >
            <Plus size={15} /> إضافة عنوان جديد
          </button>
        )}
      </div>

      {/* Form (add or edit) */}
      <AnimatePresence>
        {(mode === 'add' || mode === 'edit') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            className="bg-white border border-aroma-border rounded-xl px-6 py-6 mb-8"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-[20px] font-medium text-aroma-text">
                {mode === 'edit' ? 'تعديل العنوان' : 'عنوان جديد'}
              </h2>
              <button
                onClick={() => { setMode('list'); setEditTarget(null); }}
                className="text-aroma-faint hover:text-aroma-text transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <AddressForm
              initial={editTarget ?? undefined}
              onSave={handleSave}
              onCancel={() => { setMode('list'); setEditTarget(null); }}
              isSaving={addMut.isPending || updateMut.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Address list */}
      {isPending ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-36 bg-aroma-border animate-pulse rounded-xl" />
          ))}
        </div>
      ) : addresses.length === 0 && mode === 'list' ? (
        <div className="text-center py-16">
          <MapPin size={40} className="text-aroma-faint mx-auto mb-4" strokeWidth={1} />
          <p className="font-display text-[20px] font-medium text-aroma-text mb-2">
            لا توجد عناوين محفوظة
          </p>
          <p className="font-sans text-[13px] text-aroma-muted mb-6">
            أضف عنوانًا لتسريع عملية الطلب.
          </p>
          <button
            onClick={() => setMode('add')}
            className="bg-aroma-text text-white px-6 py-3 rounded-md font-sans text-[13px]"
          >
            إضافة عنوانك الأول
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence>
            {addresses.map(addr => (
              <AddressCard
                key={addr.id}
                address={addr}
                onEdit={() => { setMode('edit'); setEditTarget(addr); }}
                onDelete={() => handleDelete(addr.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
