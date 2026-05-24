# Logo Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin upload/remove a store logo that appears in the storefront navbar and footer, replacing the hardcoded "AROMA" text.

**Architecture:** The logo path is stored as a `Setting` key (`site_logo_path`) — the same key-value store already used for the hero config. `HomeService` exposes `logo_url` in the `GET /api/home` response. The storefront `layout.tsx` fetches that endpoint server-side and passes `logoUrl` as a prop to `<Header>` and `<Footer>`. The admin UI adds an inline logo card above the hero section in `HomepageView.vue`.

**Tech Stack:** Laravel 11 (PHP), Vue 3 + TypeScript (admin), Next.js 14 React app router (storefront).

---

## File Map

**Modified (backend):**
- `aroma-api/app/Http/Controllers/Api/HomeController.php` — add `logo_url` to response
- `aroma-api/app/Services/HomeService.php` — add `getLogoUrl()` method
- `aroma-api/app/Services/HomepageAdminService.php` — add `updateLogo()`, `deleteLogo()`, include `logo_url` in `getConfig()`
- `aroma-api/app/Http/Controllers/Api/Admin/AdminHomepageController.php` — add `uploadLogo()` and `destroyLogo()` actions
- `aroma-api/routes/api.php` — register `POST /homepage/logo` and `DELETE /homepage/logo`
- `aroma-api/tests/Feature/HomeTest.php` — add logo_url test

**Modified (admin):**
- `aroma-admin/src/types/index.ts` — add `logo_url?: string | null` to `HomepageConfig`
- `aroma-admin/src/api/admin.ts` — add `apiUploadLogo` and `apiDeleteLogo`
- `aroma-admin/src/views/HomepageView.vue` — add logo state + logo card UI

**Modified (storefront):**
- `aroma/src/types/index.ts` — add `logo_url?: string | null` to `HomePageData`
- `aroma/src/app/(storefront)/layout.tsx` — fetch `GET /api/home` server-side, pass `logoUrl` to Header and Footer
- `aroma/src/components/layout/Header.tsx` — accept `logoUrl` prop, render image or text fallback
- `aroma/src/components/layout/Footer.tsx` — accept `logoUrl` prop, render image or text fallback

---

## Task 1: Backend — `getLogoUrl`, `GET /api/home`, admin endpoints, routes, test

**Files:**
- Modify: `aroma-api/app/Services/HomeService.php`
- Modify: `aroma-api/app/Http/Controllers/Api/HomeController.php`
- Modify: `aroma-api/app/Services/HomepageAdminService.php`
- Modify: `aroma-api/app/Http/Controllers/Api/Admin/AdminHomepageController.php`
- Modify: `aroma-api/routes/api.php`
- Test: `aroma-api/tests/Feature/HomeTest.php`

- [ ] **Step 1: Write the failing test**

Add this test to `aroma-api/tests/Feature/HomeTest.php` inside the class, after the existing tests:

```php
public function test_home_includes_logo_url_null_when_not_set(): void
{
    Setting::set('homepage_hero', $this->heroDefaults());

    $response = $this->getJson('/api/home');

    $response->assertOk()
        ->assertJsonPath('logo_url', null);
}
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-api && php artisan test tests/Feature/HomeTest.php --filter=test_home_includes_logo_url_null_when_not_set
```

Expected: FAIL — `logo_url` key is missing from response.

- [ ] **Step 3: Add `getLogoUrl()` to HomeService**

In `aroma-api/app/Services/HomeService.php`, add this private method after `getHero()`:

```php
public function getLogoUrl(): ?string
{
    $path = Setting::get('site_logo_path');
    return $path ? asset('storage/' . $path) : null;
}
```

- [ ] **Step 4: Add `logo_url` to HomeController response**

Replace the `index()` method in `aroma-api/app/Http/Controllers/Api/HomeController.php`:

```php
public function index(HomeService $homeService)
{
    return response()->json([
        'hero'     => $homeService->getHero(),
        'blocks'   => $homeService->getBlocks(),
        'logo_url' => $homeService->getLogoUrl(),
    ]);
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-api && php artisan test tests/Feature/HomeTest.php --filter=test_home_includes_logo_url_null_when_not_set
```

Expected: PASS.

- [ ] **Step 6: Add `updateLogo()` and `deleteLogo()` to HomepageAdminService**

In `aroma-api/app/Services/HomepageAdminService.php`, add these two methods after `updateHero()`, and update `getConfig()`:

