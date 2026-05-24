# Brand Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add an optional logo image to brands — admin can upload/remove it, it appears as a small badge in the bottom-right of every product card image area, and near the brand name on the product detail page.

**Architecture:** Store the logo as a file path in a new `brands.logo` column, served via Laravel's public storage disk (same pattern as product images). The path is resolved to a full URL in both `BrandResource` and `ProductResource`, so the storefront receives `brandLogoUrl` on every product. Admin manages the logo via two dedicated API endpoints (upload via POST multipart, delete via DELETE).

**Tech Stack:** Laravel 11 (PHP), Vue 3 + TypeScript (admin), Next.js 14 + React (storefront), Tailwind CSS, TanStack Query

---

## File Map

| File | Change |
|------|--------|
| `aroma-api/database/migrations/XXXX_add_logo_to_brands_table.php` | Create — adds nullable `logo` string column |
| `aroma-api/app/Models/Brand.php` | Modify — add `logo` to `$fillable` |
| `aroma-api/app/Http/Controllers/Api/Admin/AdminBrandController.php` | Modify — add `uploadLogo` and `destroyLogo` methods; expose `logoUrl` in `show`/`index` responses |
| `aroma-api/app/Http/Resources/BrandResource.php` | Modify — add `logoUrl` field |
| `aroma-api/app/Http/Resources/ProductResource.php` | Modify — add `brandLogoUrl` field |
| `aroma-api/routes/api.php` | Modify — register two new admin brand logo routes |
| `aroma-admin/src/types/index.ts` | Modify — add `logoUrl` to `AdminBrand` |
| `aroma-admin/src/api/admin.ts` | Modify — add `apiUploadBrandLogo` and `apiDeleteBrandLogo` |
| `aroma-admin/src/views/BrandsView.vue` | Modify — logo upload/remove widget in create/edit modal |
| `aroma-admin/src/views/BrandDetailView.vue` | Modify — show logo in brand header |
| `aroma/src/types/index.ts` | Modify — add `brandLogoUrl` to `Product`, add `logoUrl` to `Brand` |
| `aroma/src/components/shared/ProductCard.tsx` | Modify — render logo badge in bottom-right of image area |
| `aroma/src/features/product/ProductPageClient.tsx` | Modify — render logo next to brand name in purchase module |

---

### Task 1: Database migration — add `logo` to brands

**Files:**
- Create: `aroma-api/database/migrations/2026_05_01_000001_add_logo_to_brands_table.php`

- [x] **Step 1: Create the migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('brands', function (Blueprint $table) {
            $table->string('logo')->nullable()->after('bg');
        });
    }

    public function down(): void {
        Schema::table('brands', function (Blueprint $table) {
            $table->dropColumn('logo');
        });
    }
};
```

- [x] **Step 2: Run the migration**

```bash
cd aroma-api && php artisan migrate
```

Expected: `Migrating: 2026_05_01_000001_add_logo_to_brands_table` then `Migrated`.

- [x] **Step 3: Commit**

```bash
git add aroma-api/database/migrations/2026_05_01_000001_add_logo_to_brands_table.php
git commit -m "feat: add logo column to brands table"
```

---

### Task 2: Update Brand model and BrandResource

**Files:**
- Modify: `aroma-api/app/Models/Brand.php`
- Modify: `aroma-api/app/Http/Resources/BrandResource.php`

- [x] **Step 1: Add `logo` to Brand `$fillable`**

In `aroma-api/app/Models/Brand.php`, change the `$fillable` line:

```php
protected $fillable = ['id', 'name', 'name_en', 'origin', 'tagline', 'bg', 'logo'];
```

- [x] **Step 2: Add `logoUrl` to BrandResource**

Replace the full `toArray` body in `aroma-api/app/Http/Resources/BrandResource.php`:

```php
use Illuminate\Support\Facades\Storage;

