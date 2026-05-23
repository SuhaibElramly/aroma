'use client'

import { HeroSection }   from './HeroSection'
import { HomeSections }  from './HomeSection'
import { SkeletonGrid }  from '@/components/feedback/SkeletonCard'
import { useHomeData }   from '@/lib/api/queries'

export function HomePageClient() {
  const { data, isPending, isError } = useHomeData()

  return (
    <>
      <HeroSection />
      {isPending && (
        <div className="px-12 py-16 space-y-16">
          <SkeletonGrid count={3} cols="grid-cols-3" />
          <SkeletonGrid count={4} cols="grid-cols-4" compact />
        </div>
      )}
      {isError && (
        <p className="text-center py-20 text-aroma-muted font-sans text-sm">
          Failed to load content. Please refresh.
        </p>
      )}
      {data && <HomeSections data={data} />}
    </>
  )
}
