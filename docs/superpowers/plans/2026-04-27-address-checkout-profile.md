# Address, Checkout & Profile Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Simplify the address model (label + city + description only), wire delivery addresses into checkout, prompt for profile completion (name/phone) when missing, and skip the address step entirely when the customer chooses in-store pickup.

**Architecture:**
- Strip address model down to `label`, `city`, `description`, `is_default` (migration + soft rename).
- Checkout reads from user profile for name/phone; if missing it prompts once and saves to profile before continuing.
- Checkout shows default address with quick-swap when delivery is chosen; if no address exists, shows an inline create-address form that saves the address before placing the order.
- Orders table gets a nullable `address_id` FK (+ `delivery_city`/`delivery_description` snapshot) so historical delivery info is preserved.

**Tech Stack:** Laravel 11 (backend), Next.js 14 App Router + React Query + Zod + Zustand (frontend), Tailwind CSS, Arabic RTL UI.

---

## File Structure

### Backend — modified
| File | Change |
|---|---|
| `aroma-api/database/migrations/2026_04_27_000001_simplify_addresses_table.php` | new — removes name/phone/street/country, adds description |
| `aroma-api/database/migrations/2026_04_27_000002_add_address_to_orders_table.php` | new — adds address_id FK + delivery_city + delivery_description to orders |
| `aroma-api/app/Models/Address.php` | update fillable + cast |
| `aroma-api/app/Http/Requests/Address/AddressRequest.php` | update validation rules |
| `aroma-api/app/Http/Resources/AddressResource.php` | update returned fields |
| `aroma-api/app/Services/AddressService.php` | no change needed |
| `aroma-api/app/Http/Requests/Order/CreateOrderRequest.php` | add address_id (required unless is_pickup) |
| `aroma-api/app/Services/OrderService.php` | snapshot address on order creation |
| `aroma-api/app/Http/Resources/OrderResource.php` | expose deliveryAddress in response |

### Frontend — modified
| File | Change |
|---|---|
| `aroma/src/types/index.ts` | update Address type, CheckoutPayload type, Order type |
| `aroma/src/lib/schemas/index.ts` | update addressSchema, checkoutSchema |
| `aroma/src/mocks/services.ts` | update addAddress/updateAddress payloads |
| `aroma/src/features/profile/AddressesPageClient.tsx` | simplify form + card display |
| `aroma/src/features/checkout/CheckoutPageClient.tsx` | full rework: profile-completion modal, address selector/creator, pickup bypass |
| `aroma/src/features/orders/OrderDetailClient.tsx` | show delivery address when present |

---

## Task 1: Backend — Simplify Addresses Table

**Files:**
- Create: `aroma-api/database/migrations/2026_04_27_000001_simplify_addresses_table.php`
- Modify: `aroma-api/app/Models/Address.php`
- Modify: `aroma-api/app/Http/Requests/Address/AddressRequest.php`
- Modify: `aroma-api/app/Http/Resources/AddressResource.php`

- [x] **Step 1: Create the migration**

```php
<?php
// aroma-api/database/migrations/2026_04_27_000001_simplify_addresses_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->dropColumn(['name', 'phone', 'street', 'country']);
            $table->text('description')->nullable()->after('city');
        });
    }

    public function down(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->dropColumn('description');
            $table->string('name');
            $table->string('phone', 20)->nullable();
            $table->string('street');
            $table->string('country', 100);
        });
    }
};
```

- [x] **Step 2: Run the migration**

```bash
cd aroma-api && php artisan migrate
```

Expected: `Migrating: 2026_04_27_000001_simplify_addresses_table` then `Migrated`.

- [x] **Step 3: Update Address model**

Replace the `fillable` array in `aroma-api/app/Models/Address.php`:

```php
protected $fillable = [
    'user_id',
    'label',
    'city',
    'description',
    'is_default',
];
```

- [x] **Step 4: Update AddressRequest validation**

Replace the `rules()` body in `aroma-api/app/Http/Requests/Address/AddressRequest.php`:

