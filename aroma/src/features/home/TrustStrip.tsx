const TRUST_ITEMS = [
  ['أصالة مضمونة',        'كل زجاجة مضمونة الأصل'],
  ['تغليف هدايا مجاني',   'على جميع الطلبات'],
  ['تشكيلة مختارة بعناية', '+٣٠٠ عطر'],
  ['إرجاع سهل',            'سياسة ١٤ يومًا'],
]

export function TrustStrip() {
  return (
    <div className="bg-aroma-card py-[18px] px-8 flex flex-wrap justify-center gap-10 md:gap-14">
      {TRUST_ITEMS.map(([title, sub]) => (
        <div key={title} className="text-center">
          <p className="font-sans text-[12px] font-medium tracking-[0.06em] text-white mb-0.5">{title}</p>
          <p className="font-sans text-[11px] text-white/45">{sub}</p>
        </div>
      ))}
    </div>
  )
}
