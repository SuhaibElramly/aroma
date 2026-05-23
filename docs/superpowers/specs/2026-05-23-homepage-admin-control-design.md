# Homepage Admin Control — Design Spec

**Date:** 2026-05-23
**Status:** Approved

## Overview

The Aroma storefront homepage is currently hardcoded. This feature makes the entire homepage — hero content, section visibility, section order, and section configuration — controllable from the admin panel without touching code.

The Trust Strip is removed as part of this work.

---

## Goals

- Admin can edit hero headline, subtext, CTA button labels and links
- Admin can upload a hero background image (falls back to animated bottle when none set)
- Admin can add, remove, reorder, and toggle any homepage section block
- Admin can add multiple instances of the same block type (e.g. two Featured Brand banners)
- Admin can configure each block: title, label, product limit, brand selection
- Storefront renders exactly what the admin has configured

---

## Data Model

### `settings` table — `homepage_hero` record

A single JSON record keyed `homepage_hero` in the existing (or new) `settings` table.

```json
{
  "headline": "حيث تبدأ الحكايات",
  "subtext": "عطور مختارة من أرقى دور العطور في العالم...",
  "cta_primary_label": "استكشف المجموعة",
  "cta_primary_url": "/search",
  "cta_secondary_label": "تصفح الماركات",
  "cta_secondary_url": "/brands",
  "bg_image_path": null
}
```

### `homepage_blocks` table

| Column     | Type    | Notes                                              |
|------------|---------|----------------------------------------------------|
| `id`       | integer | Primary key                                        |
| `type`     | string  | `bestsellers`, `new_arrivals`, `offers`, `categories`, `featured_brand` |
| `position` | integer | Sort order (1-based, no gaps required)             |
| `enabled`  | boolean | Default `true`                                     |
| `config`   | JSON    | Block-specific settings (see below)                |
| `created_at`, `updated_at` | timestamps | |

**Config shapes by type:**

```json
// bestsellers, new_arrivals, offers
{ "label": "أكثر العطور طلبًا", "title": "الأكثر مبيعًا", "limit": 3 }

// categories
{ "label": "تسوق حسب", "title": "الفئة" }

// featured_brand
{ "label": "دار مميزة", "title": "Parfums de Marly", "brand_id": "parfums-de-marly", "product_limit": 2 }
```

---

## API

### Storefront

**`GET /api/home`**

Returns hero config and all enabled blocks ordered by position, each hydrated with live data.

```json
{
  "hero": {
    "headline": "...",
    "subtext": "...",
    "cta_primary_label": "...",
    "cta_primary_url": "...",
    "cta_secondary_label": "...",
    "cta_secondary_url": "...",
    "bg_image_url": null
  },
  "blocks": [
    {
      "id": 1,
      "type": "bestsellers",
      "config": { "label": "...", "title": "...", "limit": 3 },
      "data": { "products": [...] }
    },
    {
      "id": 2,
      "type": "featured_brand",
      "config": { "label": "...", "title": "...", "brand_id": "...", "product_limit": 2 },
      "data": { "brand": {...}, "products": [...] }
    }
  ]
}
```

### Admin

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/homepage` | Full config — hero + all blocks (including disabled) |
| `PUT` | `/api/admin/homepage/hero` | Update hero fields; accepts multipart for image upload |
| `GET` | `/api/admin/homepage/blocks` | List all blocks ordered by position |
| `POST` | `/api/admin/homepage/blocks` | Add a new block |
| `PUT` | `/api/admin/homepage/blocks/{id}` | Update block config or enabled state |
| `DELETE` | `/api/admin/homepage/blocks/{id}` | Remove a block |
| `PUT` | `/api/admin/homepage/blocks/reorder` | Batch update positions `[{ id, position }]` |

---

## Backend (Laravel)

### New files

- `database/migrations/..._create_homepage_blocks_table.php`
- `database/migrations/..._create_settings_table.php` (if not already present)
- `app/Models/HomepageBlock.php`
- `app/Models/Setting.php` (key/value JSON store)
- `app/Services/HomepageAdminService.php` — CRUD for blocks and hero
- `app/Services/HomeService.php` — rewritten to read from DB
- `app/Http/Controllers/Api/Admin/HomepageController.php`
- `database/seeders/HomepageBlockSeeder.php` — seeds the 5 default blocks

### Seeder default state

Seeds the 5 current sections in their existing order, enabled, with default config matching the hardcoded values they replace.

### Image upload

Hero image stored in `storage/app/public/homepage/` via Laravel's `Storage` facade. `bg_image_url` in the API response is the public URL. Deleting the image sets `bg_image_path` to `null`, restoring the animated bottle fallback.

---

## Admin UI (Vue 3)

### New view: `HomepageView.vue`

Added to the sidebar nav between Orders and Coupons.

**Layout (top to bottom):**
1. Topbar with page title "Homepage Editor" + "Save Changes" button
2. **Hero section card** — 6 text fields (headline, subtext, 2× CTA label+URL) + image upload input
3. **Section label** "Page Blocks — drag to reorder"
4. **Block list** — draggable rows, each showing: drag handle, type icon, type label, Arabic title, item count meta, enabled toggle, edit button, delete button
5. **"+ Add Block" button** — opens a dropdown/modal to pick block type, then opens the block editor

**Block editor** (slide-over drawer or modal):
- Shared fields: Label (small uppercase), Title (Arabic), Enabled toggle
- Type-specific fields:
  - Product blocks: Limit (number input, 1–12)
  - Featured brand: Brand selector (dropdown of all brands), Product limit (1–4)
  - Categories: no extra fields

**Drag-and-drop:** Uses `vuedraggable` (already available in ecosystem). On drop, calls `/api/admin/homepage/blocks/reorder` with updated positions.

**Save behaviour:** Hero fields auto-save on "Save Changes" click. Block enable/disable toggles save immediately (single `PUT` call). Block config saves on "Save" within the editor drawer.

### New API module: `src/api/admin.ts` additions

```ts
getHomepage(): Promise<HomepageConfig>
updateHero(data: FormData): Promise<void>
getBlocks(): Promise<HomepageBlock[]>
addBlock(block: NewBlockPayload): Promise<HomepageBlock>
updateBlock(id: number, data: Partial<HomepageBlock>): Promise<void>
deleteBlock(id: number): Promise<void>
reorderBlocks(order: { id: number; position: number }[]): Promise<void>
```

---

## Storefront (Next.js)

### `HeroSection.tsx`

Accepts props instead of hardcoded values:
```ts
interface HeroProps {
  headline: string
  subtext: string
  ctaPrimary: { label: string; url: string }
  ctaSecondary: { label: string; url: string }
  bgImageUrl: string | null
}
```

When `bgImageUrl` is set: full-bleed `<img>` replaces the right-hand CSS bottle panel, with a dark overlay preserving text legibility. When null: existing animated bottle renders as before.

### `HomeSection.tsx`

`HomeSections` iterates the `blocks` array from the API and renders the correct component per `type`. Section components (`BestsellersSection`, etc.) already accept props — no internal changes needed.

### `TrustStrip.tsx`

File deleted. Import removed from `HomePageClient.tsx`.

### `useHomeData` / types

`HomePageData` type updated to match the new API shape. `HeroSection` receives hero props from the parent `HomePageClient`.

---

## Out of Scope

- Custom product collections (manually picking specific products for a block)
- Hero background colour picker
- Any page other than the homepage
- Rich text / HTML in hero fields
