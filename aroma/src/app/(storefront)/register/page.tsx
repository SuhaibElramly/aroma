import { Suspense }            from 'react'
import { RegisterPageClient }  from '@/features/auth/RegisterPageClient'

export const metadata = { title: 'Create Account — Aroma' }

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterPageClient />
    </Suspense>
  )
}
