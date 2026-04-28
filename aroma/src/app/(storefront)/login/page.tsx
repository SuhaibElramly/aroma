import { Suspense }         from 'react'
import { LoginPageClient }  from '@/features/auth/LoginPageClient'

export const metadata = { title: 'Sign In — Aroma' }

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageClient />
    </Suspense>
  )
}
