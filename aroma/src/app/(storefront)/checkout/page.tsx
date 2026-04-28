import type { Metadata } from 'next'
import { CheckoutPageClient } from '@/features/checkout/CheckoutPageClient'

export const metadata: Metadata = {
  title: 'Checkout',
}

export default function CheckoutPage() {
  return <CheckoutPageClient />
}
