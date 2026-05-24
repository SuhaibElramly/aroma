# Logo Management — Design Spec

**Date:** 2026-05-24
**Status:** Implemented

## Overview

Allow the admin to upload and remove the store logo displayed in the storefront navbar and footer. The logo is stored as a `Setting` record and delivered via the existing `GET /api/home` response. No database migration is required.

When no logo has been uploaded the storefront falls back to the text wordmark `AROMA`, so the store works out of the box.

---

## Data Model

No migration needed. The logo path is stored using the existing key-value `Setting` model:

```
key:   "site_logo_path"
value: "logos/abc123.png"   // relative path in public storage
       null                 // when no logo is set
```

The file is stored in `storage/app/public/logos/` and served via `asset('storage/logos/...')`.

---

## API Changes

### `GET /api/home`

Response gains a top-level field:

```json
{
  "hero":     { ... },
  "blocks":   [ ... ],
  "logo_url": "https://example.com/storage/logos/abc123.png"
}
```

`logo_url` is `null` when no logo has been uploaded.

### `GET /api/admin/homepage`

Response also gains `logo_url` (same value) so the admin UI can pre-populate the preview on load.

### `POST /api/admin/homepage/logo`

Accepts a multipart form upload:

```
logo: <image file>   // jpeg / png / webp / gif, max 2 MB
```

- Deletes the previous file (if any) before storing the new one.
- Stores to `logos/` in the public disk.
- Returns `{ "logo_url": "..." }`.

### `DELETE /api/admin/homepage/logo`

- Deletes the stored file from disk.
- Clears `site_logo_path` from settings (sets to `null`).
- Returns `{ "message": "Logo removed" }`.

---

## Backend

### `HomeService`

New private method:

```php
private function getLogoUrl(): ?string
{
    $path = Setting::get('site_logo_path');
    return $path ? asset('storage/' . $path) : null;
}
```

The public `getHome()` method (or wherever the `GET /api/home` response is assembled) calls this and includes `logo_url` in the returned array.

### `HomepageAdminService`

Two new methods:

```php
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

`getConfig()` gains `'logo_url' => $this->getLogoUrl()` (extracted as a shared helper or inlined).

### `AdminHomepageController`

Two new action methods:

```php
public function uploadLogo(Request $request): JsonResponse
{
    $request->validate(['logo' => 'required|image|max:2048']);
    $url = $this->service->updateLogo($request->file('logo'));
    return response()->json(['logo_url' => $url]);
}

public function destroyLogo(): JsonResponse
{
    $this->service->deleteLogo();
    return response()->json(['message' => 'Logo removed']);
}
```

### Routes (`api.php`)

```php
Route::post('/homepage/logo',   [AdminHomepageController::class, 'uploadLogo']);
Route::delete('/homepage/logo', [AdminHomepageController::class, 'destroyLogo']);
```

---

## Admin UI

### `HomepageView.vue`

A **Logo** card is inserted above the existing Hero section. It is implemented inline in `HomepageView.vue` — no separate component.

**State added:**
```ts
const logoUrl      = ref<string | null>(null)   // current URL from API
const logoFile     = ref<File | null>(null)      // pending upload
const logoUploading = ref(false)
const logoError    = ref('')
```

`logoUrl` is populated from `config.logo_url` when `loadConfig()` resolves.

**Template structure:**

```
┌─────────────────────────────────────┐
│  Logo                               │
│                                     │
│  [image preview or dashed box]      │
│                                     │
│  [Upload logo ▲]   [Remove ✕]       │
│  (Remove only shown when logo set)  │
└─────────────────────────────────────┘
```

- Preview box: 160 × 64 px, dashed border when empty, shows the image when set.
- **Upload**: hidden `<input type="file" accept="image/*">` triggered by button click. On file selected → call `apiUploadLogo(file)` immediately (no separate Save step needed for a single image).
- **Remove**: calls `apiDeleteLogo()`, clears `logoUrl`.
- Errors shown inline below the buttons.

### `admin.ts` — two new API functions

```ts
export const apiUploadLogo = (file: File) => {
  const fd = new FormData()
  fd.append('logo', file)
  return client.post<{ logo_url: string }>('/admin/homepage/logo', fd)
}

export const apiDeleteLogo = () =>
  client.delete('/admin/homepage/logo')
```

### `types/index.ts`

`HomepageConfig` gains `logo_url?: string | null`.

---

## Storefront

### `layout.tsx`

Becomes `async`. Fetches `GET /api/home` server-side and extracts `logoUrl`:

```tsx
export default async function StorefrontLayout({ children }) {
  const logoUrl = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/home`)
    .then(r => r.json())
    .then(d => d.logo_url as string | null)
    .catch(() => null)

  return (
    <>
      <Header logoUrl={logoUrl} />
      <main className="pb-20 md:pb-0">{children}</main>
      <Footer logoUrl={logoUrl} />
      <MobileNav />
      <Toast />
    </>
  )
}
```

### `Header.tsx`

Accepts `logoUrl?: string | null`. The logo slot:

```tsx
{logoUrl ? (
  <Image src={logoUrl} alt="Aroma" height={32} width={120}
         className="object-contain object-left" style={{ height: 32, width: 'auto' }} />
) : (
  <span className="font-display text-[20px] font-semibold tracking-[0.18em] text-[#F4EFE8]">
    AROMA
  </span>
)}
```

`width={120}` is the `next/image` required prop; actual display width is driven by `width: auto` + fixed height.

### `Footer.tsx`

Same pattern, `height={28}` and dark-mode–friendly (logo image should have a transparent background — the footer is light, so a dark-on-transparent PNG works for both).

```tsx
{logoUrl ? (
  <Image src={logoUrl} alt="Aroma" height={28} width={100}
         className="object-contain object-left mb-3" style={{ height: 28, width: 'auto' }} />
) : (
  <p className="font-display text-2xl font-semibold tracking-[0.18em] text-aroma-text mb-3">
    AROMA
  </p>
)}
```

---

## Out of Scope

- Separate logos for header vs footer
- Dark / light logo variants
- Controlling the text wordmark or store name via admin