```php
public function rules(): array
{
    return [
        'label'       => ['required', 'string', 'max:50'],
        'city'        => ['required', 'string', 'max:100'],
        'description' => ['nullable', 'string', 'max:500'],
        'is_default'  => ['boolean'],
    ];
}
```

- [x] **Step 5: Update AddressResource**

Replace the `toArray()` body in `aroma-api/app/Http/Resources/AddressResource.php`:

```php
public function toArray(Request $request): array
{
    return [
        'id'          => $this->id,
        'label'       => $this->label,
        'city'        => $this->city,
        'description' => $this->description,
        'isDefault'   => (bool) $this->is_default,
    ];
}
```

- [x] **Step 6: Smoke-test via artisan tinker**

```bash
cd aroma-api && php artisan tinker --execute="echo json_encode(app(\App\Http\Resources\AddressResource::class, ['resource' => \App\Models\Address::first()]))"
```

Expected: JSON with keys `id`, `label`, `city`, `description`, `isDefault` — no name/phone/street/country.

- [x] **Step 7: Commit**

```bash
git add aroma-api/database/migrations/2026_04_27_000001_simplify_addresses_table.php \
        aroma-api/app/Models/Address.php \
        aroma-api/app/Http/Requests/Address/AddressRequest.php \
        aroma-api/app/Http/Resources/AddressResource.php
git commit -m "feat: simplify addresses — label/city/description/is_default only"
```

---

## Task 2: Backend — Add Address Snapshot to Orders

**Files:**
- Create: `aroma-api/database/migrations/2026_04_27_000002_add_address_to_orders_table.php`
- Modify: `aroma-api/app/Models/Order.php`
- Modify: `aroma-api/app/Http/Requests/Order/CreateOrderRequest.php`
- Modify: `aroma-api/app/Services/OrderService.php`
- Modify: `aroma-api/app/Http/Resources/OrderResource.php`

- [x] **Step 1: Create the migration**

```php
<?php
// aroma-api/database/migrations/2026_04_27_000002_add_address_to_orders_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('address_id')
                  ->nullable()
                  ->after('is_pickup')
                  ->constrained('addresses')
                  ->nullOnDelete();
            $table->string('delivery_city', 100)->nullable()->after('address_id');
            $table->text('delivery_description')->nullable()->after('delivery_city');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['address_id']);
            $table->dropColumn(['address_id', 'delivery_city', 'delivery_description']);
        });
    }
};
```

- [x] **Step 2: Run the migration**

```bash
cd aroma-api && php artisan migrate
```

Expected: `Migrated: 2026_04_27_000002_add_address_to_orders_table`.

- [x] **Step 3: Update Order model**

Add to `fillable` in `aroma-api/app/Models/Order.php`:

```php
protected $fillable = [
    'id', 'user_id', 'status', 'total', 'note', 'admin_note',
    'is_pickup', 'address_id', 'delivery_city', 'delivery_description',
    'placeholder_bg', 'placeholder_dot',
];
```

- [x] **Step 4: Update CreateOrderRequest**

Replace `rules()` in `aroma-api/app/Http/Requests/Order/CreateOrderRequest.php`:

```php
public function rules(): array
{
    return [
        'items'                      => ['required', 'array', 'min:1'],
        'items.*.product_variant_id' => ['required', 'integer', 'exists:product_variants,id'],
        'items.*.quantity'           => ['required', 'integer', 'min:1'],
        'note'                       => ['nullable', 'string', 'max:500'],
        'is_pickup'                  => ['required', 'boolean'],
        'address_id'                 => ['required_if:is_pickup,false', 'nullable', 'integer', 'exists:addresses,id'],
        'total'                      => ['required', 'numeric', 'min:0.01'],
    ];
}
```

- [x] **Step 5: Update OrderService to snapshot address**

In `aroma-api/app/Services/OrderService.php`, update `createOrder()`. Find the block that creates the Order and add the address snapshot:

