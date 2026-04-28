'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MapPin, ChevronDown, Plus } from 'lucide-react'
import { useAddresses, useAddAddress } from '@/lib/api/queries'

const newAddressSchema = z.object({
  label:       z.string().min(1, 'اختر تسمية'),
  city:        z.string().min(2, 'المدينة مطلوبة'),
  description: z.string().max(500).optional(),
})

type NewAddressValues = z.infer<typeof newAddressSchema>

interface Props {
  selectedId: number | undefined
  onChange: (id: number) => void
}

export function AddressSelector({ selectedId, onChange }: Props) {
  const { data: addresses = [], isLoading } = useAddresses()
  const addAddress = useAddAddress()
  const [showAll, setShowAll] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const form = useForm<NewAddressValues>({
    resolver: zodResolver(newAddressSchema),
    defaultValues: { label: '', city: '', description: '' },
  })

  const labelValue = form.watch('label')

  const handleSave = form.handleSubmit(async (values) => {
    const created = await addAddress.mutateAsync({
      label:       values.label,
      city:        values.city,
      description: values.description,
      isDefault:   addresses.length === 0,
    })
    onChange(created.id)
    form.reset()
    setShowForm(false)
  })

  if (isLoading) {
    return <div className="h-16 animate-pulse rounded-xl bg-aroma-border" />
  }

  if (addresses.length === 0 && !showForm) {
    return (
      <div className="rounded-xl border border-dashed border-aroma-border p-4 flex flex-col items-center gap-3 text-center">
        <MapPin className="text-aroma-faint" size={24} />
        <p className="text-sm text-aroma-muted">لا يوجد عنوان محفوظ</p>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-sm border border-aroma-border rounded-lg px-3 py-1.5 hover:border-aroma-accent hover:text-aroma-accent transition-colors"
        >
          <Plus size={14} />
          إضافة عنوان
        </button>
      </div>
    )
  }

  const defaultAddress = addresses.find(a => a.isDefault) ?? addresses[0]
  const displayList = showAll ? addresses : (defaultAddress ? [defaultAddress] : addresses)

  return (
    <div className="space-y-3">
      {!showForm && (
        <>
          {displayList.map(addr => (
            <button
              key={addr.id}
              type="button"
              onClick={() => onChange(addr.id)}
              className={[
                'w-full text-right rounded-xl border p-4 transition-colors block',
                selectedId === addr.id
                  ? 'border-aroma-accent bg-aroma-accent-lt'
                  : 'border-aroma-border hover:border-aroma-accent',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm text-aroma-text">{addr.label}</span>
                  <span className="text-xs text-aroma-muted">{addr.city}</span>
                  {addr.description && (
                    <span className="text-xs text-aroma-faint">{addr.description}</span>
                  )}
                </div>
                {addr.isDefault && (
                  <span className="text-xs bg-aroma-accent-lt text-aroma-accent border border-aroma-accent/30 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                    افتراضي
                  </span>
                )}
              </div>
            </button>
          ))}

          <div className="flex items-center gap-3">
            {addresses.length > 1 && (
              <button
                type="button"
                onClick={() => setShowAll(v => !v)}
                className="text-xs text-aroma-accent flex items-center gap-1 hover:underline"
              >
                {showAll ? 'إخفاء' : `عرض كل العناوين (${addresses.length})`}
                <ChevronDown
                  size={12}
                  className={showAll ? 'rotate-180 transition-transform' : 'transition-transform'}
                />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="text-xs text-aroma-muted hover:text-aroma-accent flex items-center gap-1 mr-auto transition-colors"
            >
              <Plus size={12} />
              عنوان جديد
            </button>
          </div>
        </>
      )}

      {showForm && (
        <div className="rounded-xl border border-aroma-border p-4 space-y-3">
          <p className="text-sm font-medium text-aroma-text">عنوان جديد</p>

          {/* ── NO nested <form> — buttons use type="button" + onClick handler ── */}
          <div className="space-y-3">
            {/* Label presets */}
            <div className="flex gap-2 flex-wrap">
              {(['المنزل', 'العمل', 'آخر'] as const).map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => form.setValue('label', preset, { shouldValidate: true })}
                  className={[
                    'px-3 py-1.5 rounded-full text-sm border transition-colors',
                    labelValue === preset
                      ? 'bg-aroma-accent text-white border-aroma-accent'
                      : 'border-aroma-border text-aroma-muted hover:border-aroma-accent hover:text-aroma-accent',
                  ].join(' ')}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Label input */}
            <input
              {...form.register('label')}
              placeholder="تسمية العنوان"
              className="w-full rounded-lg border border-aroma-border px-3 py-2 text-sm outline-none focus:border-aroma-accent bg-white"
            />
            {form.formState.errors.label && (
              <p className="text-xs text-red-500">{form.formState.errors.label.message}</p>
            )}

            {/* City input */}
            <input
              {...form.register('city')}
              placeholder="المدينة (مثال: بنغازي)"
              className="w-full rounded-lg border border-aroma-border px-3 py-2 text-sm outline-none focus:border-aroma-accent bg-white"
            />
            {form.formState.errors.city && (
              <p className="text-xs text-red-500">{form.formState.errors.city.message}</p>
            )}

            {/* Description textarea */}
            <textarea
              {...form.register('description')}
              placeholder="وصف العنوان — حي، شارع، معلم قريب..."
              rows={2}
              className="w-full rounded-lg border border-aroma-border px-3 py-2 text-sm outline-none focus:border-aroma-accent bg-white resize-none"
            />

            {addAddress.isError && (
              <p className="text-xs text-red-500">حدث خطأ، يرجى المحاولة مرة أخرى.</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={addAddress.isPending}
                className="flex-1 bg-aroma-accent text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-aroma-dark transition-colors"
              >
                {addAddress.isPending ? 'جاري الحفظ...' : 'حفظ العنوان'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); form.reset() }}
                className="border border-aroma-border rounded-lg px-4 py-2 text-sm text-aroma-muted hover:border-aroma-accent hover:text-aroma-accent transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
