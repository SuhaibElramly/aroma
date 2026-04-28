import type { Product } from '@/types'

interface Props {
  product: Pick<Product, 'placeholder' | 'type' | 'sizes'>
  height?: number
}

export function ProductPlaceholder({ product, height = 280 }: Props) {
  const { bg, dot } = product.placeholder
  const bottleH = height * 0.65
  const bottleW = height * 0.45

  return (
    <div
      style={{ height, backgroundColor: bg }}
      className="flex items-center justify-center relative overflow-hidden shrink-0 select-none"
    >
      {/* Bottle silhouette */}
      <div
        style={{
          width:        bottleW,
          height:       bottleH,
          borderRadius: '50% 50% 48% 52% / 60% 60% 40% 40%',
          background:   `linear-gradient(160deg, ${dot}55, ${dot}22)`,
          border:       `1px solid ${dot}44`,
        }}
      />
      {/* Type label */}
      <div
        style={{ color: dot }}
        className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.15em]
                   font-sans uppercase whitespace-nowrap opacity-70"
      >
        {product.type} · {product.sizes[0]}
      </div>
    </div>
  )
}
