# Order Payment Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a `payment_status` field to orders (`not_paid` / `partially_paid` / `paid`) and an `order_payments` ledger that auto-updates the status as the admin records partial or full payments.

**Architecture:** A new `order_payments` table stores each payment transaction (amount + note). The `orders` table gains a `payment_status` column that is recomputed every time a payment is added by comparing the running sum to `orders.total`. The admin UI replaces the current hardcoded payment card with real data, plus an inline "Add Payment" form.

**Tech Stack:** Laravel 11 (migrations, Eloquent, enums, resource controllers), Vue 3 + TypeScript (Pinia-free, Composition API, vue-i18n), Tailwind CSS (OKLCH design tokens)

---

## File Map

**Create:**
- `aroma-api/app/Enums/PaymentStatus.php` — PHP enum `not_paid | partially_paid | paid`
- `aroma-api/app/Models/OrderPayment.php` — Eloquent model for individual payment records
- `aroma-api/app/Http/Controllers/Api/Admin/AdminOrderPaymentController.php` — `index` + `store`
- `aroma-api/database/migrations/2026_05_23_100000_add_payment_status_to_orders_table.php`
- `aroma-api/database/migrations/2026_05_23_100001_create_order_payments_table.php`

**Modify:**
- `aroma-api/app/Models/Order.php` — add `payment_status` fillable/cast + `payments()` relation
- `aroma-api/app/Http/Controllers/Api/Admin/AdminOrderController.php` — include `paymentStatus` + `payments` in `formatOrder()`
- `aroma-api/app/Services/OrderService.php` — set `payment_status = not_paid` on order creation
- `aroma-api/routes/api.php` — register new payment routes + import controller
- `aroma-admin/src/types/index.ts` — add `PaymentStatus`, `OrderPayment`, extend `AdminOrder`
- `aroma-admin/src/api/admin.ts` — add `apiGetOrderPayments`, `apiAddOrderPayment`
- `aroma-admin/src/components/ui/ABadge.vue` — add `not_paid`, `partially_paid` badge entries
- `aroma-admin/src/locales/en.ts` — add payment tracking locale keys
- `aroma-admin/src/locales/ar.ts` — add Arabic payment tracking locale keys
- `aroma-admin/src/views/OrderDetailView.vue` — replace static payment card with live payment UI

---

## Task 1: PaymentStatus enum

**Files:**
- Create: `aroma-api/app/Enums/PaymentStatus.php`

- [x] **Step 1: Create the enum**

```php
<?php
namespace App\Enums;

enum PaymentStatus: string
{
    case NotPaid       = 'not_paid';
    case PartiallyPaid = 'partially_paid';
    case Paid          = 'paid';
}
```

- [x] **Step 2: Commit**

```bash
git add aroma-api/app/Enums/PaymentStatus.php
git commit -m "feat: add PaymentStatus enum (not_paid, partially_paid, paid)"
```

---

## Task 2: Database migrations

**Files:**
- Create: `aroma-api/database/migrations/2026_05_23_100000_add_payment_status_to_orders_table.php`
- Create: `aroma-api/database/migrations/2026_05_23_100001_create_order_payments_table.php`

- [x] **Step 1: Create migration to add payment_status to orders**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->enum('payment_status', ['not_paid', 'partially_paid', 'paid'])
                  ->default('not_paid')
                  ->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('payment_status');
        });
    }
};
```

- [x] **Step 2: Create migration for order_payments table**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_payments', function (Blueprint $table) {
            $table->id();
            $table->string('order_id');
            $table->decimal('amount', 10, 2);
            $table->string('note')->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_payments');
    }
};
```

- [x] **Step 3: Run the migrations**

```bash
cd aroma-api && php artisan migrate
```

Expected output: two migration lines with `DONE`.

- [x] **Step 4: Commit**

```bash
git add aroma-api/database/migrations/2026_05_23_100000_add_payment_status_to_orders_table.php
git add aroma-api/database/migrations/2026_05_23_100001_create_order_payments_table.php
git commit -m "feat: add payment_status to orders and create order_payments table"
```

---

## Task 3: OrderPayment model + Order model update

**Files:**
- Create: `aroma-api/app/Models/OrderPayment.php`
- Modify: `aroma-api/app/Models/Order.php`

