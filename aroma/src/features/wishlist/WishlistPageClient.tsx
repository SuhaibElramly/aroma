'use client'

import { useEffect }      from 'react'
import { useRouter }      from 'next/navigation'
import { Heart }           from 'lucide-react'
import { SectionHeader }   from '@/components/shared/SectionHeader'
import { ProductCard }     from '@/components/shared/ProductCard'
import { EmptyState }      from '@/components/shared/EmptyState'
import { SkeletonGrid }    from '@/components/feedback/SkeletonCard'
import { useAuthStore }    from '@/store/auth'
import { useWishlistStore } from '@/store/wishlist'
import { useWishlist }     from '@/lib/api/queries'

export function WishlistPageClient() {
  const router     = useRouter()
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const setIds     = useWishlistStore(s => s.setIds)

  const { data: products = [], isPending } = useWishlist(isLoggedIn)

  // Sync fetched ids into the store so WishlistButton shows correct state
  useEffect(() => {
    setIds(products.map(p => p.id))
  }, [products, setIds])

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/login?redirect=/wishlist')
    }
  }, [isLoggedIn, router])

  if (!isLoggedIn) return null

  return (
    <div className="pt-24 pb-20 px-6 md:px-12">
      <SectionHeader label="قائمة" title="المفضلة" />
      {isPending ? (
        <SkeletonGrid count={4} compact cols="grid-cols-2 md:grid-cols-4" />
      ) : products.length === 0 ? (
        <EmptyState
          Icon={Heart}
          title="قائمة المفضلة فارغة"
          subtitle="احفظ العطور التي تعجبك — ستجد كل ماهو جديد وتسليم فوري 🎁"
          action="تصفح العطور"
          onAction={() => router.push('/search')}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
          {products.map(p => <ProductCard key={p.id} product={p} compact />)}
        </div>
      )}
    </div>
  )
}
