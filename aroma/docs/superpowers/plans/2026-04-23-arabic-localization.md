# Arabic Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the entire Aroma storefront to Arabic (RTL) and replace all seeded data with Arabic content inspired by the Libyan shop Aroma Shop LY.

**Architecture:** Single-language Arabic app — no i18n library needed. Replace all hardcoded English strings with Arabic directly in each component. Add RTL support via `dir="rtl"` + `lang="ar"` on the root `<html>` element and an Arabic Google Font (IBM Plex Arabic). Update Laravel seeders with Arabic product/category/brand data.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, `next/font/google` (IBM Plex Arabic), Laravel 11, PHP seeders.

---

## File Map

| Action | File |
|--------|------|
| Modify | `aroma/src/app/layout.tsx` |
| Modify | `aroma/src/app/globals.css` |
| Modify | `aroma/src/lib/constants/index.ts` |
| Modify | `aroma/src/lib/formatters/index.ts` |
| Modify | `aroma/src/components/layout/Header.tsx` |
| Modify | `aroma/src/components/layout/Footer.tsx` |
| Modify | `aroma/src/components/layout/MobileNav.tsx` |
| Modify | `aroma/src/features/home/HeroSection.tsx` |
| Modify | `aroma/src/features/home/TrustStrip.tsx` |
| Modify | `aroma/src/features/home/HomeSection.tsx` |
| Modify | `aroma/src/features/auth/LoginPageClient.tsx` |
| Modify | `aroma/src/features/auth/RegisterPageClient.tsx` |
| Modify | `aroma/src/features/catalog/FilterSidebar.tsx` |
| Modify | `aroma/src/features/catalog/SearchPageClient.tsx` |
| Modify | `aroma/src/features/catalog/BrandsPageClient.tsx` |
| Modify | `aroma/src/features/product/ProductPageClient.tsx` |
| Modify | `aroma/src/features/cart/CartPageClient.tsx` |
| Modify | `aroma/src/features/checkout/CheckoutPageClient.tsx` |
| Modify | `aroma/src/features/orders/OrdersPageClient.tsx` |
| Modify | `aroma/src/features/orders/OrderDetailClient.tsx` |
| Modify | `aroma/src/features/profile/ProfilePageClient.tsx` |
| Modify | `aroma/src/features/profile/SettingsPageClient.tsx` |
| Modify | `aroma/src/features/profile/AddressesPageClient.tsx` |
| Modify | `aroma/src/features/wishlist/WishlistPageClient.tsx` |
| Modify | `aroma/src/components/shared/ProductCard.tsx` |
| Modify | `aroma-api/database/seeders/CategorySeeder.php` |
| Modify | `aroma-api/database/seeders/BrandSeeder.php` |
| Modify | `aroma-api/database/seeders/ProductSeeder.php` |

---

### Task 1: RTL Layout & Arabic Font

**Files:**
- Modify: `aroma/src/app/layout.tsx`
- Modify: `aroma/src/app/globals.css`

- [ ] **Step 1: Update root layout to use IBM Plex Arabic font and set RTL direction**

Replace the entire content of `aroma/src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { IBM_Plex_Sans_Arabic } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'أروما — عطور فاخرة',
    template: '%s | أروما',
  },
  description:
    'عطور مختارة بعناية من أرقى دور العطور في العالم. اكتشف العطور النادرة والروائح الفاخرة.',
  keywords: ['عطر', 'عطور', 'عود', 'نيش', 'عطور فاخرة'],
  openGraph: {
    title: 'أروما — عطور فاخرة',
    description: 'عطور مختارة بعناية من أرقى دور العطور في العالم.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={ibmPlexArabic.variable}>
      <body className="font-sans bg-aroma-bg text-aroma-text antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

> Note: We drop `Cormorant_Garamond` and `DM_Sans` since they don't support Arabic script. `--font-display` is removed; the existing `font-display` Tailwind class will fall back to `font-sans` which is now IBM Plex Arabic.

- [ ] **Step 2: Remove `font-display` variable reference from globals.css if set**

Open `aroma/src/app/globals.css`. If you see `--font-display` referenced as a CSS variable body or root declaration, remove it. Add this at the top of the `:root` block (or as a new rule) to ensure text-align starts from right:

```css
/* Ensure RTL body defaults */
body {
  text-align: right;
}
```

- [ ] **Step 3: Verify the dev server starts without font errors**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
npm run dev
```

Expected: No TypeScript/font import errors. Page loads with Arabic font applied.

- [ ] **Step 4: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: set RTL direction and IBM Plex Arabic font for Arabic localization"
```

---

### Task 2: Arabic Constants & Formatters

**Files:**
- Modify: `aroma/src/lib/constants/index.ts`
- Modify: `aroma/src/lib/formatters/index.ts`

- [ ] **Step 1: Replace all English labels in constants with Arabic**

Replace the entire content of `aroma/src/lib/constants/index.ts`:

```ts
import type { StockStatus, OrderStatus, SortOption } from '@/types'

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  'in-stock':     'متوفر',
  'low-stock':    'كمية محدودة',
  'out-of-stock': 'نفذ المخزون',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed:    'تم الطلب',
  confirmed: 'مؤكد',
  preparing: 'قيد التجهيز',
  ready:     'جاهز للاستلام',
  delivered: 'تم التسليم',
  cancelled: 'ملغى',
}

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'featured',   label: 'مميز' },
  { value: 'newest',     label: 'الأحدث' },
  { value: 'price-asc',  label: 'السعر: من الأقل' },
  { value: 'price-desc', label: 'السعر: من الأعلى' },
  { value: 'rating',     label: 'الأعلى تقييمًا' },
]

export const PRODUCT_TYPES = ['EDP', 'EDT', 'Parfum', 'EDC'] as const

export const PRODUCT_CATEGORIES = ['نساء', 'رجال', 'يونيسكس'] as const

export const PRICE_RANGE = { min: 0, max: 600, step: 10 } as const

export const CURRENCY = 'د.ل' as const

export const TOAST_DURATION = 2400 as const

export const MOCK_DELAY = 300 as const
```

- [ ] **Step 2: Update formatters to use Arabic-Indic numerals and LYD symbol**

Replace the entire content of `aroma/src/lib/formatters/index.ts`:

```ts
import { CURRENCY } from '@/lib/constants'

export function formatPrice(amount: number): string {
  return `${amount.toLocaleString('ar-LY')} ${CURRENCY}`
}

export function formatPriceCompact(amount: number): string {
  return `${amount} ${CURRENCY}`
}

