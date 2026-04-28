import { z } from 'zod'

// ── Auth ──────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email:    z.string().email('يرجى إدخال بريد إلكتروني صالح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  remember: z.boolean().optional(),
})

export type LoginValues = z.infer<typeof LoginSchema>

export const RegisterSchema = z
  .object({
    name:            z.string().min(2, 'الاسم الكامل يجب أن يكون حرفين على الأقل'),
    email:           z.string().email('يرجى إدخال بريد إلكتروني صالح'),
    password:        z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
    confirmPassword: z.string(),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: 'كلمتا المرور غير متطابقتين',
    path:    ['confirmPassword'],
  })

export type RegisterValues = z.infer<typeof RegisterSchema>

// ── Address ───────────────────────────────────────────────────────────

export const AddressSchema = z.object({
  label:       z.string().min(1, 'اختر تسمية'),
  city:        z.string().min(2, 'المدينة مطلوبة'),
  description: z.string().max(500).optional(),
  isDefault:   z.boolean().optional(),
})

export type AddressValues = z.infer<typeof AddressSchema>

// ── Account Settings ──────────────────────────────────────────────────

export const AccountSettingsSchema = z.object({
  name:  z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  email: z.string().email('يرجى إدخال بريد إلكتروني صالح'),
  phone: z.string().optional(),
})

export type AccountSettingsValues = z.infer<typeof AccountSettingsSchema>

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
    newPassword:     z.string().min(8, 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل'),
    confirmPassword: z.string(),
  })
  .refine(d => d.newPassword === d.confirmPassword, {
    message: 'كلمتا المرور غير متطابقتين',
    path:    ['confirmPassword'],
  })

export type ChangePasswordValues = z.infer<typeof ChangePasswordSchema>

export const CheckoutFormSchema = z.object({
  note:      z.string().max(500).optional(),
  pickup:    z.boolean(),
  addressId: z.number().optional(),
})

export type CheckoutFormValues = z.infer<typeof CheckoutFormSchema>

export const ProfileFormSchema = z.object({
  name:  z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  email: z.string().email('يرجى إدخال بريد إلكتروني صالح'),
  phone: z.string().optional(),
})

export type ProfileFormValues = z.infer<typeof ProfileFormSchema>

export const SearchSchema = z.object({
  query:    z.string().optional(),
  category: z.string().nullable().optional(),
  brand:    z.string().nullable().optional(),
  type:     z.string().nullable().optional(),
  special:  z.string().nullable().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().max(1000).optional(),
  sort:     z.enum(['featured', 'newest', 'price-asc', 'price-desc', 'rating']).optional(),
})