```php
public function createOrder(User $user, array $data): Order
{
    $deliveryCity        = null;
    $deliveryDescription = null;
    $addressId           = null;

    if (! $data['is_pickup'] && ! empty($data['address_id'])) {
        $address = \App\Models\Address::find($data['address_id']);
        if ($address && $address->user_id === $user->id) {
            $addressId           = $address->id;
            $deliveryCity        = $address->city;
            $deliveryDescription = $address->description;
        }
    }

    $order = Order::create([
        'id'                   => $this->generateOrderId(),
        'user_id'              => $user->id,
        'status'               => 'placed',
        'total'                => $data['total'],
        'note'                 => $data['note'] ?? null,
        'is_pickup'            => $data['is_pickup'],
        'address_id'           => $addressId,
        'delivery_city'        => $deliveryCity,
        'delivery_description' => $deliveryDescription,
        'placeholder_bg'       => $this->randomHex(),
        'placeholder_dot'      => $this->randomHex(),
    ]);

    // ... rest of the method (items + timeline creation) stays the same
```

> **Note:** Preserve the existing items and timeline creation logic below this block. Only replace the `Order::create([...])` call and add the address resolution above it.

- [x] **Step 6: Update OrderResource to expose delivery address**

Add to `toArray()` in `aroma-api/app/Http/Resources/OrderResource.php`:

```php
'deliveryAddress' => $this->is_pickup ? null : [
    'city'        => $this->delivery_city,
    'description' => $this->delivery_description,
],
```

Place this after the existing `note` / `adminNote` fields.

- [x] **Step 7: Commit**

```bash
git add aroma-api/database/migrations/2026_04_27_000002_add_address_to_orders_table.php \
        aroma-api/app/Models/Order.php \
        aroma-api/app/Http/Requests/Order/CreateOrderRequest.php \
        aroma-api/app/Services/OrderService.php \
        aroma-api/app/Http/Resources/OrderResource.php
git commit -m "feat: snapshot delivery address on order creation"
```

---

## Task 3: Frontend — Update Types and Schemas

**Files:**
- Modify: `aroma/src/types/index.ts`
- Modify: `aroma/src/lib/schemas/index.ts`
- Modify: `aroma/src/mocks/services.ts`

- [x] **Step 1: Update Address type in `aroma/src/types/index.ts`**

Find the existing `Address` interface (around line 159) and replace it:

```ts
export interface Address {
  id: number
  label: string
  city: string
  description?: string
  isDefault: boolean
}
```

- [x] **Step 2: Update CheckoutPayload type in `aroma/src/types/index.ts`**

Find `CheckoutPayload` (around line 186) and replace:

```ts
export interface CheckoutPayload {
  addressId?: number       // undefined when is_pickup = true
  note?: string
  pickup: boolean
  items: CartItem[]
  total: number
}
```

- [x] **Step 3: Add DeliveryAddress to Order type in `aroma/src/types/index.ts`**

Find the `Order` interface and add the `deliveryAddress` field:

```ts
deliveryAddress?: {
  city: string
  description?: string
} | null
```

- [x] **Step 4: Update address schema in `aroma/src/lib/schemas/index.ts`**

Find the address schema (around line 29) and replace:

```ts
export const addressSchema = z.object({
  label:       z.string().min(1, 'اختر تسمية'),
  city:        z.string().min(2, 'المدينة مطلوبة'),
  description: z.string().max(500).optional(),
  isDefault:   z.boolean().optional(),
})
```

- [x] **Step 5: Update checkout schema in `aroma/src/lib/schemas/index.ts`**

Find the checkout schema (around line 64) and replace:

```ts
export const checkoutSchema = z.object({
  note:      z.string().max(500).optional(),
  pickup:    z.boolean(),
  addressId: z.number().optional(),
})
```

- [x] **Step 6: Update address service functions in `aroma/src/mocks/services.ts`**

Find `addAddress` and `updateAddress` (around line 200) and update their payloads:

