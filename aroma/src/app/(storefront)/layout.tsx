import { Header }    from '@/components/layout/Header'
import { Footer }    from '@/components/layout/Footer'
import { MobileNav } from '@/components/layout/MobileNav'
import { Toast }     from '@/components/feedback/Toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const logoUrl = await fetch(`${API_URL}/api/home`, { next: { revalidate: 60 } })
    .then(r => r.json())
    .then((d: { logo_url?: string | null }) => d.logo_url ?? null)
    .catch(() => null)

  return (
    <>
      <Header logoUrl={logoUrl} />
      <main className="pb-20 md:pb-0">
        {children}
      </main>
      <Footer logoUrl={logoUrl} />
      <MobileNav />
      <Toast />
    </>
  )
}