export function formatOrderId(id: string): string {
  return id
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ar-LY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function unslugify(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength).trimEnd() + '…'
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add src/lib/constants/index.ts src/lib/formatters/index.ts
git commit -m "feat: Arabic labels for stock status, order status, sort options, and currency symbol"
```

---

### Task 3: Arabic Navigation (Header, Footer, MobileNav)

**Files:**
- Modify: `aroma/src/components/layout/Header.tsx`
- Modify: `aroma/src/components/layout/Footer.tsx`
- Modify: `aroma/src/components/layout/MobileNav.tsx`

- [ ] **Step 1: Arabize the Header nav links**

In `aroma/src/components/layout/Header.tsx`, replace the `NAV_LINKS` and `ICON_LINKS` arrays and the logo text:

```tsx
const NAV_LINKS = [
  { label: 'اكتشف',       href: '/' },
  { label: 'الماركات',   href: '/brands' },
  { label: 'وصل حديثًا', href: '/search?filter=new' },
  { label: 'العروض',     href: '/search?filter=offer' },
]

const ICON_LINKS = [
  { icon: Search,      href: '/search',   label: 'بحث' },
  { icon: Heart,       href: '/wishlist', label: 'المفضلة' },
  { icon: ShoppingBag, href: '/cart',     label: 'السلة' },
  { icon: User,        href: '/profile',  label: 'حسابي' },
]
```

Also update the logo `<Link>` text from `AROMA` to `أروما`:

```tsx
<Link
  href="/"
  className="shrink-0 font-display text-[20px] font-semibold tracking-[0.18em] text-[#F4EFE8]"
>
  أروما
</Link>
```

- [ ] **Step 2: Arabize Footer content**

Replace the entire content of `aroma/src/components/layout/Footer.tsx`:

```tsx
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-aroma-border bg-aroma-surface mt-20">
      <div className="max-w-[1200px] mx-auto px-12 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="md:col-span-1">
          <p className="font-display text-2xl font-semibold tracking-[0.18em] text-aroma-text mb-3">
            أروما
          </p>
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
              { label: 'وصل حديثًا',  href: '/search?filter=new' },
              { label: 'الأكثر مبيعًا', href: '/search?filter=bestseller' },
              { label: 'العروض',        href: '/search?filter=offer' },
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

        {/* Info */}
        <div>
          <p className="font-sans text-[11px] tracking-[0.12em] uppercase text-aroma-faint mb-4">
            معلومات
          </p>
          <ul className="space-y-2.5">
            {[
              'ضمان الأصالة',
              'تغليف هدايا مجاني',
              'الإرجاع والاستبدال',
              'تواصل معنا',
            ].map(l => (
              <li key={l}>
                <span className="font-sans text-[13px] text-aroma-muted">{l}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-aroma-border">
        <div className="max-w-[1200px] mx-auto px-12 py-5 flex flex-col md:flex-row
                        items-center justify-between gap-3">
          <p className="font-sans text-[12px] text-aroma-faint">
            © {new Date().getFullYear()} أروما. جميع الحقوق محفوظة.
          </p>
          <p className="font-sans text-[12px] text-aroma-faint">
            الأسعار بالدينار الليبي (د.ل)
          </p>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 3: Arabize MobileNav labels**

In `aroma/src/components/layout/MobileNav.tsx`, replace the `TABS` array:

```tsx
const TABS = [
  { icon: Home,        label: 'الرئيسية', href: '/' },
  { icon: Search,      label: 'بحث',      href: '/search' },
  { icon: Heart,       label: 'المفضلة',  href: '/wishlist' },
  { icon: ShoppingBag, label: 'السلة',    href: '/cart' },
  { icon: User,        label: 'حسابي',    href: '/profile' },
]
```

- [ ] **Step 4: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add src/components/layout/Header.tsx src/components/layout/Footer.tsx src/components/layout/MobileNav.tsx
git commit -m "feat: Arabic navigation — header, footer, mobile nav"
```

---

### Task 4: Arabic Home Page

**Files:**
- Modify: `aroma/src/features/home/HeroSection.tsx`
- Modify: `aroma/src/features/home/TrustStrip.tsx`
- Modify: `aroma/src/features/home/HomeSection.tsx`

- [ ] **Step 1: Arabize HeroSection copy and scent words**

In `aroma/src/features/home/HeroSection.tsx`, replace the `SCENT_WORDS`, `STATS`, and all hardcoded strings:

```tsx
const SCENT_WORDS = [
  { word: 'وردة',    top: '12%', left: '10%', delay: 0,   size: 11 },
  { word: 'عود',     top: '22%', left: '72%', delay: 1.2, size: 10 },
  { word: 'عنبر',    top: '55%', left: '8%',  delay: 2.1, size: 10 },
  { word: 'زعفران',  top: '72%', left: '68%', delay: 0.8, size: 9  },
  { word: 'فيتيفر',  top: '85%', left: '20%', delay: 1.7, size: 9  },
  { word: 'مسك',     top: '38%', left: '80%', delay: 0.4, size: 10 },
  { word: 'نيرولي',  top: '65%', left: '42%', delay: 2.5, size: 9  },
]

const STATS = [
  ['+٣٠٠', 'عطر'],
  ['+٤٠',  'ماركة'],
  ['٥★',   'متوسط التقييم'],
]
```

Replace the copy inside the hero `<div>` (left editorial section). Find and replace these JSX text nodes:

- `Spring Collection · 2026` → `مجموعة الربيع · ٢٠٢٦`
- `Wear a` → `ارتدِ`
- `memory.` → `ذكرى.`
- `Leave a legend.` → `واترك أثرًا.`
- The subtitle paragraph: `Curated fragrances from the world's most distinguished houses — each one a story waiting to begin.` → `عطور مختارة من أرقى دور العطور في العالم — كلٌّ منها حكاية تنتظر أن تبدأ.`
- `EXPLORE COLLECTION` button: → `استكشف المجموعة`
- `BROWSE BRANDS` button: → `تصفح الماركات`
- The `SCROLL` text at the bottom: → `مرر`
- The bottle label `AROMA` inside the CSS bottle: → `أروما`

- [ ] **Step 2: Arabize TrustStrip**

Replace the entire content of `aroma/src/features/home/TrustStrip.tsx`:

```tsx
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
```

- [ ] **Step 3: Arabize HomeSection labels**

In `aroma/src/features/home/HomeSection.tsx`, replace every `<SectionHeader>` call and hardcoded English string:

- `BestsellersSection`: `label="Customer Favourites"` → `label="أكثر العطور طلبًا"` and `title="Bestsellers"` → `title="الأكثر مبيعًا"`, `action="View all"` → `action="عرض الكل"`
- `CategoriesStrip`: `label="Shop by"` → `label="تسوق حسب"`, `title="Category"` → `title="الفئة"`, `{cat.count} scents` → `{cat.count} عطر`
- `NewArrivalsSection`: `label="Just Landed"` → `label="وصل حديثًا"`, `title="New Arrivals"` → `title="الوافدون الجدد"`, `action="See all"` → `action="مشاهدة الكل"`
- Any other English section headers or "View all" / "See all" links — translate them all to Arabic.

- [ ] **Step 4: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add src/features/home/HeroSection.tsx src/features/home/TrustStrip.tsx src/features/home/HomeSection.tsx
git commit -m "feat: Arabic home page — hero, trust strip, sections"
```

---

### Task 5: Arabic Auth Pages

**Files:**
- Modify: `aroma/src/features/auth/LoginPageClient.tsx`
- Modify: `aroma/src/features/auth/RegisterPageClient.tsx`

- [ ] **Step 1: Arabize LoginPageClient**

In `aroma/src/features/auth/LoginPageClient.tsx`, replace every English string:

```tsx
// Header
<h1 ...>أهلاً بعودتك</h1>
<p ...>سجّل دخولك إلى حساب أروما</p>

// Email field
<label ...>البريد الإلكتروني</label>
<input placeholder="sarah@example.com" .../>

// Password field
<label ...>كلمة المرور</label>
<input placeholder="••••••••" .../>

// Remember / forgot
<span ...>تذكّرني</span>
<button ...>نسيت كلمة المرور؟</button>

// Submit button
{isSubmitting ? 'جارٍ تسجيل الدخول…' : 'تسجيل الدخول'}

// Demo hint
Demo: <span>sarah@example.com</span> / <span>password123</span>
// Replace with:
تجربة: <span className="font-medium text-aroma-text">sarah@example.com</span> / <span className="font-medium text-aroma-text">password123</span>

// Footer link
<p ...>ليس لديك حساب؟{' '}<Link ...>أنشئ حسابًا</Link></p>
```

Also update the `aria-label` for the password toggle:
```tsx
aria-label={showPwd ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
```

- [ ] **Step 2: Arabize RegisterPageClient**

In `aroma/src/features/auth/RegisterPageClient.tsx`, replace every English string:

```tsx
// Header
<h1 ...>إنشاء حساب</h1>
<p ...>انضم إلى أروما لتجربة عطور استثنائية</p>

// Full name field
<label ...>الاسم الكامل</label>
<input placeholder="سارة الرشيدي" .../>

// Email field
<label ...>البريد الإلكتروني</label>

// Password field
<label ...>كلمة المرور</label>
<input placeholder="أنشئ كلمة مرور قوية" .../>

// Password rules (PASSWORD_RULES array)
const PASSWORD_RULES = [
  { label: '٨ أحرف على الأقل',    test: (v: string) => v.length >= 8 },
  { label: 'حرف كبير واحد على الأقل', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'رقم واحد على الأقل',   test: (v: string) => /\d/.test(v) },
]

// Confirm password field
<label ...>تأكيد كلمة المرور</label>
<input placeholder="أعد كتابة كلمة المرور" .../>

// Submit button
{isSubmitting ? 'جارٍ إنشاء الحساب…' : 'إنشاء الحساب'}

// Footer link
<p ...>لديك حساب بالفعل؟{' '}<Link ...>سجّل دخولك</Link></p>
```

Also update the toast message in `onSubmit`:
```tsx
showToast('تم إنشاء حسابك — أهلاً بك في أروما ✦')
```

- [ ] **Step 3: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add src/features/auth/LoginPageClient.tsx src/features/auth/RegisterPageClient.tsx
git commit -m "feat: Arabic auth pages — login and register"
```

---

### Task 6: Arabic Catalog Pages

**Files:**
- Modify: `aroma/src/features/catalog/FilterSidebar.tsx`
- Modify: `aroma/src/features/catalog/SearchPageClient.tsx`
- Modify: `aroma/src/features/catalog/BrandsPageClient.tsx`

- [ ] **Step 1: Arabize FilterSidebar**

In `aroma/src/features/catalog/FilterSidebar.tsx`, replace `FILTER_GROUPS` and all UI strings:

```tsx
const FILTER_GROUPS = [
  {
    key:   'special' as const,
    label: 'مميز',
    opts: [
      ['new',        'وصل حديثًا'],
      ['bestseller', 'الأكثر مبيعًا'],
      ['offer',      'عروض'],
    ],
  },
  {
    key:   'category' as const,
    label: 'الفئة',
    opts: [['Women', 'نساء'], ['Men', 'رجال'], ['Unisex', 'يونيسكس']],
  },
  {
    key:   'type' as const,
    label: 'التركيز',
    opts: [['EDP', 'إيو دي بارفان'], ['EDT', 'إيو دي تواليت'], ['Parfum', 'بارفان']],
  },
  {
    key:   'brand' as const,
    label: 'الماركة',
    opts: BRANDS.map(b => [b.id, b.name]),
  },
]
```

Also update the sidebar header:
```tsx
// "Filters" → "الفلاتر"
<span ...>الفلاتر{' '}...</span>

// "Clear all" → "مسح الكل"
<button ...>مسح الكل</button>

// "Price Range" → "نطاق السعر"
<p ...>نطاق السعر</p>
```

- [ ] **Step 2: Arabize SearchPageClient**

In `aroma/src/features/catalog/SearchPageClient.tsx`, replace all English UI strings:

```tsx
// Search input placeholder
<input placeholder="ابحث عن عطر، ماركة..." .../>

// Sort label and any "Results" text
// Find the sort dropdown label if present → "ترتيب"

// Empty state call (already uses Arabic via EmptyState props):
<EmptyState
  Icon={Search}
  title="لا توجد نتائج"
  subtitle="جرّب تعديل فلاتر البحث أو ابحث بكلمة مختلفة."
  action="مسح الفلاتر"
  onAction={clearAll}
/>

// "Filters" button on mobile
<button ...><SlidersHorizontal size={16} /> الفلاتر</button>

// "Results" count if shown → "{count} عطر"
```

- [ ] **Step 3: Arabize BrandsPageClient**

In `aroma/src/features/catalog/BrandsPageClient.tsx`, replace all English strings:

```tsx
// Page header
<p ...>اكتشف</p>
<h1 ...>الماركات والدور</h1>

// "{brand.count} fragrances" → "{brand.count} عطر"
<p ...>{brand.count} عطر</p>

// SectionHeader for categories
<SectionHeader label="تسوق حسب" title="الفئة" />

// Any empty state
<EmptyState
  Icon={...}
  title="لا توجد ماركات"
  subtitle="تعذّر تحميل الماركات. حاول مرة أخرى."
/>
```

- [ ] **Step 4: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add src/features/catalog/FilterSidebar.tsx src/features/catalog/SearchPageClient.tsx src/features/catalog/BrandsPageClient.tsx
git commit -m "feat: Arabic catalog pages — filter sidebar, search, brands"
```

---

### Task 7: Arabic Product Page & ProductCard Badge

**Files:**
- Modify: `aroma/src/features/product/ProductPageClient.tsx`
- Modify: `aroma/src/components/shared/ProductCard.tsx`

- [ ] **Step 1: Arabize ProductPageClient UI strings**

In `aroma/src/features/product/ProductPageClient.tsx`, replace English UI strings:

```tsx
// Back button
<button ...><ChevronLeft size={16} /> رجوع</button>

// "Add to Bag" button (find the button that calls handleAdd)
// When added:
{added ? '✓ تمت الإضافة' : 'أضف إلى السلة'}

// "Out of stock" state on button → 'نفذ المخزون'

// Notes section headings
// "Top Notes" → "رائحة افتتاحية"
// "Heart Notes" → "رائحة القلب"  
// "Base Notes" → "رائحة القاعدة"

// "Similar Fragrances" section header
<SectionHeader label="قد يعجبك أيضًا" title="عطور مشابهة" />

// Product not found message
<div ...>
  المنتج غير موجود. <Link href="/search" className="underline">العودة للبحث</Link>
</div>

// "Reviews" count label if shown → "تقييم"
// Rating label if shown → "التقييم"

// Quantity label if shown → "الكمية"
```

- [ ] **Step 2: Arabize ProductCard badge labels**

In `aroma/src/components/shared/ProductCard.tsx`, replace English badge text:

```tsx
// "NEW" badge
<span ...>جديد</span>

// "OFFER" badge
<span ...>عرض</span>

// "BESTSELLER" strip
<div ...>الأكثر مبيعًا</div>
```

- [ ] **Step 3: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add src/features/product/ProductPageClient.tsx src/components/shared/ProductCard.tsx
git commit -m "feat: Arabic product page and product card badges"
```

---

### Task 8: Arabic Cart & Checkout

**Files:**
- Modify: `aroma/src/features/cart/CartPageClient.tsx`
- Modify: `aroma/src/features/checkout/CheckoutPageClient.tsx`

- [ ] **Step 1: Arabize CartPageClient**

In `aroma/src/features/cart/CartPageClient.tsx`, replace all English strings:

```tsx
// SectionHeader
<SectionHeader label="مراجعة" title="سلة التسوق" />

// EmptyState
<EmptyState
  Icon={ShoppingBag}
  title="سلتك فارغة"
  subtitle="اكتشف العطور التي تعجبك."
  action="تسوّق الآن"
  onAction={() => router.push('/search')}
/>

// Remove item toast
showToast('تمت إزالة المنتج')

// Order summary section labels (find them in the JSX):
// "Order Summary" → "ملخص الطلب"
// "Subtotal" → "المجموع الفرعي"
// "Shipping" → "الشحن"
// "Free" → "مجاني"
// "Total" → "الإجمالي"

// Checkout button
<button ...>المتابعة للدفع</button>

// "Continue Shopping" link if present → "مواصلة التسوق"
```

- [ ] **Step 2: Arabize CheckoutPageClient**

In `aroma/src/features/checkout/CheckoutPageClient.tsx`, replace all English strings:

```tsx
// SectionHeader
<SectionHeader label="أكمل" title="طلبك" />

// Form field labels
// "Full Name" → "الاسم الكامل"
// "Phone Number" → "رقم الهاتف"
// "Note (optional)" → "ملاحظة (اختياري)"
// "Pickup" checkbox label → "استلام من المتجر"

// Order summary labels
// "Order Summary" → "ملخص الطلب"
// "Total" → "الإجمالي"

// Submit button
// "Place Order" → "تأكيد الطلب"
// Loading state: "Placing order…" → "جارٍ إرسال الطلب…"

// Success state
<h2 ...>تم استلام طلبك</h2>
<p ...>سنتواصل معك قريبًا لتأكيد الطلب ومتابعة كل خطوة.</p>
```

- [ ] **Step 3: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add src/features/cart/CartPageClient.tsx src/features/checkout/CheckoutPageClient.tsx
git commit -m "feat: Arabic cart and checkout pages"
```

---

### Task 9: Arabic Orders, Profile, Addresses & Wishlist

**Files:**
- Modify: `aroma/src/features/orders/OrdersPageClient.tsx`
- Modify: `aroma/src/features/orders/OrderDetailClient.tsx`
- Modify: `aroma/src/features/profile/ProfilePageClient.tsx`
- Modify: `aroma/src/features/profile/SettingsPageClient.tsx`
- Modify: `aroma/src/features/profile/AddressesPageClient.tsx`
- Modify: `aroma/src/features/wishlist/WishlistPageClient.tsx`

- [ ] **Step 1: Arabize OrdersPageClient**

In `aroma/src/features/orders/OrdersPageClient.tsx`, replace English strings:

```tsx
<SectionHeader label="سجل" title="طلباتك" />

// EmptyState
<EmptyState
  Icon={Package}
  title="لا توجد طلبات بعد"
  subtitle="سيظهر سجل طلباتك هنا بعد أول عملية شراء."
  action="تسوّق الآن"
  onAction={() => router.push('/search')}
/>
```

- [ ] **Step 2: Arabize OrderDetailClient**

In `aroma/src/features/orders/OrderDetailClient.tsx`, replace English strings:

```tsx
// Back button → "رجوع"
// "Order Details" section header → label="تفاصيل" title="طلبك"
// "Order Timeline" / status labels come from ORDER_STATUS_LABELS (already Arabized in Task 2)
// "Items" → "المنتجات"
// "Total" → "الإجمالي"
// "Order not found" → "الطلب غير موجود"
```

- [ ] **Step 3: Arabize ProfilePageClient**

In `aroma/src/features/profile/ProfilePageClient.tsx`:

```tsx
// MENU_ITEMS array
const MENU_ITEMS: MenuItem[] = [
  { icon: Package,  label: 'طلباتي',         sub: 'تتبع طلباتك ومشاهدتها',          href: '/orders' },
  { icon: Heart,    label: 'المفضلة',         sub: 'العطور المحفوظة لديك',            href: '/wishlist' },
  { icon: MapPin,   label: 'العناوين',        sub: 'إدارة عناوين التوصيل',            href: '/profile/addresses' },
  { icon: Bell,     label: 'الإشعارات',       sub: 'تحديثات الطلبات والعروض',         href: '/profile/settings' },
  { icon: Settings, label: 'إعدادات الحساب',  sub: 'تعديل ملفك والتفضيلات',          href: '/profile/settings' },
]

// Not-logged-in state
<p ...>حسابي</p>
<p ...>سجّل دخولك للوصول إلى طلباتك ومفضلتك وإعداداتك.</p>
<button ...>تسجيل الدخول</button>
<button ...>إنشاء حساب</button>

// Logout button if present → "تسجيل الخروج"
```

- [ ] **Step 4: Arabize SettingsPageClient**

Open `aroma/src/features/profile/SettingsPageClient.tsx` and replace all English form labels and headings with Arabic equivalents:

```tsx
// Page/section header
<SectionHeader label="تعديل" title="إعداداتك" />
// or whatever header pattern it uses

// "Full Name" → "الاسم الكامل"
// "Email" → "البريد الإلكتروني"
// "Phone" → "رقم الهاتف"
// "Save Changes" → "حفظ التغييرات"
// "Change Password" section → "تغيير كلمة المرور"
// "Current Password" → "كلمة المرور الحالية"
// "New Password" → "كلمة المرور الجديدة"
// "Confirm Password" → "تأكيد كلمة المرور"
// "Update Password" → "تحديث كلمة المرور"
```

- [ ] **Step 5: Arabize AddressesPageClient**

Open `aroma/src/features/profile/AddressesPageClient.tsx` and replace all English strings:

```tsx
<SectionHeader label="إدارة" title="عناوينك" />

// "Add New Address" → "إضافة عنوان جديد"
// "Default" badge → "افتراضي"
// "Set as Default" → "تعيين كافتراضي"
// "Delete" → "حذف"
// Form labels:
// "City" → "المدينة"
// "Street" → "الشارع"
// "Building / Apt" → "المبنى / الشقة"
// "Save Address" → "حفظ العنوان"
// "Cancel" → "إلغاء"
// EmptyState: title="لا توجد عناوين محفوظة" subtitle="أضف عنوانًا لتسريع عملية الطلب."
```

- [ ] **Step 6: Arabize WishlistPageClient**

In `aroma/src/features/wishlist/WishlistPageClient.tsx`:

```tsx
<SectionHeader label="قائمة" title="المفضلة" />

<EmptyState
  Icon={Heart}
  title="قائمة المفضلة فارغة"
  subtitle="احفظ العطور التي تحبها وستجدها هنا دائمًا."
  action="استكشف المجموعة"
  onAction={() => router.push('/search')}
/>
```

- [ ] **Step 7: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add src/features/orders/ src/features/profile/ src/features/wishlist/
git commit -m "feat: Arabic orders, profile, addresses, and wishlist pages"
```

---

### Task 10: Arabic Seed Data

**Files:**
- Modify: `aroma-api/database/seeders/CategorySeeder.php`
- Modify: `aroma-api/database/seeders/BrandSeeder.php`
- Modify: `aroma-api/database/seeders/ProductSeeder.php`

- [ ] **Step 1: Replace CategorySeeder with Arabic categories**

Replace the entire content of `aroma-api/database/seeders/CategorySeeder.php`:

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['id' => 'women',  'label' => 'نساء',              'bg' => '#F5EBE8'],
            ['id' => 'men',    'label' => 'رجال',               'bg' => '#E8E4DC'],
            ['id' => 'unisex', 'label' => 'يونيسكس',            'bg' => '#E4EAE6'],
            ['id' => 'oud',    'label' => 'مجموعة العود',       'bg' => '#EDE4D0'],
            ['id' => 'fresh',  'label' => 'طازج وحمضي',         'bg' => '#E0EAF0'],
            ['id' => 'niche',  'label' => 'نيش ونادر',           'bg' => '#EDE8F2'],
        ];

        DB::table('categories')->insert($categories);
    }
}
```

- [ ] **Step 2: Replace BrandSeeder with Arabic/Libyan-inspired brands**

Replace the entire content of `aroma-api/database/seeders/BrandSeeder.php`:

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BrandSeeder extends Seeder
{
    public function run(): void
    {
        $brands = [
            [
                'id'      => 'bait-al-tayyib',
                'name'    => 'بيت الطيب',
                'origin'  => 'طرابلس',
                'tagline' => 'حيث تُحكى حكايات العطر',
                'bg'      => '#F2EBE4',
            ],
            [
                'id'      => 'al-wadi-al-akhdar',
                'name'    => 'الوادي الأخضر',
                'origin'  => 'الجبل الأخضر',
                'tagline' => 'نقاء الطبيعة في كل رشّة',
                'bg'      => '#E4EDE5',
            ],
            [
                'id'      => 'musk-al-lail',
                'name'    => 'مسك الليل',
                'origin'  => 'بنغازي',
                'tagline' => 'سحر الليل الليبي',
                'bg'      => '#E8E3DC',
            ],
            [
                'id'      => 'najmat-tarablus',
                'name'    => 'نجمة طرابلس',
                'origin'  => 'طرابلس',
                'tagline' => 'بريق المدينة الأبيضاء',
                'bg'      => '#EDE0C8',
            ],
            [
                'id'      => 'bint-al-sahraa',
                'name'    => 'بنت الصحراء',
                'origin'  => 'سبها',
                'tagline' => 'من قلب الصحراء الكبرى',
                'bg'      => '#EDE8F2',
            ],
            [
                'id'      => 'al-ain-al-zarqaa',
                'name'    => 'العين الزرقاء',
                'origin'  => 'طبرق',
                'tagline' => 'عطر البحر المتوسط',
                'bg'      => '#DDE8EC',
            ],
            [
                'id'      => 'al-atlas',
                'name'    => 'الأطلس',
                'origin'  => 'درنة',
                'tagline' => 'شموخ الجبال في زجاجة',
                'bg'      => '#E8ECE8',
            ],
            [
                'id'      => 'rihlet-al-itr',
                'name'    => 'رحلة العطر',
                'origin'  => 'مصراتة',
                'tagline' => 'كل عطر رحلة لا تُنسى',
                'bg'      => '#F0EDE0',
            ],
        ];

        DB::table('brands')->insert($brands);
    }
}
```

- [ ] **Step 3: Replace ProductSeeder with Arabic products**

Replace the entire content of `aroma-api/database/seeders/ProductSeeder.php`:

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            [
                'slug'          => 'wardah-samia',
                'brand_id'      => 'bait-al-tayyib',
                'category_id'   => 'women',
                'name'          => 'وردة سامية',
                'description'   => 'قصيدة في أجمل الأزهار — تنفتح وردة سامية بشلال من التوت الدافئ بالشمس، ثم تتفتح لتكشف عن قلب وردي فاخر لم تشهده من قبل.',
                'type'          => 'EDP',
                'rating'        => 4.8,
                'reviews_count' => 124,
                'is_new'        => true,
                'is_bestseller' => false,
                'is_offer'      => false,
                'placeholder_bg'  => '#F2E8E5',
                'placeholder_dot' => '#C9A0A0',
                'variants' => [
                    ['size' => '30ml',  'price' => 285.00, 'original_price' => null, 'stock' => 'in_stock'],
                    ['size' => '50ml',  'price' => 285.00, 'original_price' => null, 'stock' => 'in_stock'],
                    ['size' => '100ml', 'price' => 285.00, 'original_price' => null, 'stock' => 'in_stock'],
                ],
                'notes' => [
                    ['type' => 'top',   'note' => 'برغموت'],
                    ['type' => 'top',   'note' => 'توت العليق'],
                    ['type' => 'heart', 'note' => 'وردة دمشقية'],
                    ['type' => 'heart', 'note' => 'أوركيد'],
                    ['type' => 'base',  'note' => 'مسك'],
                    ['type' => 'base',  'note' => 'صندل'],
                ],
                'tags' => ['زهري', 'رومانسي', 'ربيعي'],
            ],
            [
                'slug'          => 'arz-wa-dukhaan',
                'brand_id'      => 'musk-al-lail',
                'category_id'   => 'men',
                'name'          => 'أرز ودخان',
                'description'   => 'لمن يدخل الغرفة فيغيّر أجواءها. أرز ودخان عطر جريء وجاف وذكوري بامتياز، دون ادّعاء أو ثقل.',
                'type'          => 'EDT',
                'rating'        => 4.9,
                'reviews_count' => 87,
                'is_new'        => false,
                'is_bestseller' => true,
                'is_offer'      => false,
                'placeholder_bg'  => '#E5E0D8',
                'placeholder_dot' => '#9C8870',
                'variants' => [
                    ['size' => '50ml',  'price' => 220.00, 'original_price' => null, 'stock' => 'in_stock'],
                    ['size' => '100ml', 'price' => 220.00, 'original_price' => null, 'stock' => 'in_stock'],
                ],
                'notes' => [
                    ['type' => 'top',   'note' => 'فلفل أسود'],
                    ['type' => 'top',   'note' => 'جريب فروت'],
                    ['type' => 'heart', 'note' => 'أرز'],
                    ['type' => 'heart', 'note' => 'جلد'],
                    ['type' => 'base',  'note' => 'دخان'],
                    ['type' => 'base',  'note' => 'فيتيفر'],
                ],
                'tags' => ['خشبي', 'مدخن', 'مسائي'],
            ],
            [
                'slug'          => 'ghassaq-al-anbar',
                'brand_id'      => 'al-wadi-al-akhdar',
                'category_id'   => 'unisex',
                'name'          => 'غسق العنبر',
                'description'   => 'يلتقط غسق العنبر اللحظة الدقيقة التي تغيب فيها الشمس خلف الأفق — تلك السكينة الذهبية الضبابية قبل حلول الليل.',
                'type'          => 'EDP',
                'rating'        => 4.7,
                'reviews_count' => 63,
                'is_new'        => false,
                'is_bestseller' => false,
                'is_offer'      => true,
                'placeholder_bg'  => '#EDE0C8',
                'placeholder_dot' => '#B8906A',
                'variants' => [
                    ['size' => '30ml',  'price' => 340.00, 'original_price' => 420.00, 'stock' => 'in_stock'],
                    ['size' => '50ml',  'price' => 340.00, 'original_price' => 420.00, 'stock' => 'in_stock'],
                    ['size' => '100ml', 'price' => 340.00, 'original_price' => 420.00, 'stock' => 'in_stock'],
                ],
                'notes' => [
                    ['type' => 'top',   'note' => 'زعفران'],
                    ['type' => 'top',   'note' => 'فلفل وردي'],
                    ['type' => 'heart', 'note' => 'عنبر'],
                    ['type' => 'heart', 'note' => 'لبدانم'],
                    ['type' => 'base',  'note' => 'عود'],
                    ['type' => 'base',  'note' => 'فانيليا'],
                ],
                'tags' => ['شرقي', 'دافئ', 'خريفي'],
            ],
            [
                'slug'          => 'fitivir-abyad',
                'brand_id'      => 'al-atlas',
                'category_id'   => 'men',
                'name'          => 'فيتيفر أبيض',
                'description'   => 'هادئ وواثق. يختزل فيتيفر أبيض العطر إلى جوهره — تركيبة نقية وهوائية مبنية على أندر الفيتيفر الأبيض.',
                'type'          => 'EDT',
                'rating'        => 4.6,
                'reviews_count' => 42,
                'is_new'        => false,
                'is_bestseller' => false,
                'is_offer'      => false,
                'placeholder_bg'  => '#E8ECE8',
                'placeholder_dot' => '#8EA890',
                'variants' => [
                    ['size' => '50ml',  'price' => 195.00, 'original_price' => null, 'stock' => 'low_stock'],
                    ['size' => '100ml', 'price' => 195.00, 'original_price' => null, 'stock' => 'low_stock'],
                ],
                'notes' => [
                    ['type' => 'top',   'note' => 'ليمون'],
                    ['type' => 'top',   'note' => 'هيل'],
                    ['type' => 'heart', 'note' => 'فيتيفر'],
                    ['type' => 'heart', 'note' => 'إيريس'],
                    ['type' => 'base',  'note' => 'مسك أبيض'],
                ],
                'tags' => ['طازج', 'نظيف', 'مينيمالي'],
            ],
            [
                'slug'          => 'zahrat-al-lail',
                'brand_id'      => 'bait-al-tayyib',
                'category_id'   => 'women',
                'name'          => 'زهرة الليل',
                'description'   => 'أزهار لا تتفتح إلا بعد الغروب. زهرة الليل عطر مسكر وآسر لا يُنسى — رائحة تبقى في الغرفة بعد مغادرتك.',
                'type'          => 'EDP',
                'rating'        => 4.9,
                'reviews_count' => 201,
                'is_new'        => false,
                'is_bestseller' => true,
                'is_offer'      => false,
                'placeholder_bg'  => '#EDE3F0',
                'placeholder_dot' => '#A088B0',
                'variants' => [
                    ['size' => '30ml',  'price' => 310.00, 'original_price' => null, 'stock' => 'in_stock'],
                    ['size' => '50ml',  'price' => 310.00, 'original_price' => null, 'stock' => 'in_stock'],
                    ['size' => '100ml', 'price' => 310.00, 'original_price' => null, 'stock' => 'in_stock'],
                ],
                'notes' => [
                    ['type' => 'top',   'note' => 'ياسمين ليلي'],
                    ['type' => 'top',   'note' => 'يلانغ يلانغ'],
                    ['type' => 'heart', 'note' => 'توبروز'],
                    ['type' => 'heart', 'note' => 'زهر البرتقال'],
                    ['type' => 'base',  'note' => 'بنزوين'],
                    ['type' => 'base',  'note' => 'مسك دافئ'],
                ],
                'tags' => ['زهري', 'ليلي', 'حسّي'],
            ],
            [
                'slug'          => 'oud-malaki',
                'brand_id'      => 'najmat-tarablus',
                'category_id'   => 'unisex',
                'name'          => 'عود ملكي',
                'description'   => 'مستخرج من أشجار العود المعمّرة، العود الملكي هو تاج مجموعة نجمة طرابلس. نادر وآمر ومصنوع ليدوم.',
                'type'          => 'EDP',
                'rating'        => 5.0,
                'reviews_count' => 38,
                'is_new'        => false,
                'is_bestseller' => false,
                'is_offer'      => false,
                'placeholder_bg'  => '#E8DDD0',
                'placeholder_dot' => '#9A7050',
                'variants' => [
                    ['size' => '30ml', 'price' => 450.00, 'original_price' => null, 'stock' => 'in_stock'],
                    ['size' => '50ml', 'price' => 450.00, 'original_price' => null, 'stock' => 'in_stock'],
                ],
                'notes' => [
                    ['type' => 'top',   'note' => 'وردة'],
                    ['type' => 'top',   'note' => 'زعفران'],
                    ['type' => 'heart', 'note' => 'عود كمبودي'],
                    ['type' => 'heart', 'note' => 'عود هندي'],
                    ['type' => 'base',  'note' => 'عنبر رمادي'],
                    ['type' => 'base',  'note' => 'مسك'],
                    ['type' => 'base',  'note' => 'صندل'],
                ],
                'tags' => ['عود', 'ملكي', 'قوي'],
            ],
            [
                'slug'          => 'ahlam-al-bahr',
                'brand_id'      => 'al-ain-al-zarqaa',
                'category_id'   => 'unisex',
                'name'          => 'أحلام البحر',
                'description'   => 'أغمض عينيك. نسيم دافئ. البحر المتوسط في الظهيرة. أحلام البحر بهجة عفوية في زجاجة.',
                'type'          => 'EDT',
                'rating'        => 4.5,
                'reviews_count' => 156,
                'is_new'        => false,
                'is_bestseller' => false,
                'is_offer'      => true,
                'placeholder_bg'  => '#DDE8EC',
                'placeholder_dot' => '#7090A0',
                'variants' => [
                    ['size' => '50ml',  'price' => 175.00, 'original_price' => 210.00, 'stock' => 'in_stock'],
                    ['size' => '100ml', 'price' => 175.00, 'original_price' => 210.00, 'stock' => 'in_stock'],
                ],
                'notes' => [
                    ['type' => 'top',   'note' => 'ملح البحر'],
                    ['type' => 'top',   'note' => 'حمضيات'],
                    ['type' => 'top',   'note' => 'أوورد بحري'],
                    ['type' => 'heart', 'note' => 'خشب مجروف'],
                    ['type' => 'base',  'note' => 'مسك أبيض'],
                    ['type' => 'base',  'note' => 'جوز الهند'],
                ],
                'tags' => ['طازج', 'بحري', 'صيفي'],
            ],
            [
                'slug'          => 'zanbaqa-mutlaqa',
                'brand_id'      => 'al-wadi-al-akhdar',
                'category_id'   => 'women',
                'name'          => 'زنبقة مطلقة',
                'description'   => 'مصنوعة من زبدة الأوريس — أحد أغلى المكونات الطبيعية على وجه الأرض — زنبقة مطلقة لمن يفهمون معنى الندرة.',
                'type'          => 'EDP',
                'rating'        => 4.8,
                'reviews_count' => 29,
                'is_new'        => true,
                'is_bestseller' => false,
                'is_offer'      => false,
                'placeholder_bg'  => '#E8E5F0',
                'placeholder_dot' => '#9080B0',
                'variants' => [
                    ['size' => '30ml', 'price' => 390.00, 'original_price' => null, 'stock' => 'in_stock'],
                    ['size' => '50ml', 'price' => 390.00, 'original_price' => null, 'stock' => 'in_stock'],
                ],
                'notes' => [
                    ['type' => 'top',   'note' => 'ورق بنفسج'],
                    ['type' => 'top',   'note' => 'ألديهيدات'],
                    ['type' => 'heart', 'note' => 'زبدة أوريس'],
                    ['type' => 'heart', 'note' => 'إيريس باليدا'],
                    ['type' => 'base',  'note' => 'أرز'],
                    ['type' => 'base',  'note' => 'مسك'],
                ],
                'tags' => ['إيريس', 'مسحوقي', 'راقٍ'],
            ],
            [
                'slug'          => 'fulful-wa-batula',
                'brand_id'      => 'musk-al-lail',
                'category_id'   => 'men',
                'name'          => 'فلفل وبتولا',
                'description'   => 'مشحون وكهربائي. يبدأ فلفل وبتولا كشرارة، ثم يستقر في دفء راتنجي عميق وفاتن.',
                'type'          => 'EDP',
                'rating'        => 4.7,
                'reviews_count' => 73,
                'is_new'        => true,
                'is_bestseller' => false,
                'is_offer'      => false,
                'placeholder_bg'  => '#E0DDD8',
                'placeholder_dot' => '#807060',
                'variants' => [
                    ['size' => '50ml',  'price' => 240.00, 'original_price' => null, 'stock' => 'low_stock'],
                    ['size' => '100ml', 'price' => 240.00, 'original_price' => null, 'stock' => 'low_stock'],
                ],
                'notes' => [
                    ['type' => 'top',   'note' => 'فلفل أسود'],
                    ['type' => 'top',   'note' => 'ليمون'],
                    ['type' => 'heart', 'note' => 'بتولا'],
                    ['type' => 'heart', 'note' => 'عرعر'],
                    ['type' => 'base',  'note' => 'عنبر غامق'],
                    ['type' => 'base',  'note' => 'لبدانم'],
                ],
                'tags' => ['بهاري', 'خشبي', 'جريء'],
            ],
            [
                'slug'          => 'zahrat-al-bustan',
                'brand_id'      => 'bint-al-sahraa',
                'category_id'   => 'women',
                'name'          => 'زهرة البستان',
                'description'   => 'ضوء الصباح يتسرب عبر البتلات البيضاء. زهرة البستان جميلة بهدوء — عطر يجعل الناس يقتربون أكثر.',
                'type'          => 'EDT',
                'rating'        => 4.6,
                'reviews_count' => 91,
                'is_new'        => false,
                'is_bestseller' => false,
                'is_offer'      => false,
                'placeholder_bg'  => '#EAF0E8',
                'placeholder_dot' => '#90A880',
                'variants' => [
                    ['size' => '30ml',  'price' => 210.00, 'original_price' => null, 'stock' => 'in_stock'],
                    ['size' => '50ml',  'price' => 210.00, 'original_price' => null, 'stock' => 'in_stock'],
                    ['size' => '100ml', 'price' => 210.00, 'original_price' => null, 'stock' => 'in_stock'],
                ],
                'notes' => [
                    ['type' => 'top',   'note' => 'شاي أخضر'],
                    ['type' => 'top',   'note' => 'ليتشي'],
                    ['type' => 'heart', 'note' => 'غاردينيا'],
                    ['type' => 'heart', 'note' => 'مغنوليا'],
                    ['type' => 'base',  'note' => 'مسك ناعم'],
                ],
                'tags' => ['زهري', 'طازج', 'رقيق'],
            ],
            [
                'slug'          => 'lubaan-sihri',
                'brand_id'      => 'najmat-tarablus',
                'category_id'   => 'unisex',
                'name'          => 'لبان سحري',
                'description'   => 'لبان سحري عمل من الإخلاص. راتنجات محصودة من أرجاء العالم القديم، متراكبة في شيء يسمو فوق الزمن.',
                'type'          => 'Parfum',
                'rating'        => 4.9,
                'reviews_count' => 17,
                'is_new'        => false,
                'is_bestseller' => false,
                'is_offer'      => false,
                'placeholder_bg'  => '#EAE0D0',
                'placeholder_dot' => '#A07850',
                'variants' => [
                    ['size' => '30ml', 'price' => 520.00, 'original_price' => null, 'stock' => 'out_of_stock'],
                ],
                'notes' => [
                    ['type' => 'top',   'note' => 'لبان'],
                    ['type' => 'top',   'note' => 'إيليمي'],
                    ['type' => 'heart', 'note' => 'مر'],
                    ['type' => 'heart', 'note' => 'لبدانم'],
                    ['type' => 'heart', 'note' => 'سيستوس'],
                    ['type' => 'base',  'note' => 'عود'],
                    ['type' => 'base',  'note' => 'عنبر رمادي'],
                    ['type' => 'base',  'note' => 'بنزوين'],
                ],
                'tags' => ['راتنجي', 'مقدس', 'نادر'],
            ],
            [
                'slug'          => 'hamidiyyat-naasea',
                'brand_id'      => 'al-ain-al-zarqaa',
                'category_id'   => 'unisex',
                'name'          => 'حمضيات ناصعة',
                'description'   => 'إشراق بلا تكلف. حمضيات ناصعة عطر صباح رائق — حيوي ومتفائل وصالح لكل المناسبات.',
                'type'          => 'EDT',
                'rating'        => 4.4,
                'reviews_count' => 210,
                'is_new'        => false,
                'is_bestseller' => true,
                'is_offer'      => true,
                'placeholder_bg'  => '#F0EDE0',
                'placeholder_dot' => '#C0B070',
                'variants' => [
                    ['size' => '50ml',  'price' => 155.00, 'original_price' => 185.00, 'stock' => 'in_stock'],
                    ['size' => '100ml', 'price' => 155.00, 'original_price' => 185.00, 'stock' => 'in_stock'],
                ],
                'notes' => [
                    ['type' => 'top',   'note' => 'ليمون صقلي'],
                    ['type' => 'top',   'note' => 'نيرولي'],
                    ['type' => 'top',   'note' => 'بيتيغران'],
                    ['type' => 'heart', 'note' => 'شاي أبيض'],
                    ['type' => 'base',  'note' => 'مسك'],
                    ['type' => 'base',  'note' => 'أرز'],
                ],
                'tags' => ['حمضي', 'طازج', 'يومي'],
            ],
        ];

        foreach ($products as $product) {
            $variants = $product['variants'];
            $notes    = $product['notes'];
            $tags     = $product['tags'];
            unset($product['variants'], $product['notes'], $product['tags']);

            $productId = DB::table('products')->insertGetId($product);

            foreach ($variants as $variant) {
                $variant['product_id'] = $productId;
                DB::table('product_variants')->insert($variant);
            }

            foreach ($notes as $note) {
                $note['product_id'] = $productId;
                DB::table('product_notes')->insert($note);
            }

            foreach ($tags as $tag) {
                DB::table('product_tags')->insert(['product_id' => $productId, 'tag' => $tag]);
            }
        }
    }
}
```

- [ ] **Step 4: Commit the seeders**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-api
git add database/seeders/CategorySeeder.php database/seeders/BrandSeeder.php database/seeders/ProductSeeder.php
git commit -m "feat: Arabic seed data — Libyan-inspired brands, Arabic categories and products"
```