```php
public function getConfig(): array
{
    $logoPath = Setting::get('site_logo_path');
    return [
        'hero'     => Setting::get('homepage_hero', []),
        'blocks'   => HomepageBlock::orderBy('position')->get()->toArray(),
        'logo_url' => $logoPath ? asset('storage/' . $logoPath) : null,
    ];
}

public function updateLogo(UploadedFile $image): string
{
    $existing = Setting::get('site_logo_path');
    if ($existing) Storage::disk('public')->delete($existing);
    $path = $image->store('logos', 'public');
    Setting::set('site_logo_path', $path);
    return asset('storage/' . $path);
}

public function deleteLogo(): void
{
    $path = Setting::get('site_logo_path');
    if ($path) Storage::disk('public')->delete($path);
    Setting::set('site_logo_path', null);
}
```

- [ ] **Step 7: Add `uploadLogo()` and `destroyLogo()` to AdminHomepageController**

In `aroma-api/app/Http/Controllers/Api/Admin/AdminHomepageController.php`, add these two methods after `updateHero()`:

```php
public function uploadLogo(Request $request): \Illuminate\Http\JsonResponse
{
    $request->validate(['logo' => 'required|image|max:2048']);
    $url = $this->service->updateLogo($request->file('logo'));
    return response()->json(['logo_url' => $url]);
}

public function destroyLogo(): \Illuminate\Http\JsonResponse
{
    $this->service->deleteLogo();
    return response()->json(['message' => 'Logo removed']);
}
```

- [ ] **Step 8: Register routes**

In `aroma-api/routes/api.php`, add these two lines alongside the other `/homepage` routes (in the admin auth middleware group):

```php
Route::post('/homepage/logo',   [AdminHomepageController::class, 'uploadLogo']);
Route::delete('/homepage/logo', [AdminHomepageController::class, 'destroyLogo']);
```

- [ ] **Step 9: Run all homepage tests**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-api && php artisan test tests/Feature/HomeTest.php tests/Feature/AdminHomepageTest.php
```

Expected: All 14 tests pass (13 existing + 1 new).

- [ ] **Step 10: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project && git add \
  aroma-api/app/Services/HomeService.php \
  aroma-api/app/Http/Controllers/Api/HomeController.php \
  aroma-api/app/Services/HomepageAdminService.php \
  aroma-api/app/Http/Controllers/Api/Admin/AdminHomepageController.php \
  aroma-api/routes/api.php \
  aroma-api/tests/Feature/HomeTest.php
git commit -m "feat: add logo_url to GET /api/home and logo upload/delete admin endpoints"
```

---

## Task 2: Admin — Types + API functions

**Files:**
- Modify: `aroma-admin/src/types/index.ts`
- Modify: `aroma-admin/src/api/admin.ts`

- [ ] **Step 1: Add `logo_url` to `HomepageConfig`**

In `aroma-admin/src/types/index.ts`, find:

```ts
export interface HomepageConfig {
  hero: HeroConfig
  blocks: HomepageBlock[]
}
```

Replace with:

```ts
export interface HomepageConfig {
  hero: HeroConfig
  blocks: HomepageBlock[]
  logo_url?: string | null
}
```

- [ ] **Step 2: Add `apiUploadLogo` and `apiDeleteLogo`**

In `aroma-admin/src/api/admin.ts`, add these two functions after `apiReorderBlocks`:

```ts
export const apiUploadLogo = (file: File) => {
  const fd = new FormData()
  fd.append('logo', file)
  return client.post<{ logo_url: string }>('/admin/homepage/logo', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const apiDeleteLogo = () =>
  client.delete<{ message: string }>('/admin/homepage/logo')
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-admin && npx vue-tsc --noEmit 2>&1 | grep -E "types/index|api/admin" | head -10
```

Expected: No errors on those files.

