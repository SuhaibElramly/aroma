import type { Metadata } from 'next'
import { PRODUCTS }        from '@/mocks/data'
import { ProductPageClient } from '@/features/product/ProductPageClient'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return PRODUCTS.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product  = PRODUCTS.find(p => p.slug === slug)
  return {
    title: product ? `${product.name} — ${product.brand}` : 'Product',
    description: product?.description,
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  return <ProductPageClient slug={slug} />
}
