# Product Images Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Fix the product detail page so it shows product images and lets admins upload, set thumbnail, and delete images.

**Architecture:** Two-part fix — (1) add `images` eager-load + response data to the existing `AdminProductController::show()` endpoint, (2) add an image management panel in `ProductDetailView.vue` that replaces the placeholder bottle SVG with the real thumbnail and provides upload/delete/thumbnail controls backed by the existing `AdminProductImageController` routes.

**Tech Stack:** Laravel (PHP), Vue 3 Composition API, Tailwind CSS, `multipart/form-data` file upload via native `fetch`.

---

## Root Cause Summary

- **Images not showing in hero:** `AdminProductController::show()` (line 89) eager-loads `['brand', 'category', 'variants']` but omits `images`. The response JSON has no image data. The hero card renders a generated bottle SVG rather than a real photo.
- **Can't add/edit images:** `ProductDetailView.vue` has no image management UI at all. The backend image CRUD endpoints already exist and work correctly (`AdminProductImageController`).

## Existing API Endpoints (do not recreate)

```
GET    /api/admin/products/{id}/images
POST   /api/admin/products/{id}/images          multipart, field: images[] (array of files)
PATCH  /api/admin/products/{id}/images/{imgId}/thumbnail
DELETE /api/admin/products/{id}/images/{imgId}
```

Response shape for each image:
```json
{ "id": 1, "url": "http://...", "originalName": "front.jpg", "isThumbnail": true, "sortOrder": 0 }
```

---

## File Map

| File | Change |
|------|--------|
| `aroma-api/app/Http/Controllers/Api/Admin/AdminProductController.php` | Add `images` to `with()` in `show()`, add `images` array to JSON response |
| `aroma-admin/src/views/ProductDetailView.vue` | Load images on mount, show real thumbnail in hero, add image panel |

---

### Task 1: Fix API — Include Images in Product Show Response

**Files:**
- Modify: `aroma-api/app/Http/Controllers/Api/Admin/AdminProductController.php:89`

- [x] **Step 1: Add `images` to the eager-load in `show()`**

In `AdminProductController.php`, change line 89:

```php
// Before
$product = Product::with(['brand', 'category', 'variants'])->findOrFail($id);

// After
$product = Product::with(['brand', 'category', 'variants', 'images'])->findOrFail($id);
```

- [x] **Step 2: Add `images` and `thumbnailUrl` to the JSON response**

In `AdminProductController.php`, add to the `return response()->json([...])` array (after `'sales_count'`):

```php
'images'        => $product->images->map(fn($img) => [
    'id'          => $img->id,
    'url'         => $img->url,
    'isThumbnail' => $img->is_thumbnail,
    'sortOrder'   => $img->sort_order,
])->values(),
'thumbnailUrl'  => $product->images->firstWhere('is_thumbnail', true)?->url
                   ?? $product->images->first()?->url,
```

- [x] **Step 3: Manually verify the fix**

Run:
```bash
curl -s -H "Authorization: Bearer <admin_token>" \
  http://localhost:8000/api/admin/products/1 | python3 -m json.tool | grep -A5 '"images"'
```

Expected: `"images": [...]` array in the response (empty array `[]` is fine if the product has no images yet).

- [x] **Step 4: Commit**

```bash
cd aroma-api
git add app/Http/Controllers/Api/Admin/AdminProductController.php
git commit -m "fix: eager-load images in admin product show endpoint"
```

---

### Task 2: Show Real Thumbnail in Hero Card

**Files:**
- Modify: `aroma-admin/src/views/ProductDetailView.vue`

The hero card currently shows a generated bottle SVG in a `<div>` with `:style="{ background: bottleGradient }"`. Replace it with the product's thumbnail image when available, falling back to the placeholder when not.

- [x] **Step 1: Add `images` state and load them on mount**

In the `<script setup>` block, add after the existing state declarations (around line 16):

```ts
const images = ref<{ id: number; url: string; isThumbnail: boolean; sortOrder: number }[]>([])
```

In the `load()` function, the product endpoint now returns `images` in its JSON. After `product.value = await pRes.json()`, add:

```ts
images.value = product.value.images ?? []
```

Also add a computed for the thumbnail URL:

```ts
const thumbnailUrl = computed(() =>
  images.value.find(i => i.isThumbnail)?.url ?? images.value[0]?.url ?? null
)
```

- [x] **Step 2: Replace the bottle SVG with a real image (with fallback)**

In the template, find the hero card's image column (the `<div class="col-span-4">` block, lines 283–309). Replace the entire inner `<div>` (from `<div class="relative w-full rounded-card overflow-hidden"` to the closing `</div>` before `</div><!-- col-span-4 -->`) with:

