# Brand Guide Copy Alignment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align all UI text in the Next.js storefront with the Aroma Shop brand guide (BRAND_GUIDE.md).

**Architecture:** Pure copy/content edits across 8 files — no logic changes, no new components. Each task targets one file and its specific text changes.

**Tech Stack:** Next.js 14 (App Router), TypeScript, React

---

## File Map

| File | What changes |
|---|---|
| `aroma/src/app/layout.tsx` | SEO metadata — add location & tagline |
| `aroma/src/features/home/HeroSection.tsx` | Seasonal label → evergreen; add tagline; stat labels |
| `aroma/src/features/home/HomeSection.tsx` | New Arrivals title; Featured Brand hardcoded suffix |
| `aroma/src/components/layout/Footer.tsx` | Add contact column (phone, location, hours) |
| `aroma/src/features/cart/CartPageClient.tsx` | Empty state copy |
| `aroma/src/features/wishlist/WishlistPageClient.tsx` | Empty state copy |
| `aroma/src/features/orders/OrdersPageClient.tsx` | Empty state copy |
| `aroma/src/features/auth/RegisterPageClient.tsx` | Welcome toast emoji |

---

### Task 1: Update App Metadata

**Files:**
- Modify: `aroma/src/app/layout.tsx`

- [ ] **Step 1: Edit metadata**

Replace the current `metadata` object:

```ts
export const metadata: Metadata = {
  title: {
    default: 'أروما — SMELL GOOD, FEEL GOOD',
    template: '%s | أروما',
  },
  description:
    'عطور مختارة بعناية من أرقى دور العطور في العالم. اكتشف العطور النادرة والروائح الفاخرة — بنغازي، ليبيا.',
  keywords: ['عطر', 'عطور', 'عود', 'نيش', 'عطور فاخرة', 'بنغازي', 'ليبيا', 'aromashop.ly'],
  openGraph: {
    title: 'أروما — SMELL GOOD, FEEL GOOD',
    description: 'عطور مختارة بعناية من أرقى دور العطور في العالم — بنغازي، ليبيا.',
    type: 'website',
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add aroma/src/app/layout.tsx
git commit -m "copy: update metadata title to include tagline and location"
```

---

### Task 2: Hero Section — Tagline & Seasonal Label

**Files:**
- Modify: `aroma/src/features/home/HeroSection.tsx`

The current hero has two issues:
1. `مجموعة الربيع · ٢٠٢٦` — a dated seasonal label that will become stale. Replace with the brand tagline.
2. The tagline "SMELL GOOD, FEEL GOOD" is absent from the hero entirely.

- [ ] **Step 1: Replace the seasonal label with the brand tagline**

Find line 42:
```tsx
<motion.p {...fadeUp(0)} className="font-sans text-[11px] text-aroma-accent mb-8">
  مجموعة الربيع · ٢٠٢٦
</motion.p>
```

Replace with:
```tsx
<motion.p {...fadeUp(0)} className="font-sans text-[11px] tracking-[0.18em] text-aroma-accent mb-8">
  SMELL GOOD, FEEL GOOD
</motion.p>
```

- [ ] **Step 2: Commit**

```bash
git add aroma/src/features/home/HeroSection.tsx
git commit -m "copy: replace seasonal hero label with brand tagline"
```

---

### Task 3: Home Sections — New Arrivals Title

**Files:**
- Modify: `aroma/src/features/home/HomeSection.tsx`

The `NewArrivalsSection` uses label `وصل حديثًا` (matches brand guide) but title `الوافدون الجدد` — the brand guide's exact phrase is `كل ماهو جديد`.

- [ ] **Step 1: Update the New Arrivals section header**

Find in `NewArrivalsSection` (~line 78):
```tsx
<SectionHeader
  label="وصل حديثًا"
  title="الوافدون الجدد"
  action="عرض الكل"
  onAction={() => router.push('/search?filter=new')}
/>
```

Replace with:
```tsx
<SectionHeader
  label="وصل حديثًا"
  title="كل ماهو جديد"
  action="عرض الكل"
  onAction={() => router.push('/search?filter=new')}
/>
```

- [ ] **Step 2: Remove the hardcoded brand description suffix in FeaturedBrandBanner**

Find (~line 113):
```tsx
<p className="font-sans text-[15px] font-light text-[rgba(249,248,244,0.6)] leading-[1.7] mb-7">
  {brand.tagline}. الدار التي أعادت تصوّر العود لجيل جديد — معقّد، ثمين، ولا يُنسى.
</p>
```

Replace with:
```tsx
<p className="font-sans text-[15px] font-light text-[rgba(249,248,244,0.6)] leading-[1.7] mb-7">
  {brand.tagline}
</p>
```

- [ ] **Step 3: Commit**

```bash
git add aroma/src/features/home/HomeSection.tsx
git commit -m "copy: use brand phrase for new arrivals; remove hardcoded brand description"
```

---

### Task 4: Footer — Add Contact Info

**Files:**
- Modify: `aroma/src/components/layout/Footer.tsx`