- [ ] **Step 4: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project && git add aroma-admin/src/types/index.ts aroma-admin/src/api/admin.ts
git commit -m "feat: add HomepageConfig logo_url and logo API functions to admin"
```

---

## Task 3: Admin — Logo card in HomepageView

**Files:**
- Modify: `aroma-admin/src/views/HomepageView.vue`

- [ ] **Step 1: Add logo state and handlers to script**

In `aroma-admin/src/views/HomepageView.vue`, add the new imports and state.

**Update the import line** to include `apiUploadLogo` and `apiDeleteLogo`:

```ts
import {
  apiGetHomepage, apiUpdateHero, apiAddBlock,
  apiUpdateBlock, apiDeleteBlock, apiReorderBlocks,
  apiGetBrands, apiUploadLogo, apiDeleteLogo,
} from '../api/admin'
```

**Add three new refs** after the `brands` ref:

```ts
const logoUrl      = ref<string | null>(null)
const logoUploading = ref(false)
const logoError    = ref('')
```

**Update `load()`** to populate `logoUrl` after `config.value = homepageRes.data`:

```ts
async function load() {
  loadError.value = ''
  try {
    const [homepageRes, brandsRes] = await Promise.all([
      apiGetHomepage(),
      apiGetBrands(),
    ])
    config.value = homepageRes.data
    logoUrl.value = homepageRes.data.logo_url ?? null
    brands.value = brandsRes.data.map((b) => ({ id: b.id, name: b.name }))
  } catch {
    loadError.value = 'Failed to load homepage config.'
  } finally {
    loading.value = false
  }
}
```

**Add two handler functions** after `onRemoveHeroImage()`:

```ts
async function onUploadLogo(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  logoUploading.value = true
  logoError.value = ''
  try {
    const res = await apiUploadLogo(file)
    logoUrl.value = res.data.logo_url
  } catch {
    logoError.value = 'Failed to upload logo. Please try again.'
  } finally {
    logoUploading.value = false
  }
}

async function onDeleteLogo() {
  if (!confirm('Remove the logo?')) return
  logoError.value = ''
  try {
    await apiDeleteLogo()
    logoUrl.value = null
  } catch {
    logoError.value = 'Failed to remove logo.'
  }
}
```

- [ ] **Step 2: Add logo card to template**

In the template, insert the logo card **above the `<!-- Hero editor -->` div** (before `<div class="space-y-2">`):

```html
<!-- Logo -->
<div class="rounded-lg border border-dash-border bg-dash-paper p-4 space-y-3">
  <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-dash-faint">
    Store Logo
  </p>

  <!-- Preview -->
  <div
    class="w-40 h-16 rounded border-2 flex items-center justify-center overflow-hidden"
    :class="logoUrl ? 'border-dash-border' : 'border-dashed border-dash-border'"
  >
    <img
      v-if="logoUrl"
      :src="logoUrl"
      alt="Store logo"
      class="max-w-full max-h-full object-contain"
    />
    <span v-else class="text-[11px] text-dash-faint">No logo</span>
  </div>

  <!-- Actions -->
  <div class="flex items-center gap-2">
    <label
      class="cursor-pointer px-3 py-1.5 rounded text-[12px] font-medium bg-dash-primary
             text-white hover:opacity-90 transition-opacity"
      :class="{ 'opacity-60 pointer-events-none': logoUploading }"
    >
      {{ logoUploading ? 'Uploading…' : 'Upload logo' }}
      <input
        type="file"
        accept="image/*"
        class="hidden"
        @change="onUploadLogo"
        :disabled="logoUploading"
      />
    </label>
    <button
      v-if="logoUrl"
      type="button"
      @click="onDeleteLogo"
      class="px-3 py-1.5 rounded text-[12px] font-medium text-dash-danger border
             border-dash-danger hover:bg-dash-danger hover:text-white transition-colors"
    >
      Remove
    </button>
  </div>

  <p v-if="logoError" class="text-[11px] text-dash-danger">{{ logoError }}</p>
</div>
```

- [ ] **Step 3: Verify admin builds without errors on this file**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-admin && npm run build 2>&1 | grep "HomepageView" | head -10
```

Expected: No errors on `HomepageView`.

- [ ] **Step 4: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project && git add aroma-admin/src/views/HomepageView.vue
git commit -m "feat: add logo upload card to homepage admin"
```

---

## Task 4: Storefront — types, layout, Header, Footer

**Files:**
- Modify: `aroma/src/types/index.ts`
- Modify: `aroma/src/app/(storefront)/layout.tsx`
- Modify: `aroma/src/components/layout/Header.tsx`
- Modify: `aroma/src/components/layout/Footer.tsx`

- [ ] **Step 1: Add `logo_url` to `HomePageData`**

In `aroma/src/types/index.ts`, find:

```ts
export interface HomePageData {
  hero: HeroConfig
  blocks: HomeBlock[]
}
```

Replace with:

```ts
export interface HomePageData {
  hero: HeroConfig
  blocks: HomeBlock[]
  logo_url?: string | null
}
```

- [ ] **Step 2: Make layout async, fetch `logo_url`**

Replace the entire content of `aroma/src/app/(storefront)/layout.tsx`:

```tsx
import { Header }    from '@/components/layout/Header'
import { Footer }    from '@/components/layout/Footer'
import { MobileNav } from '@/components/layout/MobileNav'
import { Toast }     from '@/components/feedback/Toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const logoUrl = await fetch(`${API_URL}/api/home`, { next: { revalidate: 60 } })
    .then(r => r.json())
    .then((d: { logo_url?: string | null }) => d.logo_url ?? null)
    .catch(() => null)

  return (
    <>
      <Header logoUrl={logoUrl} />
      <main className="pb-20 md:pb-0">
        {children}
      </main>
      <Footer logoUrl={logoUrl} />
      <MobileNav />
      <Toast />
    </>
  )
}
```

`revalidate: 60` means Next.js will re-fetch the logo at most once per minute (ISR). Logo changes in admin appear in the storefront within 60 seconds without a deploy.

- [ ] **Step 3: Update Header to accept and render `logoUrl`**

Replace the entire content of `aroma/src/components/layout/Header.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Search, Heart, ShoppingBag, User } from 'lucide-react'
import { useCart } from '@/lib/api/queries'
import { useWishlistStore } from '@/store/wishlist'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'

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

