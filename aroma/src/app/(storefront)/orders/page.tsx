import type { Metadata } from 'next'
import { OrdersPageClient } from '@/features/orders/OrdersPageClient'

export const metadata: Metadata = {
  title: 'My Orders',
}

export default function OrdersPage() {
  return <OrdersPageClient />
}
