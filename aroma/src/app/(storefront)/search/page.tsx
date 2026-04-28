import type { Metadata } from 'next'
import { Suspense }        from 'react'
import { SearchPageClient } from '@/features/catalog/SearchPageClient'

export const metadata: Metadata = {
  title: 'Search Fragrances',
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageClient />
    </Suspense>
  )
}
