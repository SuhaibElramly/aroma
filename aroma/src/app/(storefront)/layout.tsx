import { Header }    from '@/components/layout/Header'
import { Footer }    from '@/components/layout/Footer'
import { MobileNav } from '@/components/layout/MobileNav'
import { Toast }     from '@/components/feedback/Toast'

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="pb-20 md:pb-0">
        {children}
      </main>
      <Footer />
      <MobileNav />
      <Toast />
    </>
  )
}