```html
<!-- Real product image or placeholder -->
<div
  class="relative w-full rounded-card overflow-hidden"
  style="height: 16rem;"
>
  <img
    v-if="thumbnailUrl"
    :src="thumbnailUrl"
    alt=""
    class="w-full h-full object-cover"
  />
  <div
    v-else
    class="w-full h-full flex items-center justify-center"
    :style="{ background: bottleGradient }"
  >
    <!-- hatching overlay -->
    <div
      class="absolute inset-0 opacity-[0.08]"
      style="background-image: repeating-linear-gradient(45deg, transparent 0 8px, rgba(0,0,0,.6) 8px 9px)"
    />
    <svg viewBox="0 0 80 80" class="relative" style="width:56%;height:56%">
      <g
        fill="none"
        :stroke="`oklch(28% 0.06 ${productHue})`"
        stroke-width="1.4"
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="0.85"
      >
        <path d="M32 10h16v8l3 5v6"/>
        <rect x="24" y="29" width="32" height="38" rx="5"/>
        <path d="M32 14h16"/>
      </g>
    </svg>
  </div>
</div>
```

- [x] **Step 3: Verify in browser**

Open a product that has images — the hero should show the real photo. Open a product with no images — the hero should still show the bottle SVG placeholder.

- [x] **Step 4: Commit**

```bash
cd aroma-admin
git add src/views/ProductDetailView.vue
git commit -m "feat: show real product thumbnail in hero card"
```

---

### Task 3: Add Image Management Panel

**Files:**
- Modify: `aroma-admin/src/views/ProductDetailView.vue`

Add a new panel between the hero card and the variants table that lets admins view all images, upload new ones, set the thumbnail, and delete images.

- [x] **Step 1: Add image upload state and functions to `<script setup>`**

Add these state refs after the `images` ref from Task 2:

```ts
const uploadingImages  = ref(false)
const deletingImageId  = ref<number | null>(null)
const settingThumbId   = ref<number | null>(null)
```

Add these functions (after the `load()` function, before `openProductEdit`):

```ts
async function uploadImages(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  uploadingImages.value = true
  const formData = new FormData()
  Array.from(input.files).forEach(f => formData.append('images[]', f))
  const res = await fetch(`${BASE}/admin/products/${props.id}/images`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token()}`, 'Accept': 'application/json' },
    body: formData,
  })
  if (res.ok) {
    const newImgs = await res.json()
    images.value.push(...newImgs)
  }
  uploadingImages.value = false
  input.value = ''
}

async function setThumbnail(imageId: number) {
  settingThumbId.value = imageId
  const res = await fetch(`${BASE}/admin/products/${props.id}/images/${imageId}/thumbnail`, {
    method: 'PATCH',
    headers: headers(),
  })
  if (res.ok) {
    images.value.forEach(img => { img.isThumbnail = img.id === imageId })
  }
  settingThumbId.value = null
}