- [x] **Step 1: Create OrderPayment model**

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderPayment extends Model
{
    protected $fillable = ['order_id', 'amount', 'note'];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
```

- [x] **Step 2: Update Order model**

Replace the existing `Order.php` content with:

```php
<?php

namespace App\Models;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = [
        'id', 'user_id', 'status', 'payment_status', 'total', 'note', 'admin_note',
        'is_pickup', 'address_id', 'delivery_city', 'delivery_description',
        'placeholder_bg', 'placeholder_dot',
        'coupon_code', 'discount_amount',
    ];

    protected $casts = [
        'status'          => OrderStatus::class,
        'payment_status'  => PaymentStatus::class,
        'total'           => 'decimal:2',
        'is_pickup'       => 'boolean',
        'discount_amount' => 'decimal:2',
    ];

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function items() {
        return $this->hasMany(OrderItem::class);
    }

    public function timeline() {
        return $this->hasMany(OrderTimeline::class)->orderBy('sort_order');
    }

    public function payments() {
        return $this->hasMany(OrderPayment::class)->orderByDesc('created_at');
    }
}
```

- [x] **Step 3: Commit**

```bash
git add aroma-api/app/Models/OrderPayment.php aroma-api/app/Models/Order.php
git commit -m "feat: add OrderPayment model and update Order with payment_status + payments relation"
```

---

## Task 4: Update OrderService to set payment_status on create

**Files:**
- Modify: `aroma-api/app/Services/OrderService.php`

- [x] **Step 1: Add PaymentStatus import and set default on create**

At the top of the file, add the import after the existing `use App\Enums\OrderStatus;` line:

```php
use App\Enums\PaymentStatus;
```

Inside `createOrder()`, add `payment_status` to the `Order::create([...])` array alongside `status`:

```php
$order = Order::create([
    'id'                   => $orderId,
    'user_id'              => $user->id,
    'status'               => OrderStatus::Placed,
    'payment_status'       => PaymentStatus::NotPaid,
    'total'                => $finalTotal,
    'note'                 => $data['note'] ?? null,
    'is_pickup'            => $data['is_pickup'],
    'address_id'           => $addressId,
    'delivery_city'        => $deliveryCity,
    'delivery_description' => $deliveryDescription,
    'placeholder_bg'       => '#F2E8E5',
    'placeholder_dot'      => '#C9A0A0',
    'coupon_code'          => $couponCode,
    'discount_amount'      => $discountAmount > 0 ? $discountAmount : null,
]);
```

- [x] **Step 2: Commit**

```bash
git add aroma-api/app/Services/OrderService.php
git commit -m "feat: set payment_status=not_paid on order creation"
```

---

## Task 5: AdminOrderPaymentController

**Files:**
- Create: `aroma-api/app/Http/Controllers/Api/Admin/AdminOrderPaymentController.php`

- [x] **Step 1: Create the controller**

```php
<?php
namespace App\Http\Controllers\Api\Admin;

use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderPayment;
use Illuminate\Http\Request;

class AdminOrderPaymentController extends Controller
{
    public function index(string $orderId)
    {
        $order = Order::with('payments')->findOrFail($orderId);

        return response()->json([
            'payments'      => $order->payments->map(fn($p) => $this->formatPayment($p)),
            'paymentStatus' => $order->payment_status?->value,
            'totalPaid'     => (float) $order->payments->sum('amount'),
        ]);
    }

