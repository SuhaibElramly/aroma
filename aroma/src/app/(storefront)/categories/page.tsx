import type { Metadata } from 'next'
import { BrandsPageClient } from '@/features/catalog/BrandsPageClient'

export const metadata: Metadata = {
  title: 'Brands & Categories',
}

// Both /brands and /categories render the same browse view
export default function CategoriesPage() {
  return <BrandsPageClient />
}
