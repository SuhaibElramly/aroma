import type { Metadata } from 'next'
import { ORDERS }          from '@/mocks/data'
import { OrderDetailClient } from '@/features/orders/OrderDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateStaticParams() {
  return ORDERS.map(o => ({ id: o.id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return { title: `Order ${id}` }
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  return <OrderDetailClient orderId={id} />
}
