# Coupons Management — Design Spec

**Date:** 2026-05-01

## Overview

Add coupon management to the admin dashboard and integrate coupon application into the storefront checkout and order detail views. Coupons have a minimum 4-character unique code, support percentage or fixed-amount discounts, and enforce expiry dates, usage limits, per-user limits, and minimum order amounts.

---

## Database

### New table: `coupons`

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `code` | string, unique | Uppercase, min 4 chars |
| `type` | enum: `percentage`, `fixed` | |
| `value` | decimal(8,2) | e.g. 20 for 20%, or 5.00 for 5 LYD |
| `min_order_amount` | decimal(8,2) nullable | Order total must be ≥ this |
| `max_uses` | int nullable | null = unlimited |
| `uses_count` | int default 0 | Incremented on each valid order |
| `expires_at` | datetime nullable | null = never expires |
| `is_active` | boolean default true | |
| `timestamps` | | |

### New table: `coupon_usages`

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `coupon_id` | FK → coupons | |
| `user_id` | FK → users | |
| `order_id` | FK → orders | |
| `timestamps` | | |

### Modified table: `orders`

Two nullable columns added via migration:
- `coupon_code` — string, nullable. Stored on the order for display/audit even if the coupon is later deleted.
- `discount_amount` — decimal(8,2), nullable. The actual LYD value deducted from the subtotal.

The `total` column stores the **post-discount** final amount.

---

## API (aroma-api / Laravel)

### Customer-facing routes (auth:sanctum required)

**`POST /coupons/validate`**
- Body: `{ code: string, order_total: number }`
- Validates the coupon without consuming a use
- Returns on success: `{ valid: true, type, value, discount_amount, final_total }`
- Returns on failure: `{ valid: false, error: string }` where `error` is one of:
  - `coupon_not_found`
  - `coupon_inactive`
  - `coupon_expired`
  - `min_order_not_met`
  - `max_uses_reached`
  - `already_used`

**`POST /orders`** (existing, extended)
- Accepts optional `coupon_code` in request body
- If provided, revalidates the coupon server-side
- Computes `discount_amount`, sets `total = subtotal - discount_amount`
- Saves `coupon_code` and `discount_amount` on the order
- Increments `coupon.uses_count`
- Creates a `coupon_usages` record

### Admin routes (`auth:sanctum` + `is_admin`, prefix `/admin`)

| Method | Route | Action |
|---|---|---|
| GET | `/admin/coupons` | List all coupons with usage stats |
| POST | `/admin/coupons` | Create coupon |
| PUT | `/admin/coupons/{id}` | Update coupon |
| DELETE | `/admin/coupons/{id}` | Delete coupon |
| PATCH | `/admin/coupons/{id}/toggle` | Flip `is_active` |

**Coupon response shape:**
```json
{
  "id": 1,
  "code": "SAVE20",
  "type": "percentage",
  "value": 20,
  "minOrderAmount": null,
  "maxUses": 100,
  "usesCount": 14,
  "expiresAt": "2026-06-01T00:00:00Z",
  "isActive": true,
  "createdAt": "2026-05-01T10:00:00Z"
}
```

**Validation rules for create/update:**
- `code`: required, string, min:4, unique (coupons table), uppercased automatically
- `type`: required, in:`percentage,fixed`
- `value`: required, numeric, min:0.01; if type=percentage then max:100
- `min_order_amount`: nullable, numeric, min:0
- `max_uses`: nullable, integer, min:1
- `expires_at`: nullable, date, after:today

---

## Admin Dashboard (aroma-admin / Vue)

### New file: `CouponsView.vue`

Follows the same layout pattern as `BrandsView.vue` and `CategoriesView.vue`.

**List table columns:**
- Code (monospace badge)
- Type (Percentage / Fixed)
- Value (formatted: "20%" or "5.00 LYD")
- Min Order (— if null)
- Uses (e.g. "14 / 100" or "14 / ∞")
- Expires (date or "Never")
- Status badge (Active / Inactive)
- Actions: Edit, Toggle, Delete

**Toolbar:** Search input (filters by code) + "New Coupon" button.

**Create/Edit form** (slide-over panel or modal, matching existing admin UI):
- Code field (auto-uppercased on input)
- Type selector: Percentage | Fixed Amount
- Value input (label changes to "%" or "LYD" based on type)
- Min Order Amount (optional)
- Max Uses (optional)
- Expires At (optional date input)
- Active toggle

**Row actions:**
- Edit → opens pre-filled form
- Toggle → calls PATCH `/toggle`, flips badge inline
- Delete → confirmation dialog, then DELETE request

### Router

Add `/coupons` route pointing to `CouponsView` and add "Coupons" link to the admin sidebar.

---

## Storefront (aroma / Next.js)

### Checkout (`CheckoutPageClient.tsx`)

A coupon row is inserted above the order total in the summary panel.

**Apply flow:**
1. Customer types a code and clicks "تطبيق" (Apply)
2. Frontend calls `POST /coupons/validate` with `{ code, order_total: subtotal }`
3. **Valid:** Shows a green confirmation line with the coupon code and discount amount. Summary updates to show:
   - المجموع الفرعي: X LYD
   - كوبون `CODE` — خصم Y LYD
   - **الإجمالي: Z LYD**
   An "×" button removes the applied coupon.
4. **Invalid:** Shows the appropriate Arabic error message:
   - `coupon_not_found` → "الكوبون غير موجود"
   - `coupon_inactive` → "هذا الكوبون غير مفعّل"
   - `coupon_expired` → "انتهت صلاحية الكوبون"
   - `min_order_not_met` → "الطلب أقل من الحد الأدنى لتطبيق الكوبون"
   - `max_uses_reached` → "تم استنفاد استخدامات هذا الكوبون"
   - `already_used` → "لقد استخدمت هذا الكوبون من قبل"

**On order submit:**
- If a coupon is applied, `coupon_code` is included in the order payload
- If removed, it is not sent

### Order Detail (`OrderDetailClient.tsx`)

If the order has `discountAmount` set, a discount line is shown in the price breakdown:

```
المجموع الفرعي   X LYD
كوبون CODE       −Y LYD
الإجمالي         Z LYD
```

The API must include `couponCode` and `discountAmount` in the order detail response.

### Admin Order Detail (`OrderDetailView.vue`)

Same discount breakdown shown in the order summary panel when `discountAmount` is present on the order.

---

## Types (aroma TypeScript)

New fields on the `Order` type:
```ts
couponCode?: string
discountAmount?: number
```

New type for coupon validation response:
```ts
type CouponValidation =
  | { valid: true; type: 'percentage' | 'fixed'; value: number; discountAmount: number; finalTotal: number }
  | { valid: false; error: string }
```

---

## Error Handling

- Coupon revalidation on order submit can fail if the coupon expires or runs out between "apply" and "submit". The order endpoint returns a 422 with the same error key, and the frontend shows the relevant Arabic error message and clears the applied coupon.
- Admin delete is blocked if there are associated `coupon_usages` rows — return a 422 with a clear message rather than cascade deleting audit history.
