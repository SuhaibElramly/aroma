import type { Metadata } from 'next'
import { HomePageClient } from '@/features/home/HomePageClient'

export const metadata: Metadata = {
  title: 'Aroma — Premium Fragrance',
}

export default function HomePage() {
  return <HomePageClient />
}
