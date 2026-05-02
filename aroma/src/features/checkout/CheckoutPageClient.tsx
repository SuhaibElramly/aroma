'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Check, Store } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useCreateOrder, useAddresses, useCart, useRemoveFromCart, useValidateCoupon } from '@/lib/api/queries'
import type { CouponValidation } from '@/mocks/services'
import { CheckoutFormSchema, type CheckoutFormValues } from '@/lib/schemas'
import { formatPrice } from '@/lib/formatters'
import { ProfileCompletionModal } from './ProfileCompletionModal'
import { AddressSelector } from './AddressSelector'

export function CheckoutPageClient() {
  const router    = useRouter()
  const { data: cartItems = [], isPending: cartLoading } = useCart()
  const removeFromCart = useRemoveFromCart()
  const subtotal = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  const user     = useAuthStore(s => s.user)
  const createOrder = useCreateOrder()
  const { data: addresses = [] } = useAddresses()

  const [submitted, setSubmitted]           = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<number | undefined>()
  const [profileDone, setProfileDone]       = useState(false)

  const validateCoupon = useValidateCoupon()
  const [couponInput,   setCouponInput]   = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<(CouponValidation & { valid: true }) | null>(null)
  const [couponError,   setCouponError]   = useState('')

  const finalTotal = appliedCoupon
    ? subtotal - parseFloat(appliedCoupon.discountAmount)
    : subtotal

  const profileIncomplete = !user?.name || !user?.phone
  const showProfileModal  = profileIncomplete && !profileDone

  const form = useForm<CheckoutFormValues>({
    resolver:      zodResolver(CheckoutFormSchema),
    mode:          'onChange',
    defaultValues: { pickup: false, note: '' },
  })

  const isPickup = form.watch('pickup')

  // Redirect after successful order submission
  useEffect(() => {
    if (!submitted) return
    const timer = setTimeout(() => router.push('/orders'), 2000)
    return () => clearTimeout(timer)
  }, [submitted, router])

  // Auto-select default address when addresses load
  useEffect(() => {
    if (addresses.length > 0 && selectedAddressId === undefined) {
      const defaultAddr = addresses.find(a => a.isDefault) ?? addresses[0]
      setSelectedAddressId(defaultAddr.id)
    }
  }, [addresses, selectedAddressId])

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return
    setCouponError('')
    try {
      const result = await validateCoupon.mutateAsync({
        code:       couponInput.trim().toUpperCase(),
        orderTotal: subtotal,
      })
      if (result.valid) {
        setAppliedCoupon(result)
        setCouponError('')
      } else {
        setAppliedCoupon(null)
        const messages: Record<string, string> = {
          coupon_not_found:  'الكوبون غير موجود',
          coupon_inactive:   'هذا الكوبون غير مفعّل',
          coupon_expired:    'انتهت صلاحية الكوبون',
          min_order_not_met: 'الطلب أقل من الحد الأدنى لتطبيق الكوبون',
          max_uses_reached:  'تم استنفاد استخدامات هذا الكوبون',
          already_used:      'لقد استخدمت هذا الكوبون من قبل',
        }
        setCouponError(messages[result.error] ?? 'الكوبون غير صالح')
      }
    } catch {
      setCouponError('حدث خطأ. حاول مرة أخرى.')
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError('')
  }

  const onSubmit = async (data: CheckoutFormValues) => {
    if (!isPickup && !selectedAddressId) return
    try {
      await createOrder.mutateAsync({
        note:       data.note,
        pickup:     data.pickup,
        addressId:  data.pickup ? undefined : selectedAddressId,
        items:      cartItems,
        total:      finalTotal,
        couponCode: appliedCoupon ? couponInput.trim().toUpperCase() : undefined,
      })
      // clear cart — remove each item from backend
      await Promise.all(cartItems.map(i => removeFromCart.mutateAsync(i.id)))
      setSubmitted(true)
    } catch (err: any) {
      const couponErrors = err?.response?.data?.errors?.coupon_code
      if (couponErrors?.length) {
        const messages: Record<string, string> = {
          coupon_inactive:   'هذا الكوبون غير مفعّل',
          coupon_expired:    'انتهت صلاحية الكوبون',
          min_order_not_met: 'الطلب أقل من الحد الأدنى لتطبيق الكوبون',
          max_uses_reached:  'تم استنفاد استخدامات هذا الكوبون',
          already_used:      'لقد استخدمت هذا الكوبون من قبل',
        }
        setCouponError(messages[couponErrors[0]] ?? 'الكوبون غير صالح')
        handleRemoveCoupon()
      }
      // existing error is displayed via createOrder.isError
    }
  }

  if (!cartLoading && cartItems.length === 0 && !submitted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-aroma-muted">
        <p className="font-sans text-[16px]">سلتك فارغة</p>
        <button
          onClick={() => router.push('/')}
          className="border border-aroma-border rounded px-4 py-2 font-sans text-[13px] hover:border-aroma-text hover:text-aroma-text transition-colors"
        >
          تصفح المنتجات
        </button>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center flex-col gap-6 bg-aroma-bg px-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-18 h-18 rounded-full bg-status-green-bg flex items-center justify-center text-status-green-text"
          style={{ width: 72, height: 72 }}
        >
          <Check size={32} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <h2 className="font-display text-[32px] font-normal text-aroma-text mb-2">
            تم استلام طلبك
          </h2>
          <p className="font-sans text-[14px] text-aroma-muted max-w-[340px] leading-relaxed">
            سنتواصل معك قريبًا لتأكيد الطلب ومتابعة كل خطوة.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <ProfileCompletionModal
        open={showProfileModal}
        initialName={user?.name ?? undefined}
        initialPhone={user?.phone ?? undefined}
        onSaved={(_name, _phone) => setProfileDone(true)}
      />

      <div className="pt-24 pb-20 px-6 md:px-12 max-w-[900px] mx-auto">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-12">
            {/* Left: form */}
            <div className="space-y-6">
              <p className="font-sans text-[13px] text-aroma-muted">بيانات الطلب</p>

              {/* Pickup toggle */}
              <div className="flex items-center justify-between rounded-lg border border-aroma-border p-4">
                <div className="flex items-center gap-3">
                  <Store size={18} className="text-aroma-text" />
                  <div>
                    <p className="font-sans text-[13px] text-aroma-text font-medium">استلام من المتجر</p>
                    <p className="font-sans text-[11px] text-aroma-muted">لا داعي لعنوان التوصيل</p>
                  </div>
                </div>
                <input
                  {...form.register('pickup')}
                  type="checkbox"
                  className="w-4 h-4 accent-aroma-text cursor-pointer"
                />
              </div>

              {/* Address selector */}
              {!isPickup && (
                <div className="space-y-2">
                  <p className="font-sans text-[12px] text-aroma-muted">عنوان التوصيل</p>
                  <AddressSelector
                    selectedId={selectedAddressId}
                    onChange={setSelectedAddressId}
                  />
                  {!selectedAddressId && (
                    <p className="font-sans text-[11px] text-red-500">
                      يرجى اختيار أو إضافة عنوان للتوصيل
                    </p>
                  )}
                </div>
              )}

              {/* Note */}
              <div>
                <label className="block font-sans text-[12px] text-aroma-muted mb-1.5">
                  ملاحظة <span className="text-aroma-faint">(اختياري)</span>
                </label>
                <textarea
                  {...form.register('note')}
                  placeholder="تغليف هدية؟ تعليمات خاصة؟"
                  rows={3}
                  className="w-full px-3.5 py-3 border border-aroma-border rounded font-sans text-[14px] bg-white text-aroma-text outline-none focus:border-aroma-text transition-colors resize-vertical"
                />
              </div>
            </div>

            {/* Right: order summary */}
            <div className="bg-[#F4F2EC] rounded-lg px-6 py-7 self-start">
              <p className="font-sans text-[13px] text-aroma-muted mb-5">ملخص الطلب</p>

              <div className="space-y-3 mb-4">
                {cartItems.map((item, i) => (
                  <div key={i} className="flex justify-between font-sans text-[13px] text-[#4A4540]">
                    <span className="flex-1 mr-3 truncate">
                      {item.product.name} × {item.quantity}
                    </span>
                    <span className="font-medium text-aroma-text shrink-0">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Coupon input */}
              {!appliedCoupon ? (
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="كوبون الخصم"
                    dir="rtl"
                    className="flex-1 border border-aroma-border rounded px-3 py-2 font-sans text-[13px] bg-transparent focus:outline-none focus:border-aroma-text"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={validateCoupon.isPending || !couponInput.trim()}
                    className="border border-aroma-border rounded px-4 py-2 font-sans text-[13px] hover:border-aroma-text transition-colors disabled:opacity-40"
                  >
                    {validateCoupon.isPending ? '…' : 'تطبيق'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-3 rounded bg-green-50 border border-green-200 px-3 py-2">
                  <span className="font-sans text-[13px] text-green-700">
                    كوبون <span className="font-mono font-bold">{couponInput}</span> — خصم {appliedCoupon.discountAmount} LYD
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-[11px] text-green-600 hover:text-red-500 transition-colors ml-2"
                  >✕</button>
                </div>
              )}
              {couponError && (
                <p className="mt-1 font-sans text-[12px] text-red-500" dir="rtl">{couponError}</p>
              )}

              <div className="border-t border-aroma-border pt-4">
                {appliedCoupon && (
                  <div className="flex justify-between font-sans text-[13px] text-aroma-muted mb-2">
                    <span>المجموع الفرعي</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                )}
                {appliedCoupon && (
                  <div className="flex justify-between font-sans text-[13px] text-green-600 mb-2">
                    <span>كوبون {couponInput}</span>
                    <span>−{appliedCoupon.discountAmount} LYD</span>
                  </div>
                )}
                <div className="flex justify-between font-sans text-[15px] font-medium text-aroma-text">
                  <span>الإجمالي</span>
                  <span>{formatPrice(finalTotal)}</span>
                </div>
              </div>

              {createOrder.isError && (
                <p className="mt-3 font-sans text-[11px] text-red-500 text-center">
                  حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى.
                </p>
              )}

              <button
                type="submit"
                disabled={
                  createOrder.isPending ||
                  showProfileModal ||
                  (!isPickup && !selectedAddressId)
                }
                className="w-full mt-5 py-3.5 rounded font-sans text-[13px] font-medium text-white transition-colors disabled:cursor-not-allowed"
                style={{
                  background:
                    !createOrder.isPending && !showProfileModal && (isPickup || selectedAddressId)
                      ? '#1C1917'
                      : '#D0CCC8',
                }}
              >
                {createOrder.isPending ? 'جارٍ إرسال الطلب…' : 'تأكيد الطلب'}
              </button>

              <p className="mt-3 font-sans text-[11px] text-aroma-faint text-center leading-[1.6]">
                سنتواصل معك لتأكيد التوفر وترتيب التوصيل أو الاستلام.
              </p>
            </div>
          </div>
        </form>
      </div>
    </>
  )
}