    public function store(Request $request, string $orderId)
    {
        $order = Order::with('payments')->findOrFail($orderId);

        $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'note'   => 'nullable|string|max:255',
        ]);

        OrderPayment::create([
            'order_id' => $order->id,
            'amount'   => $request->amount,
            'note'     => $request->note,
        ]);

        $totalPaid = $order->payments()->sum('amount') + (float) $request->amount;

        if ($totalPaid >= (float) $order->total) {
            $paymentStatus = PaymentStatus::Paid;
        } elseif ($totalPaid > 0) {
            $paymentStatus = PaymentStatus::PartiallyPaid;
        } else {
            $paymentStatus = PaymentStatus::NotPaid;
        }

        $order->update(['payment_status' => $paymentStatus]);

        $order->load('payments');

        return response()->json([
            'payments'      => $order->payments->map(fn($p) => $this->formatPayment($p)),
            'paymentStatus' => $order->payment_status?->value,
            'totalPaid'     => (float) $order->payments->sum('amount'),
        ]);
    }

    private function formatPayment(OrderPayment $payment): array
    {
        return [
            'id'     => $payment->id,
            'amount' => (float) $payment->amount,
            'note'   => $payment->note,
            'date'   => $payment->created_at->format('Y-m-d H:i'),
        ];
    }
}
```

- [x] **Step 2: Commit**

```bash
git add aroma-api/app/Http/Controllers/Api/Admin/AdminOrderPaymentController.php
git commit -m "feat: add AdminOrderPaymentController with index and store"
```

---

## Task 6: Register routes + update AdminOrderController formatOrder

**Files:**
- Modify: `aroma-api/routes/api.php`
- Modify: `aroma-api/app/Http/Controllers/Api/Admin/AdminOrderController.php`

- [x] **Step 1: Add AdminOrderPaymentController to the import in routes/api.php**

Find the existing import block:

```php
use App\Http\Controllers\Api\Admin\{
    AdminDashboardController, AdminOrderController, AdminProductController,
    AdminBrandController, AdminCategoryController, AdminUserController,
    AdminProductVariantController, AdminProductImageController,
    AdminUserDetailController, AdminCouponController, AdminSpecTypeController,
    AdminProductSpecController, AdminProductVariantGenerateController,
    AdminProductDiscountController, AdminAdminsController, AdminRolesController,
    AdminNotificationController,
```

Add `AdminOrderPaymentController,` to the list (anywhere in the block).

- [x] **Step 2: Register the payment routes in api.php**

After the existing order routes:

```php
Route::get('/orders/{id}', [AdminOrderController::class, 'show']);
Route::patch('/orders/{id}/status', [AdminOrderController::class, 'updateStatus']);
Route::patch('/orders/{id}/note', [AdminOrderController::class, 'addAdminNote']);
```

Add:

```php
Route::get('/orders/{id}/payments',  [AdminOrderPaymentController::class, 'index']);
Route::post('/orders/{id}/payments', [AdminOrderPaymentController::class, 'store']);
```

- [x] **Step 3: Update formatOrder() in AdminOrderController to include paymentStatus**

In `AdminOrderController::formatOrder()`, add `paymentStatus` to the `$base` array:

```php
private function formatOrder(Order $order, bool $detailed = false): array
{
    $base = [
        'id'             => $order->id,
        'user'           => $order->user?->name,
        'userEmail'      => $order->user?->email,
        'total'          => $order->total,
        'status'         => $order->status?->value,
        'paymentStatus'  => $order->payment_status?->value ?? 'not_paid',
        'isPickup'       => $order->is_pickup,
        'note'           => $order->note,
        'adminNote'      => $order->admin_note,
        'date'           => $order->created_at->format('Y-m-d H:i'),
        'itemCount'      => $order->items->count(),
        'couponCode'     => $order->coupon_code,
        'discountAmount' => $order->discount_amount ? (float) $order->discount_amount : null,
    ];
    if ($detailed) {
        $base['items'] = $order->items->map(fn($i) => [
            'name'      => $i->product_name,
            'brand'     => $i->brand,
            'size'      => $i->size,
            'qty'       => $i->qty,
            'unitPrice' => $i->unit_price,
        ]);
        $base['timeline'] = $order->timeline->map(fn($t) => [
            'status'     => $t->status,
            'done'       => $t->done,
            'date'       => $t->occurred_at?->format('Y-m-d H:i'),
        ]);
    }
    return $base;
}
```

- [x] **Step 4: Verify routes are registered**

```bash
cd aroma-api && php artisan route:list --path=admin/orders
```

Expected: four order routes including `GET admin/orders/{id}/payments` and `POST admin/orders/{id}/payments`.

- [x] **Step 5: Commit**

```bash
git add aroma-api/routes/api.php aroma-api/app/Http/Controllers/Api/Admin/AdminOrderController.php
git commit -m "feat: register payment routes and expose paymentStatus in order response"
```

---

## Task 7: Admin TypeScript types

**Files:**
- Modify: `aroma-admin/src/types/index.ts`

- [x] **Step 1: Add PaymentStatus type and OrderPayment interface**

After the existing `export type OrderStatus = ...` line, add:

```typescript
export type PaymentStatus = 'not_paid' | 'partially_paid' | 'paid'
```

After the `AdminTimelineEntry` interface, add:

```typescript
export interface OrderPayment {
  id: number
  amount: number
  note: string | null
  date: string
}

export interface OrderPaymentsResponse {
  payments:      OrderPayment[]
  paymentStatus: PaymentStatus
  totalPaid:     number
}
```

- [x] **Step 2: Extend AdminOrder with paymentStatus**

In the `AdminOrder` interface, add after the `status` field:

```typescript
paymentStatus: PaymentStatus
```

- [x] **Step 3: Commit**

```bash
git add aroma-admin/src/types/index.ts
git commit -m "feat: add PaymentStatus type, OrderPayment interface, extend AdminOrder"
```

---

## Task 8: Admin API functions

**Files:**
- Modify: `aroma-admin/src/api/admin.ts`

- [x] **Step 1: Import the new types at the top of the file**

Ensure `OrderPaymentsResponse` is imported from `'../types'` (add to existing import if present).

- [x] **Step 2: Add the two payment API functions after the existing order functions**

```typescript
export const apiGetOrderPayments = (orderId: string) =>
  client.get<OrderPaymentsResponse>(`/admin/orders/${orderId}/payments`)

export const apiAddOrderPayment = (orderId: string, data: { amount: number; note?: string }) =>
  client.post<OrderPaymentsResponse>(`/admin/orders/${orderId}/payments`, data)
```

- [x] **Step 3: Commit**

```bash
git add aroma-admin/src/api/admin.ts
git commit -m "feat: add apiGetOrderPayments and apiAddOrderPayment"
```

---

## Task 9: ABadge — add payment status entries

**Files:**
- Modify: `aroma-admin/src/components/ui/ABadge.vue`

- [x] **Step 1: Add not_paid and partially_paid to the map**

In the `map` object in `ABadge.vue`, add these entries after the existing `paid` entry:

```typescript
not_paid:       { label: 'Not Paid',        cls: 'bg-dash-danger-lt text-dash-danger',      dotCls: 'bg-dash-danger' },
partially_paid: { label: 'Partially Paid',  cls: 'bg-dash-fig-lt text-dash-fig',            dotCls: 'bg-dash-fig' },
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/components/ui/ABadge.vue
git commit -m "feat: add not_paid and partially_paid entries to ABadge"
```

---

## Task 10: Locale strings (English + Arabic)

**Files:**
- Modify: `aroma-admin/src/locales/en.ts`
- Modify: `aroma-admin/src/locales/ar.ts`

- [x] **Step 1: Add keys to English locale**

In `en.ts`, inside the `orderDetail` object, replace the existing payment-related keys:

```typescript
paymentLabel:          'Payment',
amountCharged:         'Amount charged',
paidLabel:             'Paid',
paymentStatusLabel:    'Payment status',
paymentHistory:        'Payment history',
addPaymentBtn:         'Add payment',
paymentAmountLabel:    'Amount (LYD)',
paymentNoteLabel:      'Note (optional)',
paymentAmountPlaceholder: 'e.g. 50.00',
paymentNotePlaceholder:   'e.g. Cash on collection',
totalPaidLabel:        'Total paid',
remainingLabel:        'Remaining',
noPaymentsYet:         'No payments recorded yet.',
paymentStatusNotPaid:  'Not paid',
paymentStatusPartial:  'Partially paid',
paymentStatusPaid:     'Paid',
```

- [x] **Step 2: Add keys to Arabic locale**

In `ar.ts`, inside the `orderDetail` object, replace/add the same keys with Arabic translations:

```typescript
paymentLabel:          'الدفع',
amountCharged:         'المبلغ المحصّل',
paidLabel:             'مدفوع',
paymentStatusLabel:    'حالة الدفع',
paymentHistory:        'سجل المدفوعات',
addPaymentBtn:         'إضافة دفعة',
paymentAmountLabel:    'المبلغ (د.ل)',
paymentNoteLabel:      'ملاحظة (اختياري)',
paymentAmountPlaceholder: 'مثال: 50.00',
paymentNotePlaceholder:   'مثال: نقداً عند الاستلام',
totalPaidLabel:        'إجمالي المدفوع',
remainingLabel:        'المتبقي',
noPaymentsYet:         'لا توجد مدفوعات مسجّلة بعد.',
paymentStatusNotPaid:  'غير مدفوع',
paymentStatusPartial:  'مدفوع جزئياً',
paymentStatusPaid:     'مدفوع',
```

- [x] **Step 3: Commit**

```bash
git add aroma-admin/src/locales/en.ts aroma-admin/src/locales/ar.ts
git commit -m "feat: add payment tracking locale keys (en + ar)"
```

---

## Task 11: OrderDetailView — replace payment card with live payment UI

**Files:**
- Modify: `aroma-admin/src/views/OrderDetailView.vue`

This is the main UI task. The current hardcoded VISA card block (lines 319–337) is replaced with a live payment panel that shows: payment status badge, running total paid vs. order total, payment history list, and an "Add Payment" form.

- [x] **Step 1: Import new API functions and types in the `<script setup>` block**

Add to the existing imports:

```typescript
import { apiGetOrderPayments, apiAddOrderPayment } from '../api/admin'
import type { OrderPayment, OrderPaymentsResponse } from '../types'
```

- [x] **Step 2: Add reactive state for payment data**

Add these refs after the existing `showStatusPanel` ref:

```typescript
const payments       = ref<OrderPayment[]>([])
const paymentStatus  = ref<string>('not_paid')
const totalPaid      = ref<number>(0)
const loadingPayments = ref(false)
const addingPayment   = ref(false)
const newPaymentAmount = ref<string>('')
const newPaymentNote   = ref<string>('')
const showAddPayment   = ref(false)
```

- [x] **Step 3: Add fetchPayments function**

```typescript
async function fetchPayments() {
  if (!order.value) return
  loadingPayments.value = true
  try {
    const res = await apiGetOrderPayments(order.value.id)
    payments.value      = res.data.payments
    paymentStatus.value = res.data.paymentStatus
    totalPaid.value     = res.data.totalPaid
  } finally {
    loadingPayments.value = false
  }
}
```

- [x] **Step 4: Call fetchPayments inside onMounted after order is loaded**

In the existing `onMounted` block, after `order.value = res.data`, add:

```typescript
await fetchPayments()
```

- [x] **Step 5: Add handleAddPayment function**

```typescript
async function handleAddPayment() {
  const amount = parseFloat(newPaymentAmount.value)
  if (!order.value || isNaN(amount) || amount <= 0) return
  addingPayment.value = true
  try {
    const res = await apiAddOrderPayment(order.value.id, {
      amount,
      note: newPaymentNote.value.trim() || undefined,
    })
    payments.value      = res.data.payments
    paymentStatus.value = res.data.paymentStatus
    totalPaid.value     = res.data.totalPaid
    newPaymentAmount.value = ''
    newPaymentNote.value   = ''
    showAddPayment.value   = false
  } finally {
    addingPayment.value = false
  }
}
```

- [x] **Step 6: Add a remaining computed**

```typescript
const remaining = computed(() =>
  Math.max(0, Number(order.value?.total ?? 0) - totalPaid.value)
)
```

- [x] **Step 7: Replace the static payment card in the template**

Find and replace the entire `<!-- Payment card -->` block (from `<div class="bg-dash-paper border...` through the closing `</div>` of that card) with the following:

```html
<!-- Payment card -->
<div class="bg-dash-paper border border-dash-border rounded-card shadow-[0_1px_0_oklch(26%_0.04_250/0.025)] p-5 space-y-4">
  <div class="flex items-center justify-between">
    <p class="text-[10.5px] tracking-[.16em] uppercase font-semibold text-dash-faint">{{ t('orderDetail.paymentLabel') }}</p>
    <ABadge :status="paymentStatus" />
  </div>

  <!-- Paid / Remaining row -->
  <div class="space-y-1.5 text-[12.5px]">
    <div class="flex items-center justify-between">
      <span class="text-dash-muted">{{ t('orderDetail.totalPaidLabel') }}</span>
      <span class="tabular-nums font-semibold text-dash-text">{{ totalPaid.toFixed(2) }} LYD</span>
    </div>
    <div v-if="remaining > 0" class="flex items-center justify-between">
      <span class="text-dash-muted">{{ t('orderDetail.remainingLabel') }}</span>
      <span class="tabular-nums text-dash-danger font-semibold">{{ remaining.toFixed(2) }} LYD</span>
    </div>
    <div class="flex items-center justify-between pt-2 border-t border-dash-border-lt">
      <span class="text-dash-muted">{{ t('orderDetail.amountCharged') }}</span>
      <span class="tabular-nums font-semibold text-dash-text">{{ Number(order?.total).toFixed(2) }} LYD</span>
    </div>
  </div>

  <!-- Payment history -->
  <div>
    <p class="text-[10.5px] tracking-[.14em] uppercase font-semibold text-dash-faint mb-2">{{ t('orderDetail.paymentHistory') }}</p>
    <div v-if="loadingPayments" class="h-8 rounded bg-dash-bg animate-pulse" />
    <p v-else-if="payments.length === 0" class="text-[11.5px] text-dash-faint italic">{{ t('orderDetail.noPaymentsYet') }}</p>
    <div v-else class="space-y-1.5">
      <div
        v-for="p in payments"
        :key="p.id"
        class="flex items-start justify-between gap-2 text-[11.5px]"
      >
        <div>
          <p class="tabular-nums font-semibold text-dash-success-dk">+{{ p.amount.toFixed(2) }} LYD</p>
          <p v-if="p.note" class="text-[10.5px] text-dash-muted">{{ p.note }}</p>
        </div>
        <span class="tabular-nums text-dash-faint whitespace-nowrap shrink-0 mt-0.5">{{ p.date }}</span>
      </div>
    </div>
  </div>

  <!-- Add payment toggle -->
  <button
    @click="showAddPayment = !showAddPayment"
    class="w-full h-8 rounded-btn border border-dash-border text-[12px] font-medium text-dash-text-2 hover:bg-dash-bg transition-colors"
  >
    {{ showAddPayment ? '−' : '+' }} {{ t('orderDetail.addPaymentBtn') }}
  </button>

  <!-- Add payment form -->
  <div v-if="showAddPayment" class="space-y-2.5 pt-1">
    <AInput
      v-model="newPaymentAmount"
      type="number"
      min="0.01"
      step="0.01"
      :label="t('orderDetail.paymentAmountLabel')"
      :placeholder="t('orderDetail.paymentAmountPlaceholder')"
    />
    <AInput
      v-model="newPaymentNote"
      :label="t('orderDetail.paymentNoteLabel')"
      :placeholder="t('orderDetail.paymentNotePlaceholder')"
    />
    <AButton
      class="w-full justify-center"
      @click="handleAddPayment"
      :loading="addingPayment"
      :disabled="!newPaymentAmount || parseFloat(newPaymentAmount) <= 0"
    >
      {{ t('orderDetail.addPaymentBtn') }}
    </AButton>
  </div>
</div>
```

- [x] **Step 8: Commit**

```bash
git add aroma-admin/src/views/OrderDetailView.vue
git commit -m "feat: replace static payment card with live payment tracking UI"
```

---

## Task 12: Show paymentStatus badge in OrdersView list

**Files:**
- Modify: `aroma-admin/src/views/OrdersView.vue`

- [x] **Step 1: Add paymentStatus column to the columns definition**

In `OrdersView.vue`, find the columns array (where `key: 'status'` is defined) and add after it:

```typescript
{ key: 'paymentStatus', label: t('orders.columns.paymentStatus') },
```

- [x] **Step 2: Add the cell slot for paymentStatus in the template**

After the existing `<template #cell-status="{ value }">` slot, add:

```html
<template #cell-paymentStatus="{ value }">
  <ABadge :status="value as string" />
</template>
```

- [x] **Step 3: Add the locale key for the column header**

In `en.ts`, inside `orders.columns`, add:

```typescript
paymentStatus: 'Payment',
```

In `ar.ts`, inside `orders.columns`, add:

```typescript
paymentStatus: 'الدفع',
```

- [x] **Step 4: Commit**

```bash
git add aroma-admin/src/views/OrdersView.vue aroma-admin/src/locales/en.ts aroma-admin/src/locales/ar.ts
git commit -m "feat: show payment status badge in orders list"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| `not_paid` / `partially_paid` / `paid` statuses | Task 1, 7, 9 |
| Admin adds a payment (full or partial amount) | Task 5, 8, 11 |
| Payment status auto-updates based on payments added | Task 5 (`store` method computes status from sum) |
| Show payment status in order detail | Task 11 |
| Show payment status in orders list | Task 12 |
| Arabic locale | Task 10 |

**Placeholder scan:** None found — all steps include actual code.

**Type consistency:** `paymentStatus` is typed as `PaymentStatus` in `AdminOrder` (Task 7), returned as `paymentStatus` by `formatOrder()` (Task 6), referenced as `paymentStatus.value` in the Vue component (Task 11). `OrderPayment.amount` is `number` on the frontend and `decimal:2` cast on the backend — `res.data.totalPaid` is a float. All consistent.