---

### Task 11: Re-seed the Database

**Files:**
- No file changes — running Laravel artisan commands

- [ ] **Step 1: Fresh migrate and seed**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-api
php artisan migrate:fresh --seed
```

Expected output:
```
Dropped all tables successfully.
Migration table created successfully.
...running migrations...
Seeding: Database\Seeders\CategorySeeder
Seeded:  Database\Seeders\CategorySeeder (x.xxms)
Seeding: Database\Seeders\BrandSeeder
Seeded:  Database\Seeders\BrandSeeder (x.xxms)
Seeding: Database\Seeders\ProductSeeder
Seeded:  Database\Seeders\ProductSeeder (x.xxms)
Database seeding completed successfully.
```

- [ ] **Step 2: Verify the data in the database**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-api
php artisan tinker --execute="echo DB::table('categories')->count() . ' categories, ' . DB::table('brands')->count() . ' brands, ' . DB::table('products')->count() . ' products';"
```

Expected: `6 categories, 8 brands, 12 products`

- [ ] **Step 3: Start both servers and do a quick smoke test**

```bash
# In one terminal:
cd /Users/suhaib/web_projects/aroma-full-project/aroma-api
php artisan serve

# In another terminal:
cd /Users/suhaib/web_projects/aroma-full-project/aroma
npm run dev
```