async function deleteImage(imageId: number) {
  if (!confirm(t('productDetail.deleteImageConfirm'))) return
  deletingImageId.value = imageId
  const res = await fetch(`${BASE}/admin/products/${props.id}/images/${imageId}`, {
    method: 'DELETE',
    headers: headers(),
  })
  if (res.ok) {
    images.value = images.value.filter(img => img.id !== imageId)
    // Recompute thumbnail naturally via computed
  }
  deletingImageId.value = null
}
```

- [x] **Step 2: Add the image panel to the template**

Insert this block **after** the hero card closing `</div>` (after line 352) and **before** the variants table panel:

```html
<!-- Images panel -->
<div class="bg-dash-paper border border-dash-border rounded-card shadow-[0_1px_0_oklch(26%_0.04_250/0.025)] p-6">
  <div class="flex items-center justify-between mb-4">
    <div>
      <p class="text-[11px] tracking-[.16em] uppercase font-semibold text-dash-faint">{{ t('productDetail.imagesSectionLabel') }}</p>
      <h3 class="font-display text-[18px] leading-tight mt-0.5 text-dash-text">
        {{ t('productDetail.imagesCount', { n: images.length }, images.length) }}
      </h3>
    </div>
    <label
      class="h-8 px-3 rounded-btn text-[12px] font-medium border border-dash-border-lt inline-flex items-center gap-1.5 text-dash-text-2 bg-dash-paper hover:bg-dash-bg transition-colors cursor-pointer"
      :class="uploadingImages ? 'opacity-50 pointer-events-none' : ''"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      {{ uploadingImages ? t('productDetail.uploadingLabel') : t('productDetail.uploadImagesBtn') }}
      <input type="file" multiple accept="image/*" class="sr-only" @change="uploadImages" />
    </label>
  </div>

  <!-- Image grid -->
  <div v-if="images.length" class="grid grid-cols-4 gap-3">
    <div
      v-for="img in [...images].sort((a, b) => a.sortOrder - b.sortOrder)"
      :key="img.id"
      class="group relative rounded-xl overflow-hidden border aspect-square"
      :class="img.isThumbnail ? 'border-dash-primary ring-1 ring-dash-primary' : 'border-dash-border'"
    >
      <img :src="img.url" alt="" class="w-full h-full object-cover" />

      <!-- Thumbnail badge -->
      <span
        v-if="img.isThumbnail"
        class="absolute top-1.5 start-1.5 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-dash-primary text-white"
      >{{ t('productDetail.thumbnailBadge') }}</span>

      <!-- Hover actions -->
      <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2 gap-1">
        <button
          v-if="!img.isThumbnail"
          @click="setThumbnail(img.id)"
          :disabled="settingThumbId === img.id"
          class="text-[10.5px] font-semibold px-2 py-1 rounded-md bg-white/90 text-dash-text hover:bg-white disabled:opacity-50 transition-colors"
        >{{ t('productDetail.setThumbnailBtn') }}</button>
        <span v-else class="flex-1" />
        <button
          @click="deleteImage(img.id)"
          :disabled="deletingImageId === img.id"
          class="text-[10.5px] font-semibold px-2 py-1 rounded-md bg-dash-danger text-white hover:opacity-90 disabled:opacity-50 transition-opacity ms-auto"
        >{{ t('common.delete') }}</button>
      </div>
    </div>
  </div>

  <!-- Empty state -->
  <div v-else class="text-center py-10 rounded-xl border border-dashed border-dash-border text-dash-muted">
    <p class="text-[12.5px]">{{ t('productDetail.noImages') }}</p>
    <p class="text-[11px] mt-1 text-dash-faint">{{ t('productDetail.noImagesHint') }}</p>
  </div>
</div>
```

- [x] **Step 3: Add i18n keys**

Open `aroma-admin/src/locales/en.json` (or wherever the English locale file lives — run `find aroma-admin/src/locales -name "*.json" | head -5` to locate it) and add these keys under the `productDetail` section:

```json
"imagesSectionLabel": "Images",
"imagesCount": "{n} image | {n} images",
"uploadImagesBtn": "Upload Images",
"uploadingLabel": "Uploading…",
"thumbnailBadge": "Thumbnail",
"setThumbnailBtn": "Set Thumbnail",
"deleteImageConfirm": "Delete this image?",
"noImages": "No images yet",
"noImagesHint": "Upload images using the button above"
```

Open `aroma-admin/src/locales/ar.json` and add Arabic translations:

```json
"imagesSectionLabel": "الصور",
"imagesCount": "{n} صورة",
"uploadImagesBtn": "رفع صور",
"uploadingLabel": "جارٍ الرفع…",
"thumbnailBadge": "مصغّرة",
"setThumbnailBtn": "تعيين مصغّرة",
"deleteImageConfirm": "هل تريد حذف هذه الصورة؟",
"noImages": "لا توجد صور بعد",
"noImagesHint": "ارفع الصور باستخدام الزر أعلاه"
```

- [x] **Step 4: Verify in browser**

1. Open any product detail page — the images panel should appear below the hero.
2. Click "Upload Images", select 1–2 files — they should appear in the grid.
3. Hover an image — "Set Thumbnail" and "Delete" buttons appear.
4. Click "Set Thumbnail" — the border highlights and the "Thumbnail" badge appears; hero card updates to show the new thumbnail.
5. Click "Delete" — image disappears from the grid.
6. Reload — changes persist.

- [x] **Step 5: Commit**

```bash
cd aroma-admin
git add src/views/ProductDetailView.vue src/locales/en.json src/locales/ar.json
git commit -m "feat: add product image management panel to admin product detail"
```

---

## Self-Review

**Spec coverage:**
- ✅ Show images → Task 1 (API fix) + Task 2 (hero card)
- ✅ Add images → Task 3 upload via `images[]` multipart POST
- ✅ Edit/set thumbnail → Task 3 `setThumbnail()` → PATCH endpoint
- ✅ Delete images → Task 3 `deleteImage()` → DELETE endpoint
- ✅ i18n (both en + ar) → Task 3 Step 3

**Placeholder scan:** None found — all steps include complete code.

**Type consistency:** `images` ref uses `{ id: number; url: string; isThumbnail: boolean; sortOrder: number }[]` consistently across Tasks 2 and 3. `thumbnailUrl` computed reads `.isThumbnail` matching the shape. `setThumbnail()` mutates `.isThumbnail` on the same shape.