```ts
export async function addAddress(data: {
  label: string
  city: string
  description?: string
  isDefault?: boolean
}): Promise<Address> {
  const res = await fetch('/api/addresses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      label:       data.label,
      city:        data.city,
      description: data.description ?? null,
      is_default:  data.isDefault ?? false,
    }),
  })
  if (!res.ok) throw new Error('Failed to add address')
  const json = await res.json()
  return json.data
}

export async function updateAddress(
  id: number,
  data: { label?: string; city?: string; description?: string; isDefault?: boolean }
): Promise<Address> {
  const res = await fetch(`/api/addresses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      label:       data.label,
      city:        data.city,
      description: data.description ?? null,
      is_default:  data.isDefault ?? false,
    }),
  })
  if (!res.ok) throw new Error('Failed to update address')
  const json = await res.json()
  return json.data
}
```

- [x] **Step 7: Update createOrder service call in `aroma/src/mocks/services.ts`**

Find `createOrder` and update the request body:

```ts
export async function createOrder(payload: CheckoutPayload): Promise<Order> {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items:      payload.items.map(i => ({
        product_variant_id: i.variantId,
        quantity:           i.quantity,
      })),
      note:       payload.note ?? null,
      is_pickup:  payload.pickup,
      address_id: payload.pickup ? null : (payload.addressId ?? null),
      total:      payload.total,
    }),
  })
  if (!res.ok) throw new Error('Failed to create order')
  const json = await res.json()
  return json.data
}
```

- [x] **Step 8: Commit**

```bash
git add aroma/src/types/index.ts \
        aroma/src/lib/schemas/index.ts \
        aroma/src/mocks/services.ts
git commit -m "feat: update types/schemas/services for simplified address"
```

---

## Task 4: Frontend — Simplify AddressesPageClient

**Files:**
- Modify: `aroma/src/features/profile/AddressesPageClient.tsx`

The address form currently has inputs for label, name, phone, street, city, country. We need to keep label + city + description only. The `AddressCard` display also needs to stop showing name/phone/street/country.

- [x] **Step 1: Update the `AddressForm` component inside `AddressesPageClient.tsx`**

The form `defaultValues` should be:

```tsx
const form = useForm<z.infer<typeof addressSchema>>({
  resolver: zodResolver(addressSchema),
  defaultValues: editing
    ? { label: editing.label, city: editing.city, description: editing.description ?? '', isDefault: editing.isDefault }
    : { label: '', city: '', description: '', isDefault: false },
})
```

Remove the `name`, `phone`, `street`, `country` field JSX blocks. The form body should render:

```tsx
{/* Label preset buttons */}
<div className="flex gap-2 flex-wrap">
  {(['المنزل', 'العمل', 'آخر'] as const).map(preset => (
    <button
      key={preset}
      type="button"
      onClick={() => form.setValue('label', preset)}
      className={cn(
        'px-3 py-1.5 rounded-full text-sm border transition-colors',
        form.watch('label') === preset
          ? 'bg-primary text-white border-primary'
          : 'border-border text-muted-foreground hover:border-primary'
      )}
    >
      {preset}
    </button>
  ))}
</div>

