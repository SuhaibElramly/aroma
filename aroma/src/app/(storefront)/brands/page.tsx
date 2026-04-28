import type { Metadata } from 'next'
import { BrandsPageClient } from '@/features/catalog/BrandsPageClient'

export const metadata: Metadata = {
  title: 'Brands & Houses',
}

export default function BrandsPage() {
  return <BrandsPageClient />
}
