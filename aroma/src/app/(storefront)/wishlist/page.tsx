import type { Metadata } from 'next'
import { WishlistPageClient } from '@/features/wishlist/WishlistPageClient'

export const metadata: Metadata = {
  title: 'My Wishlist',
}

export default function WishlistPage() {
  return <WishlistPageClient />
}