export function Header({ logoUrl }: { logoUrl?: string | null }) {
  const [hydrated, setHydrated] = useState(false)
  const pathname    = usePathname()
  const isLoggedIn  = useAuthStore(s => s.isLoggedIn)
  const { data: cartItems = [] } = useCart()
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)
  const wishCount   = useWishlistStore(s => s.count())

  useEffect(() => {
    setHydrated(true)
  }, [])

  const badgeFor = (href: string) => {
    if (!hydrated || !isLoggedIn) return 0
    if (href === '/cart')     return cartCount
    if (href === '/wishlist') return wishCount
    return 0
  }

  return (
    <div className="fixed top-5 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
      <nav
        aria-label="التنقل الرئيسي"
        className="pointer-events-auto flex items-center justify-between h-[50px]
                   px-2.5 pl-6 gap-2 rounded-full min-w-0 w-full max-w-[960px]"
        style={{
          background:       'rgba(18,15,12,0.72)',
          backdropFilter:   'blur(28px) saturate(140%)',
          WebkitBackdropFilter: 'blur(28px) saturate(140%)',
          border:           '1px solid rgba(184,150,110,0.22)',
          boxShadow:        '0 8px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <Link href="/" className="shrink-0 pr-6">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Aroma"
              height={32}
              width={120}
              className="object-contain object-left"
              style={{ height: 32, width: 'auto' }}
            />
          ) : (
            <span className="font-display text-[20px] font-semibold tracking-[0.18em] text-[#F4EFE8]">
              AROMA
            </span>
          )}
        </Link>

        {/* Nav links — hidden on small screens */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(link => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'font-sans text-[12px] tracking-[0.05em] px-3.5 py-1.5 rounded-full transition-colors',
                  active
                    ? 'bg-[rgba(184,150,110,0.18)] text-[#F4EFE8] font-medium'
                    : 'text-[rgba(244,239,232,0.5)] hover:text-[rgba(244,239,232,0.8)]',
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Icon buttons */}
        <div className="flex items-center gap-1">
          {ICON_LINKS.map(({ icon: Icon, href, label }) => {
            const badge = badgeFor(href)
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className="relative p-2 text-[rgba(244,239,232,0.75)] hover:text-[#F4EFE8]
                           transition-colors rounded-full"
              >
                <Icon size={19} strokeWidth={1.5} />
                {badge > 0 && (
                  <span
                    suppressHydrationWarning
                    className="absolute top-1 right-1 bg-aroma-accent text-white
                               text-[9px] w-[15px] h-[15px] rounded-full flex items-center
                               justify-center font-bold leading-none">
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
```

- [ ] **Step 4: Update Footer to accept and render `logoUrl`**

Replace the entire content of `aroma/src/components/layout/Footer.tsx`:

```tsx
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
```

- [ ] **Step 5: Verify storefront TypeScript**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma && npx tsc --noEmit 2>&1 | head -10
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project && git add \
  aroma/src/types/index.ts \
  "aroma/src/app/(storefront)/layout.tsx" \
  aroma/src/components/layout/Header.tsx \
  aroma/src/components/layout/Footer.tsx
git commit -m "feat: render logo from API in storefront header and footer"
```

---

## Task 5: End-to-End Verification

- [ ] **Step 1: Run all homepage backend tests**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-api && php artisan test tests/Feature/HomeTest.php tests/Feature/AdminHomepageTest.php
```

Expected: All 14 tests pass.

- [ ] **Step 2: Verify admin builds clean**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma-admin && npm run build 2>&1 | grep -i "error" | grep -v "deprecated" | head -10
```

Expected: No new errors in homepage-related files.

- [ ] **Step 3: Verify storefront TypeScript**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma && npx tsc --noEmit 2>&1 | head -10
```

Expected: No errors.