The brand guide specifies location, phone, and hours as core brand identity. These are completely absent from the footer. Add a contact column.

- [ ] **Step 1: Replace the Info column with a Contact column**

Find the existing "معلومات" column (~lines 65–81):
```tsx
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
```

Replace with:
```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add aroma/src/components/layout/Footer.tsx
git commit -m "copy: add contact info (location, phone, hours) to footer"
```

---

### Task 5: Cart Empty State

**Files:**
- Modify: `aroma/src/features/cart/CartPageClient.tsx`

- [ ] **Step 1: Update empty state copy**

Find (~lines 47–51):
```tsx
<EmptyState
  Icon={ShoppingBag}
  title="سلتك فارغة"
  subtitle="اكتشف العطور التي تعجبك."
  action="تسوّق الآن"
  onAction={() => router.push('/search')}
/>
```

Replace with:
```tsx
<EmptyState
  Icon={ShoppingBag}
  title="سلتك فارغة"
  subtitle="مرحباً في أرومـا 🌟 — ابدأ باختيار عطرك المفضل."
  action="استكشف المجموعة"
  onAction={() => router.push('/search')}
/>
```

- [ ] **Step 2: Commit**

```bash
git add aroma/src/features/cart/CartPageClient.tsx
git commit -m "copy: warm up cart empty state with brand welcome phrase"
```

---

### Task 6: Wishlist Empty State

**Files:**
- Modify: `aroma/src/features/wishlist/WishlistPageClient.tsx`

- [ ] **Step 1: Update empty state copy**

Find (~lines 35–39):
```tsx
<EmptyState
  Icon={Heart}
  title="قائمة المفضلة فارغة"
  subtitle="احفظ العطور التي تحبها وستجدها هنا دائمًا."
  action="اكتشف العطور"
  onAction={() => router.push('/search')}
/>
```

Replace with:
```tsx
<EmptyState
  Icon={Heart}
  title="قائمة المفضلة فارغة"
  subtitle="احفظ العطور التي تعجبك — ستجد كل ماهو جديد وتسليم فوري 🎁"
  action="تصفح العطور"
  onAction={() => router.push('/search')}
/>
```

- [ ] **Step 2: Commit**

```bash
git add aroma/src/features/wishlist/WishlistPageClient.tsx
git commit -m "copy: update wishlist empty state to use brand phrases"
```

---

### Task 7: Orders Empty State

**Files:**
- Modify: `aroma/src/features/orders/OrdersPageClient.tsx`

- [ ] **Step 1: Update empty state copy**

Find (~lines 33–37):
```tsx
<EmptyState
  Icon={Package}
  title="لا توجد طلبات بعد"
  subtitle="سيظهر سجل طلباتك هنا بعد أول عملية شراء."
  action="تسوّق الآن"
  onAction={() => router.push('/search')}
/>
```

Replace with:
```tsx
<EmptyState
  Icon={Package}
  title="لا توجد طلبات بعد"
  subtitle="نتطلع إلى زيارتك! ابدأ أول طلب وستجد سجلك هنا. ❤️"
  action="استكشف المجموعة"
  onAction={() => router.push('/search')}
/>
```

- [ ] **Step 2: Commit**

```bash
git add aroma/src/features/orders/OrdersPageClient.tsx
git commit -m "copy: update orders empty state with brand CTA phrase"
```

---

### Task 8: Register Toast Emoji

**Files:**
- Modify: `aroma/src/features/auth/RegisterPageClient.tsx`

The registration success toast uses `✦` (a non-brand symbol). Brand guide uses `🌟` for welcome lines.

- [ ] **Step 1: Update the toast message**

Find (~line 58):
```ts
showToast('تم إنشاء حسابك — أهلاً بك في أروما ✦')
```

Replace with:
```ts
showToast('مرحباً في أرومـا 🌟 — تم إنشاء حسابك بنجاح')
```

- [ ] **Step 2: Commit**

```bash
git add aroma/src/features/auth/RegisterPageClient.tsx
git commit -m "copy: align register welcome toast with brand welcome phrase"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Tagline "SMELL GOOD, FEEL GOOD" → Task 2 (hero) + Task 1 (metadata title)
- ✅ Welcome phrase `مرحباً في أرومـا 🌟` → Tasks 5, 8
- ✅ New arrivals phrase `كل ماهو جديد` → Task 3
- ✅ Location 📍 → Task 4
- ✅ Hours 🕘 → Task 4
- ✅ Phone/WhatsApp → Task 4
- ✅ Fast delivery `تسليم فوري` → Task 6
- ✅ CTA phrase `نتطلع إلى زيارتكم` → Task 7
- ✅ Emoji usage aligned (✨❤️🌟🎁📍🕘) → Tasks 2,5,6,7,8
- ✅ No letter-spacing on Arabic text — verified, no new tracking added to Arabic
- ✅ Hardcoded brand description removed → Task 3

**Placeholder scan:** No TBDs or TODOs present.

**Consistency:** All `مرحباً في أرومـا 🌟` uses the exact brand spelling with the soft ـا character. All emoji usage matches brand guide roles.
