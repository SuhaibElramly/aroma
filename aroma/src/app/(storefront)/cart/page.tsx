import type { Metadata } from 'next'
import { CartPageClient } from '@/features/cart/CartPageClient'

export const metadata: Metadata = {
  title: 'Shopping Bag',
}

export default function CartPage() {
  return <CartPageClient />
}