{/* Custom label input (shown if none of the presets match) */}
<FormField
  control={form.control}
  name="label"
  render={({ field }) => (
    <FormItem>
      <FormLabel>تسمية العنوان</FormLabel>
      <FormControl>
        <Input placeholder="مثال: المنزل، العمل..." {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>

<FormField
  control={form.control}
  name="city"
  render={({ field }) => (
    <FormItem>
      <FormLabel>المدينة</FormLabel>
      <FormControl>
        <Input placeholder="بنغازي" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>

<FormField
  control={form.control}
  name="description"
  render={({ field }) => (
    <FormItem>
      <FormLabel>وصف العنوان <span className="text-muted-foreground text-xs">(اختياري)</span></FormLabel>
      <FormControl>
        <Textarea
          placeholder="مثال: شارع جمال عبدالناصر، بجانب صيدلية الرشيد..."
          rows={3}
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>

<FormField
  control={form.control}
  name="isDefault"
  render={({ field }) => (
    <FormItem className="flex items-center gap-3">
      <FormControl>
        <Switch checked={field.value} onCheckedChange={field.onChange} />
      </FormControl>
      <FormLabel className="!mt-0">تعيين كعنوان افتراضي</FormLabel>
    </FormItem>
  )}
/>
```

- [x] **Step 2: Update the `AddressCard` component inside `AddressesPageClient.tsx`**

Replace the card body to only show label, city, description, and default badge:

```tsx
function AddressCard({ address, onEdit, onDelete }: {
  address: Address
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className={cn(
      'rounded-xl border p-4 flex flex-col gap-2 relative',
      address.isDefault && 'border-primary bg-primary/5'
    )}>
      {address.isDefault && (
        <span className="absolute top-3 left-3 text-xs bg-primary text-white px-2 py-0.5 rounded-full">
          افتراضي
        </span>
      )}
      <p className="font-semibold text-sm">{address.label}</p>
      <p className="text-sm text-muted-foreground">{address.city}</p>
      {address.description && (
        <p className="text-xs text-muted-foreground leading-relaxed">{address.description}</p>
      )}
      <div className="flex gap-2 mt-1">
        <button onClick={onEdit} className="text-xs text-primary hover:underline">تعديل</button>
        <button onClick={onDelete} className="text-xs text-destructive hover:underline">حذف</button>
      </div>
    </div>
  )
}
```

- [x] **Step 3: Verify the page compiles**

```bash
cd aroma && npx tsc --noEmit 2>&1 | head -40
```

Expected: No errors related to address fields.

- [x] **Step 4: Commit**

```bash
git add aroma/src/features/profile/AddressesPageClient.tsx
git commit -m "feat: simplify address form to label/city/description"
```

---

## Task 5: Frontend — Profile Completion Modal

This is a reusable component used inside the Checkout page. If the user's profile is missing `name` or `phone`, this modal appears first and saves the values before checkout proceeds.

**Files:**
- Create: `aroma/src/features/checkout/ProfileCompletionModal.tsx`

- [x] **Step 1: Create the component**

```tsx
// aroma/src/features/checkout/ProfileCompletionModal.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useUpdateProfile } from '@/lib/api/queries'

const schema = z.object({
  name:  z.string().min(2, 'الاسم مطلوب'),
  phone: z.string().min(7, 'رقم الهاتف مطلوب'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  initialName?: string
  initialPhone?: string
  onSaved: (name: string, phone: string) => void
}

export function ProfileCompletionModal({ open, initialName, initialPhone, onSaved }: Props) {
  const updateProfile = useUpdateProfile()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: initialName ?? '', phone: initialPhone ?? '' },
  })

  async function onSubmit(values: FormValues) {
    await updateProfile.mutateAsync({ name: values.name, phone: values.phone })
    onSaved(values.name, values.phone)
  }

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>أكمل بياناتك أولاً</DialogTitle>
          <DialogDescription>
            نحتاج إلى اسمك ورقم هاتفك لتأكيد الطلب وتسهيل التواصل معك.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم الكامل</FormLabel>
                  <FormControl>
                    <Input placeholder="سارة الرشيدي" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الهاتف</FormLabel>
                  <FormControl>
                    <Input placeholder="+218 91 000 0000" type="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'جاري الحفظ...' : 'حفظ والمتابعة'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

- [x] **Step 2: Ensure `useUpdateProfile` exists in queries**

Open `aroma/src/lib/api/queries.ts` and check for a `useUpdateProfile` mutation. If it exists, skip. If not, add it:

```ts
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { setUser } = useAuthStore()

  return useMutation({
    mutationFn: (data: { name?: string; phone?: string }) =>
      fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => r.json()).then(j => j.data),
    onSuccess: (updated) => {
      setUser(updated)
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })
}
```

- [x] **Step 3: Commit**

```bash
git add aroma/src/features/checkout/ProfileCompletionModal.tsx \
        aroma/src/lib/api/queries.ts
git commit -m "feat: add ProfileCompletionModal for missing name/phone"
```

---

## Task 6: Frontend — Address Selector Component

A self-contained component used inside Checkout to let the user pick their default address, switch to another, or create a new one inline.

**Files:**
- Create: `aroma/src/features/checkout/AddressSelector.tsx`

- [x] **Step 1: Create the component**

```tsx
// aroma/src/features/checkout/AddressSelector.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MapPin, ChevronDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useAddresses, useAddAddress } from '@/lib/api/queries'
import type { Address } from '@/types'

const newAddressSchema = z.object({
  label:       z.string().min(1, 'اختر تسمية'),
  city:        z.string().min(2, 'المدينة مطلوبة'),
  description: z.string().max(500).optional(),
})

interface Props {
  selectedId: number | undefined
  onChange: (id: number) => void
}

export function AddressSelector({ selectedId, onChange }: Props) {
  const { data: addresses = [], isLoading } = useAddresses()
  const addAddress = useAddAddress()
  const [showAll, setShowAll] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const form = useForm<z.infer<typeof newAddressSchema>>({
    resolver: zodResolver(newAddressSchema),
    defaultValues: { label: '', city: '', description: '' },
  })

  async function onCreateAddress(values: z.infer<typeof newAddressSchema>) {
    const created = await addAddress.mutateAsync({
      label:       values.label,
      city:        values.city,
      description: values.description,
      isDefault:   addresses.length === 0,
    })
    onChange(created.id)
    setShowForm(false)
  }

  if (isLoading) return <div className="h-16 animate-pulse rounded-xl bg-muted" />

  if (addresses.length === 0 && !showForm) {
    return (
      <div className="rounded-xl border border-dashed p-4 flex flex-col items-center gap-3 text-center">
        <MapPin className="text-muted-foreground" size={24} />
        <p className="text-sm text-muted-foreground">لا يوجد عنوان محفوظ</p>
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} className="ml-1" />
          إضافة عنوان
        </Button>
      </div>
    )
  }

  const defaultAddress = addresses.find(a => a.isDefault) ?? addresses[0]
  const displayList   = showAll ? addresses : (defaultAddress ? [defaultAddress] : addresses)

  return (
    <div className="space-y-3">
      {!showForm && (
        <>
          {displayList.map(addr => (
            <button
              key={addr.id}
              type="button"
              onClick={() => onChange(addr.id)}
              className={cn(
                'w-full text-right rounded-xl border p-4 transition-colors',
                selectedId === addr.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm">{addr.label}</span>
                  <span className="text-xs text-muted-foreground">{addr.city}</span>
                  {addr.description && (
                    <span className="text-xs text-muted-foreground">{addr.description}</span>
                  )}
                </div>
                {addr.isDefault && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    افتراضي
                  </span>
                )}
              </div>
            </button>
          ))}

          <div className="flex gap-2">
            {addresses.length > 1 && (
              <button
                type="button"
                onClick={() => setShowAll(v => !v)}
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                {showAll ? 'إخفاء' : `عرض كل العناوين (${addresses.length})`}
                <ChevronDown size={12} className={cn('transition-transform', showAll && 'rotate-180')} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mr-auto"
            >
              <Plus size={12} />
              عنوان جديد
            </button>
          </div>
        </>
      )}

      {showForm && (
        <div className="rounded-xl border p-4 space-y-3">
          <p className="text-sm font-medium">عنوان جديد</p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateAddress)} className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                {(['المنزل', 'العمل', 'آخر'] as const).map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => form.setValue('label', preset)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm border transition-colors',
                      form.watch('label') === preset
                        ? 'bg-primary text-white border-primary'
                        : 'border-border text-muted-foreground hover:border-primary'
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="تسمية العنوان" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="المدينة (مثال: بنغازي)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea placeholder="وصف العنوان — حي، شارع، معلم قريب..." rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={addAddress.isPending} className="flex-1">
                  {addAddress.isPending ? 'جاري الحفظ...' : 'حفظ العنوان'}
                </Button>
                {addresses.length > 0 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                    إلغاء
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  )
}
```

- [x] **Step 2: Ensure `useAddresses` and `useAddAddress` are exported from queries**

Check `aroma/src/lib/api/queries.ts`. If `useAddresses` doesn't exist, add:

```ts
export function useAddresses() {
  return useQuery({
    queryKey: ['addresses'],
    queryFn: () =>
      fetch('/api/addresses').then(r => r.json()).then(j => j.data as Address[]),
  })
}

export function useAddAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof addAddress>[0]) => addAddress(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  })
}
```

- [x] **Step 3: Commit**

```bash
git add aroma/src/features/checkout/AddressSelector.tsx \
        aroma/src/lib/api/queries.ts
git commit -m "feat: add AddressSelector component for checkout"
```

---

## Task 7: Frontend — Rework CheckoutPageClient

**Files:**
- Modify: `aroma/src/features/checkout/CheckoutPageClient.tsx`

This is the main checkout page. It needs to:
1. Check if user profile has `name` and `phone` → if not, show `ProfileCompletionModal` first.
2. Show a pickup toggle.
3. If delivery: show `AddressSelector`; block submission until an address is selected.
4. Remove the name/phone fields from the checkout form (they now live in profile).
5. Pass `addressId` (not name/phone) in the order payload.

- [x] **Step 1: Replace the CheckoutPageClient implementation**

```tsx
// aroma/src/features/checkout/CheckoutPageClient.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Store } from 'lucide-react'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { useCreateOrder } from '@/lib/api/queries'
import { ProfileCompletionModal } from './ProfileCompletionModal'
import { AddressSelector } from './AddressSelector'
import { checkoutSchema } from '@/lib/schemas'

type FormValues = z.infer<typeof checkoutSchema>

export function CheckoutPageClient() {
  const router = useRouter()
  const { items, total, clearCart } = useCartStore()
  const { user } = useAuthStore()
  const createOrder = useCreateOrder()

  const [success, setSuccess]             = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<number | undefined>()
  const [profileDone, setProfileDone]     = useState(false)

  const profileIncomplete = !user?.name || !user?.phone
  const showProfileModal  = profileIncomplete && !profileDone

  const form = useForm<FormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { note: '', pickup: false },
  })

  const isPickup = form.watch('pickup')

  async function onSubmit(values: FormValues) {
    if (!isPickup && !selectedAddressId) return

    const order = await createOrder.mutateAsync({
      items:     items,
      total:     total,
      note:      values.note,
      pickup:    values.pickup,
      addressId: values.pickup ? undefined : selectedAddressId,
    })

    clearCart()
    setSuccess(true)
    setTimeout(() => router.push('/orders'), 2000)
  }

  if (items.length === 0 && !success) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <p>سلتك فارغة</p>
        <Button variant="outline" onClick={() => router.push('/')}>تصفح المنتجات</Button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <CheckCircle2 size={64} className="text-green-500" />
        <p className="text-xl font-semibold">تم تأكيد الطلب!</p>
        <p className="text-muted-foreground text-sm">جاري تحويلك لصفحة الطلبات...</p>
      </div>
    )
  }

  return (
    <>
      <ProfileCompletionModal
        open={showProfileModal}
        initialName={user?.name}
        initialPhone={user?.phone}
        onSaved={() => setProfileDone(true)}
      />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-bold">إتمام الطلب</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Pickup toggle */}
            <FormField
              control={form.control}
              name="pickup"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl border p-4">
                  <div className="flex items-center gap-3">
                    <Store size={20} className="text-primary" />
                    <div>
                      <FormLabel className="text-base">استلام من المتجر</FormLabel>
                      <p className="text-xs text-muted-foreground">لا داعي لعنوان التوصيل</p>
                    </div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Address selector (delivery only) */}
            {!isPickup && (
              <div className="space-y-2">
                <p className="text-sm font-medium">عنوان التوصيل</p>
                <AddressSelector
                  selectedId={selectedAddressId}
                  onChange={setSelectedAddressId}
                />
                {!selectedAddressId && (
                  <p className="text-xs text-destructive">يرجى اختيار أو إضافة عنوان للتوصيل</p>
                )}
              </div>
            )}

            {/* Note */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظة <span className="text-muted-foreground text-xs">(اختياري)</span></FormLabel>
                  <FormControl>
                    <Textarea placeholder="تغليف هدية؟ تعليمات خاصة؟" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Order summary */}
            <div className="rounded-xl border p-4 space-y-3">
              <p className="font-semibold text-sm">ملخص الطلب</p>
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.name} × {item.quantity}</span>
                  <span>{(item.price * item.quantity).toFixed(2)} د.ل</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>الإجمالي</span>
                <span>{total.toFixed(2)} د.ل</span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                createOrder.isPending ||
                showProfileModal ||
                (!isPickup && !selectedAddressId)
              }
            >
              {createOrder.isPending ? 'جاري الإرسال...' : 'تأكيد الطلب'}
            </Button>
          </form>
        </Form>
      </div>
    </>
  )
}
```

- [x] **Step 2: Verify TypeScript**

```bash
cd aroma && npx tsc --noEmit 2>&1 | head -40
```

Expected: No checkout-related type errors.

- [x] **Step 3: Commit**

```bash
git add aroma/src/features/checkout/CheckoutPageClient.tsx
git commit -m "feat: rework checkout — profile modal, address selector, pickup bypass"
```

---

## Task 8: Frontend — Show Delivery Address in Order Detail

**Files:**
- Modify: `aroma/src/features/orders/OrderDetailClient.tsx`

- [x] **Step 1: Add a delivery address section**

In `OrderDetailClient.tsx`, find where the order `note` is displayed and add after it:

```tsx
{!order.isPickup && order.deliveryAddress && (
  <div className="rounded-xl border p-4 space-y-1">
    <p className="text-sm font-semibold">عنوان التوصيل</p>
    <p className="text-sm text-muted-foreground">{order.deliveryAddress.city}</p>
    {order.deliveryAddress.description && (
      <p className="text-xs text-muted-foreground">{order.deliveryAddress.description}</p>
    )}
  </div>
)}
{order.isPickup && (
  <div className="rounded-xl border p-4">
    <p className="text-sm font-semibold flex items-center gap-2">
      <Store size={16} className="text-primary" />
      استلام من المتجر
    </p>
  </div>
)}
```

Import `Store` from `lucide-react` at the top if not already imported.

Also ensure the `Order` type now includes `isPickup: boolean` — if not already, add it to the interface in `types/index.ts`.

- [x] **Step 2: Verify TypeScript**

```bash
cd aroma && npx tsc --noEmit 2>&1 | head -40
```

Expected: No errors.

- [x] **Step 3: Commit**

```bash
git add aroma/src/features/orders/OrderDetailClient.tsx \
        aroma/src/types/index.ts
git commit -m "feat: show delivery address or pickup badge in order detail"
```

---

## Self-Review

### Spec coverage

| Requirement | Task(s) |
|---|---|
| Remove street/phone/name/country from address | Task 1, Task 3, Task 4 |
| Fix label (naming) not saving correctly | Task 1 (migration + model), Task 4 (form reset uses label field) |
| Keep city + description | Task 1, Task 3, Task 4 |
| Name/phone moved to profile, prompt if missing | Task 5 (ProfileCompletionModal), Task 7 |
| Save name/phone to profile first time | Task 5 (`useUpdateProfile` mutation) |
| Multiple addresses: show default, quick change | Task 6 (AddressSelector collapses to default, shows expand) |
| No address: prompt user inline, save for later | Task 6 (empty-state → inline form) |
| Pickup: skip address entirely | Task 7 (isPickup branch bypasses AddressSelector) |
| Address snapshot on orders | Task 2 |
| Show delivery address in order detail | Task 8 |

### Type consistency

- `Address`: `label`, `city`, `description`, `isDefault` — consistent across Task 3 (types), Task 4 (form), Task 6 (selector).
- `CheckoutPayload`: `addressId` (not `address_id`) on frontend; serialized as `address_id` in `createOrder` service.
- `OrderResource` exposes `deliveryAddress.city` / `deliveryAddress.description` — matches `Order` type update in Task 8.
- `addressSchema` and inline `newAddressSchema` in Task 6 both use the same field names.

No placeholder steps detected. All code blocks are complete.
