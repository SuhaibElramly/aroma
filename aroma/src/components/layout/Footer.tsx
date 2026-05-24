import Link from 'next/link'
import Image from 'next/image'

export function Footer({ logoUrl }: { logoUrl?: string | null }) {
  return (
    <footer className="border-t border-aroma-border bg-aroma-surface mt-20">
      <div className="max-w-[1200px] mx-auto px-12 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="md:col-span-1">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Aroma"
              height={28}
              width={100}
              className="object-contain object-left mb-3"
              style={{ height: 28, width: 'auto' }}
            />
          ) : (
            <p className="font-display text-2xl font-semibold tracking-[0.18em] text-aroma-text mb-3">
              AROMA
            </p>
          )}
          <p className="font-sans text-[13px] text-aroma-muted leading-relaxed max-w-[220px]">
            عطور مختارة من أرقى دور العطور حول العالم.
          </p>
        </div>

        {/* Shop */}
        <div>
          <p className="font-sans text-[11px] tracking-[0.12em] uppercase text-aroma-faint mb-4">
            تسوّق
          </p>
          <ul className="space-y-2.5">
            {[
              { label: 'وصل حديثًا',    href: '/search?filter=new' },
              { label: 'الأكثر مبيعًا', href: '/search?filter=bestseller' },
              { label: 'العروض',         href: '/search?filter=offer' },
              { label: 'جميع الماركات', href: '/brands' },
            ].map(l => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="font-sans text-[13px] text-aroma-muted hover:text-aroma-text transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Account */}
        <div>
          <p className="font-sans text-[11px] tracking-[0.12em] uppercase text-aroma-faint mb-4">
            حسابي
          </p>
          <ul className="space-y-2.5">
            {[
              { label: 'طلباتي',   href: '/orders' },
              { label: 'المفضلة', href: '/wishlist' },
              { label: 'ملفي',    href: '/profile' },
            ].map(l => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="font-sans text-[13px] text-aroma-muted hover:text-aroma-text transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <p className="font-sans text-[11px] tracking-[0.12em] uppercase text-aroma-faint mb-4">
            تواصل معنا
          </p>
          <ul className="space-y-3">
            <li>
              <p className="font-sans text-[12px] text-aroma-muted leading-relaxed">
                📍 فينسيا، شارع السفارة الأمريكية سابقاً،<br />بجوار مركز سمراء — بنغازي
              </p>
            </li>
            <li>
              <a
                href="https://wa.me/218918674761"
                className="font-sans text-[13px] text-aroma-muted hover:text-aroma-text transition-colors"
              >
                📞 918674761 91+
              </a>
            </li>
            <li>
              <p className="font-sans text-[12px] text-aroma-muted">
                🕘 ١٠ صباحاً – ١٠ مساءً
              </p>
            </li>
            <li>
              <a
                href="https://aromashop.ly"
                className="font-sans text-[13px] text-aroma-muted hover:text-aroma-text transition-colors"
              >
                aromashop.ly
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-aroma-border">
        <div className="max-w-[1200px] mx-auto px-12 py-5 flex flex-col md:flex-row
                        items-center justify-between gap-3">
          <p className="font-sans text-[12px] text-aroma-faint">
            © {new Date().getFullYear()} AROMA. جميع الحقوق محفوظة.
          </p>
          <p className="font-sans text-[12px] text-aroma-faint">
            الأسعار بالدينار الليبي (د.ل)
          </p>
        </div>
      </div>
    </footer>
  )
}