public function toArray(Request $request): array
{
    return [
        'id'      => $this->id,
        'name'    => $this->name,
        'nameEn'  => $this->name_en,
        'origin'  => $this->origin,
        'tagline' => $this->tagline,
        'count'   => $this->products_count ?? $this->products()->count(),
        'bg'      => $this->bg,
        'logoUrl' => $this->logo ? Storage::disk('public')->url($this->logo) : null,
    ];
}
```

Note: add `use Illuminate\Support\Facades\Storage;` at the top of the file (after the namespace line) if not already present.

- [x] **Step 3: Commit**

```bash
git add aroma-api/app/Models/Brand.php aroma-api/app/Http/Resources/BrandResource.php
git commit -m "feat: expose brandLogoUrl in BrandResource"
```

---

### Task 3: Add `brandLogoUrl` to ProductResource

**Files:**
- Modify: `aroma-api/app/Http/Resources/ProductResource.php`

- [x] **Step 1: Add `brandLogoUrl` field**

Inside the `toArray` return array in `ProductResource.php`, add this line right after `'brandId' => $this->brand_id,`:

```php
'brandLogoUrl' => $this->brand?->logo
    ? \Illuminate\Support\Facades\Storage::disk('public')->url($this->brand->logo)
    : null,
```

The brand relation is already eager-loaded by both `ProductController::show` and `ProductService::search`, so no query changes needed.

- [x] **Step 2: Commit**

```bash
git add aroma-api/app/Http/Resources/ProductResource.php
git commit -m "feat: add brandLogoUrl to ProductResource"
```

---

### Task 4: Admin API — logo upload and delete endpoints

**Files:**
- Modify: `aroma-api/app/Http/Controllers/Api/Admin/AdminBrandController.php`
- Modify: `aroma-api/routes/api.php`

- [x] **Step 1: Add `use` imports at the top of `AdminBrandController`**

The file currently has no Storage/Str imports. Add them after the `use App\Models\Brand;` line:

```php
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
```

- [x] **Step 2: Add `logoUrl` to index and show responses**

In `AdminBrandController::index`, inside the `map` callback, add:

```php
'logoUrl'      => $b->logo ? Storage::disk('public')->url($b->logo) : null,
```

In `AdminBrandController::show`, add the same field to the response array:

```php
'logoUrl'      => $brand->logo ? Storage::disk('public')->url($brand->logo) : null,
```

- [x] **Step 3: Add `uploadLogo` method**

Add this method to `AdminBrandController`:

```php
public function uploadLogo(Request $request, string $id)
{
    $brand = Brand::findOrFail($id);

    $request->validate([
        'logo' => 'required|file|image|max:2048',
    ]);

    // Delete previous logo file if one exists
    if ($brand->logo) {
        Storage::disk('public')->delete($brand->logo);
    }

    $file     = $request->file('logo');
    $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
    $path     = $file->storeAs("brands/{$id}", $filename, 'public');

    $brand->update(['logo' => $path]);

    return response()->json([
        'logoUrl' => Storage::disk('public')->url($path),
    ]);
}
```

- [x] **Step 4: Add `destroyLogo` method**

```php
public function destroyLogo(string $id)
{
    $brand = Brand::findOrFail($id);

    if ($brand->logo) {
        Storage::disk('public')->delete($brand->logo);
        $brand->update(['logo' => null]);
    }

    return response()->json(null, 204);
}
```

- [x] **Step 5: Register routes in `aroma-api/routes/api.php`**

Find the admin brand routes block:
```php
Route::get('/brands', [AdminBrandController::class, 'index']);
Route::post('/brands', [AdminBrandController::class, 'store']);
Route::get('/brands/{id}', [AdminBrandController::class, 'show']);
Route::put('/brands/{id}', [AdminBrandController::class, 'update']);
Route::delete('/brands/{id}', [AdminBrandController::class, 'destroy']);
```

Add two lines after the `destroy` route:
```php
Route::post('/brands/{id}/logo', [AdminBrandController::class, 'uploadLogo']);
Route::delete('/brands/{id}/logo', [AdminBrandController::class, 'destroyLogo']);
```

- [x] **Step 6: Commit**

```bash
git add aroma-api/app/Http/Controllers/Api/Admin/AdminBrandController.php aroma-api/routes/api.php
git commit -m "feat: add brand logo upload/delete API endpoints"
```

---

### Task 5: Admin types and API client

**Files:**
- Modify: `aroma-admin/src/types/index.ts`
- Modify: `aroma-admin/src/api/admin.ts`

- [x] **Step 1: Add `logoUrl` to `AdminBrand`**

In `aroma-admin/src/types/index.ts`, find:

```typescript
export interface AdminBrand {
  id: string
  name: string
  nameEn: string | null
  origin: string | null
  tagline: string | null
  bg: string
  productCount: number
}
```

Change to:

```typescript
export interface AdminBrand {
  id: string
  name: string
  nameEn: string | null
  origin: string | null
  tagline: string | null
  bg: string
  logoUrl: string | null
  productCount: number
}
```

- [x] **Step 2: Add logo API functions**

In `aroma-admin/src/api/admin.ts`, add these two functions right after `apiDeleteBrand`:

```typescript
export const apiUploadBrandLogo = (id: string, file: File) => {
  const form = new FormData()
  form.append('logo', file)
  return client.post<{ logoUrl: string }>(`/admin/brands/${id}/logo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const apiDeleteBrandLogo = (id: string) =>
  client.delete(`/admin/brands/${id}/logo`)
```

- [x] **Step 3: Commit**

```bash
git add aroma-admin/src/types/index.ts aroma-admin/src/api/admin.ts
git commit -m "feat: add brand logo types and API client functions"
```

---

### Task 6: Admin UI — logo management in BrandsView modal

**Files:**
- Modify: `aroma-admin/src/views/BrandsView.vue`

The brand create/edit modal in `BrandsView.vue` currently handles text fields only. We add a logo upload widget at the bottom of the form. When editing an existing brand that already has a logo, show the current logo with a remove button. When creating or after removal, show a file-input upload area.

- [x] **Step 1: Update imports in `<script setup>`**

In the script section, add `Image` and `X` to the lucide imports and add the two new API functions:

```typescript
import { Plus, Tag, Link2, Image, X } from 'lucide-vue-next'
import { apiGetBrands, apiCreateBrand, apiUpdateBrand, apiDeleteBrand, apiUploadBrandLogo, apiDeleteBrandLogo } from '../api/admin'
```

- [x] **Step 2: Add logo reactive state**

After `const formErrors = ref<Record<string, string>>({})`, add:

```typescript
const logoPreview    = ref<string | null>(null)   // data-URL for newly picked file
const pendingLogoFile = ref<File | null>(null)     // file to upload after save
const logoRemoved    = ref(false)                  // flagged for deletion on save
```

- [x] **Step 3: Update `emptyForm` and `openCreate` / `openEdit`**

`emptyForm` stays as-is (no logo in form since it's managed separately).

In `openCreate`, after `form.value = emptyForm()`, add:
```typescript
logoPreview.value    = null
pendingLogoFile.value = null
logoRemoved.value    = false
```

Add an `openEdit` function (the view currently only has `openCreate`; `openEdit` already exists in the table via `@click.stop="openEdit(row as AdminBrand)"`). Find the existing `openEdit` function body and add the same three lines after `formErrors.value = {}`:
```typescript
logoPreview.value    = null
pendingLogoFile.value = null
logoRemoved.value    = false
```

Also set the editing brand's current logo as the preview when opening edit:
```typescript
logoPreview.value = (editing.value as AdminBrand).logoUrl ?? null
```

Locate the full `openEdit` function. It looks like:
```typescript
function openEdit(b: AdminBrand) {
  editing.value = b
  form.value = {
    name: b.name, name_en: b.nameEn ?? '', origin: b.origin ?? '',
    tagline: b.tagline ?? '', bg: b.bg,
  }
  formErrors.value = {}
  modalOpen.value  = true
}
```

Replace it with:
```typescript
function openEdit(b: AdminBrand) {
  editing.value = b
  form.value = {
    name: b.name, name_en: b.nameEn ?? '', origin: b.origin ?? '',
    tagline: b.tagline ?? '', bg: b.bg,
  }
  formErrors.value  = {}
  logoPreview.value  = b.logoUrl ?? null
  pendingLogoFile.value = null
  logoRemoved.value  = false
  modalOpen.value    = true
}
```

- [x] **Step 4: Add `pickLogoFile` helper**

```typescript
function pickLogoFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  pendingLogoFile.value = file
  logoRemoved.value     = false
  logoPreview.value     = URL.createObjectURL(file)
}

function removeLogo() {
  pendingLogoFile.value = null
  logoPreview.value     = null
  logoRemoved.value     = true
}
```

- [x] **Step 5: Update `handleSave` to handle logo after brand save**

The existing `handleSave` creates or updates the brand then closes the modal. Replace it with:

```typescript
async function handleSave() {
  formErrors.value = {}
  if (!form.value.name) { formErrors.value.name = 'Name is required'; return }
  if (!form.value.bg)   { formErrors.value.bg   = 'Colour is required'; return }

  saving.value = true
  try {
    let brandId: string
    if (editing.value) {
      await apiUpdateBrand(editing.value.id, {
        name:    form.value.name,
        name_en: form.value.name_en || undefined,
        origin:  form.value.origin  || undefined,
        tagline: form.value.tagline || undefined,
        bg:      form.value.bg,
      })
      brandId = editing.value.id
    } else {
      const res = await apiCreateBrand({
        id:      generatedSlug.value,
        name:    form.value.name,
        name_en: form.value.name_en || undefined,
        origin:  form.value.origin  || undefined,
        tagline: form.value.tagline || undefined,
        bg:      form.value.bg,
      })
      brandId = res.data.id
    }

    if (pendingLogoFile.value) {
      await apiUploadBrandLogo(brandId, pendingLogoFile.value)
    } else if (logoRemoved.value && editing.value?.logoUrl) {
      await apiDeleteBrandLogo(brandId)
    }

    modalOpen.value = false
    loadBrands()
  } catch (e: unknown) {
    formErrors.value.general = e instanceof Error ? e.message : 'Save failed.'
  } finally {
    saving.value = false
  }
}
```

Note: check the existing `handleSave` to confirm the validation and API call shape — the replacement above mirrors the existing logic exactly, just adds logo handling after the brand save.

- [x] **Step 6: Add logo widget to the modal template**

Inside the `<AModal>` form, after the `<AInput v-model="form.bg" ...>` line and before `<p v-if="formErrors.general">`, add:

```html
<!-- Logo -->
<div>
  <p class="text-2xs font-semibold text-dash-muted uppercase tracking-wider mb-2">Logo (optional)</p>
  <div v-if="logoPreview" class="flex items-center gap-3">
    <img :src="logoPreview" alt="Brand logo" class="h-12 w-12 object-contain rounded border border-dash-border bg-dash-bg p-1" />
    <AButton size="sm" variant="ghost" type="button" @click="removeLogo">
      <X :size="12" /> Remove
    </AButton>
  </div>
  <label v-else class="flex items-center gap-2 cursor-pointer rounded-btn border border-dashed border-dash-border px-3 py-2.5 text-xs text-dash-faint hover:border-dash-muted transition-colors">
    <Image :size="14" />
    Click to upload logo (PNG, SVG — max 2 MB)
    <input type="file" accept="image/*" class="sr-only" @change="pickLogoFile" />
  </label>
</div>
```

- [x] **Step 7: Commit**

```bash
git add aroma-admin/src/views/BrandsView.vue
git commit -m "feat: add brand logo upload/remove to admin BrandsView"
```

---

### Task 7: Admin UI — logo in BrandDetailView header

**Files:**
- Modify: `aroma-admin/src/views/BrandDetailView.vue`

The brand header currently shows a colour swatch div and the brand name. We add the logo (if present) next to the swatch.

- [x] **Step 1: Add logo display in brand header**

Find the brand header block (around line 21):
```html
<div class="flex items-center gap-4">
  <div
    class="h-10 w-10 rounded-btn shrink-0 border border-dash-border"
    :style="{ backgroundColor: brand.bg }"
  />
  <div>
    ...
  </div>
</div>
```

After the colour-swatch `<div>`, add:
```html
<img
  v-if="brand.logoUrl"
  :src="brand.logoUrl"
  alt="Brand logo"
  class="h-10 w-10 object-contain rounded-btn border border-dash-border bg-white p-1 shrink-0"
/>
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/views/BrandDetailView.vue
git commit -m "feat: show brand logo in BrandDetailView header"
```

---

### Task 8: Storefront types

**Files:**
- Modify: `aroma/src/types/index.ts`

- [x] **Step 1: Add `logoUrl` to `Brand` interface**

Find:
```typescript
export interface Brand {
  id: string
  name: string
  nameEn: string
  origin: string
  tagline: string
  count: number
  bg?: string
}
```

Add `logoUrl` field:
```typescript
export interface Brand {
  id: string
  name: string
  nameEn: string
  origin: string
  tagline: string
  count: number
  bg?: string
  logoUrl?: string | null
}
```

- [x] **Step 2: Add `brandLogoUrl` to `Product` interface**

Find the `Product` interface (around line 55). Locate the line `brandId: string` and add below it:
```typescript
brandLogoUrl?: string | null
```

- [x] **Step 3: Commit**

```bash
git add aroma/src/types/index.ts
git commit -m "feat: add brandLogoUrl to Product and logoUrl to Brand types"
```

---

### Task 9: Storefront — brand logo badge on ProductCard

**Files:**
- Modify: `aroma/src/components/shared/ProductCard.tsx`

The logo should appear as a small ~28×28 image in the bottom-right corner of the product image area, above the bestseller strip if present. Use `object-contain` with a white/neutral background circle so logos of any shape look clean.

- [x] **Step 1: Add logo badge to the image area**

In `ProductCard.tsx`, inside the image `<div>` (the relative container), find the bestseller strip:
```tsx
{/* Bestseller strip */}
{product.bestseller && (
  <div className="absolute bottom-0 inset-x-0 ...">
```

Just before that bestseller block, add:
```tsx
{/* Brand logo */}
{product.brandLogoUrl && (
  <div className="absolute bottom-2 right-2 h-7 w-7 rounded-full bg-white/90 border border-black/5 shadow-sm flex items-center justify-center overflow-hidden">
    <Image
      src={product.brandLogoUrl}
      alt={product.brand}
      fill
      sizes="28px"
      className="object-contain p-0.5"
    />
  </div>
)}
```

The `Image` component is already imported in this file.

- [x] **Step 2: Commit**

```bash
git add aroma/src/components/shared/ProductCard.tsx
git commit -m "feat: show brand logo badge on ProductCard"
```

---

### Task 10: Storefront — brand logo on ProductPageClient

**Files:**
- Modify: `aroma/src/features/product/ProductPageClient.tsx`

The purchase module already has a brand name line at the top. We show the logo as a small inline image to the right of the brand text.

- [x] **Step 1: Update brand name section**

Find (around line 160):
```tsx
<p className="font-sans text-[12px] text-aroma-accent tracking-[0.12em] uppercase mb-2">
  {product.brand}
</p>
```

Replace with:
```tsx
<div className="flex items-center gap-2 mb-2">
  <p className="font-sans text-[12px] text-aroma-accent tracking-[0.12em] uppercase">
    {product.brand}
  </p>
  {product.brandLogoUrl && (
    <div className="relative h-6 w-6 rounded-full bg-white border border-aroma-border-lt shadow-sm overflow-hidden flex-shrink-0">
      <Image
        src={product.brandLogoUrl}
        alt={product.brand}
        fill
        sizes="24px"
        className="object-contain p-0.5"
      />
    </div>
  )}
</div>
```

- [x] **Step 2: Commit**

```bash
git add aroma/src/features/product/ProductPageClient.tsx
git commit -m "feat: show brand logo on ProductPageClient"
```

---

## Self-Review

**Spec coverage:**
- ✅ Admin can add logo → Task 6 (BrandsView upload widget)
- ✅ Admin can edit logo → Task 6 (same upload replaces existing)
- ✅ Admin can remove logo → Task 6 (removeLogo + apiDeleteBrandLogo)
- ✅ Logo on product card bottom-right, small + consistent → Task 9
- ✅ Logo on product detail page → Task 10
- ✅ API changes → Tasks 1–5

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:**
- `logoUrl: string | null` used consistently in `AdminBrand`, `BrandResource`, and admin controller responses
- `brandLogoUrl?: string | null` in `Product` matches `ProductResource` field name
- `apiUploadBrandLogo` / `apiDeleteBrandLogo` match the admin.ts additions in Task 5 and usage in Task 6