Open `http://localhost:3000` and verify:
- Page is RTL
- Arabic font renders correctly
- Hero text is Arabic
- Nav shows Arabic labels
- Home page sections load with Arabic brand/product names

- [ ] **Step 4: Final commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-api
git add -A
git commit -m "feat: complete Arabic localization and Libyan-inspired seed data"
```

---

## Self-Review

**Spec coverage check:**
- ✅ RTL layout: Task 1
- ✅ Arabic font: Task 1
- ✅ Arabic UI constants (stock, order status, sort): Task 2
- ✅ Arabic price formatting: Task 2
- ✅ Arabic navigation (header, footer, mobile nav): Task 3
- ✅ Arabic home page (hero, trust, sections): Task 4
- ✅ Arabic auth (login, register): Task 5
- ✅ Arabic catalog (filter, search, brands): Task 6
- ✅ Arabic product page and card badges: Task 7
- ✅ Arabic cart and checkout: Task 8
- ✅ Arabic orders, profile, addresses, wishlist: Task 9
- ✅ Arabic seed data (categories, brands, products): Task 10
- ✅ Database re-seed: Task 11

**No placeholders found** — all tasks contain the actual Arabic strings or explicit find/replace instructions.

**Type consistency** — no new types introduced; all changes are string replacements and array updates within existing type contracts.
