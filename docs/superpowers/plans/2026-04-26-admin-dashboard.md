# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a standalone Vue 3 + Tailwind CSS admin dashboard SPA (at `aroma-admin/`) that lets store staff manage orders, products, brands, categories, and users through the existing Laravel API, plus new admin-only API routes.

**Architecture:** The dashboard is a completely separate Vite+Vue 3 app in `aroma-admin/` that communicates with the existing `aroma-api` backend. Admin auth is token-based (Sanctum), stored in `localStorage`. New admin routes and controllers are added to the Laravel API behind an `auth:sanctum` + `is_admin` middleware. The Vue app uses Pinia for state, Vue Router for navigation, and Axios for HTTP.

**Tech Stack:** Vue 3 (Composition API), Vite, Tailwind CSS v3, Pinia, Vue Router 4, Axios, VueUse, Lucide-vue-next, Zod (validation), Day.js (date formatting)

---

## File Structure

### Backend (`aroma-api/`)
```
app/
  Http/
    Controllers/Api/Admin/
      AdminAuthController.php       — admin login (email+password → token)
      AdminDashboardController.php  — stats endpoint (orders, revenue, users, products)
      AdminOrderController.php      — list, show, update status, add admin note
      AdminProductController.php    — list, create, update, delete products
      AdminBrandController.php      — list, create, update, delete brands
      AdminCategoryController.php   — list, create, update, delete categories
      AdminUserController.php       — list users, show user details
    Middleware/
      IsAdmin.php                   — checks users.is_admin flag
  Models/
    User.php                        — add is_admin bool field (migration)
routes/
  api.php                           — new /admin/* route group
database/
  migrations/
    2026_04_26_add_is_admin_to_users_table.php
```

### Frontend (`aroma-admin/`)
```
aroma-admin/
  index.html
  vite.config.ts
  tailwind.config.ts
  postcss.config.ts
  tsconfig.json
  package.json
  src/
    main.ts
    App.vue
    router/
      index.ts                  — routes: login, dashboard, orders, order-detail, products, brands, categories, users
    stores/
      auth.ts                   — Pinia store: token, user, login(), logout()
      orders.ts                 — fetchOrders(), updateOrderStatus(), addAdminNote()
      products.ts               — fetchProducts(), createProduct(), updateProduct(), deleteProduct()
      brands.ts                 — fetchBrands(), createBrand(), updateBrand(), deleteBrand()
      categories.ts             — fetchCategories(), createCategory(), updateCategory(), deleteCategory()
      users.ts                  — fetchUsers()
    api/
      client.ts                 — Axios instance with baseURL + Authorization header interceptor
      admin.ts                  — all API call functions (typed)
    views/
      LoginView.vue             — login form
      DashboardView.vue         — stats cards + recent orders table
      OrdersView.vue            — paginated orders table with status filter
      OrderDetailView.vue       — full order detail + status update + admin note
      ProductsView.vue          — products table + create/edit modal
      BrandsView.vue            — brands table + create/edit modal
      CategoriesView.vue        — categories table + create/edit modal
      UsersView.vue             — users table
    components/
      layout/
        AppLayout.vue           — sidebar + topbar shell
        Sidebar.vue             — nav links
        Topbar.vue              — page title + logout button
      ui/
        BaseButton.vue          — primary/secondary/danger variants
        BaseInput.vue           — labeled text input with error state
        BaseSelect.vue          — labeled select with error state
        BaseModal.vue           — dialog overlay
        BaseTable.vue           — sortable table with loading skeleton
        BaseBadge.vue           — status badge (color per status)
        StatCard.vue            — icon + number + label card
        Pagination.vue          — prev/next + page numbers
```

---

## Task 1: Backend — Admin Migration & Middleware

**Files:**
- Create: `aroma-api/database/migrations/2026_04_26_add_is_admin_to_users_table.php`
- Modify: `aroma-api/app/Models/User.php`
- Create: `aroma-api/app/Http/Middleware/IsAdmin.php`
- Modify: `aroma-api/bootstrap/app.php`

- [x] **Step 1: Create the migration**

```php
<?php
// aroma-api/database/migrations/2026_04_26_add_is_admin_to_users_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_admin')->default(false)->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_admin');
        });
    }
};
```

- [x] **Step 2: Run the migration**

```bash
cd aroma-api && php artisan migrate
```
Expected: `Migrating: 2026_04_26_add_is_admin_to_users_table` … `Migrated`

- [x] **Step 3: Update User model — add is_admin to fillable and casts**

In `aroma-api/app/Models/User.php`, update:
```php
protected $fillable = ['name', 'email', 'password', 'phone', 'is_admin'];

protected function casts(): array
{
    return [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_admin' => 'boolean',
    ];
}
```

- [x] **Step 4: Create the IsAdmin middleware**

```php
<?php
// aroma-api/app/Http/Middleware/IsAdmin.php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user()?->is_admin) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        return $next($request);
    }
}
```

- [x] **Step 5: Register middleware alias in bootstrap/app.php**

In `aroma-api/bootstrap/app.php`, inside `->withMiddleware(function (Middleware $middleware) {` add:
```php
$middleware->alias([
    'is_admin' => \App\Http\Middleware\IsAdmin::class,
]);
```

- [x] **Step 6: Create a seeder to make the first admin user**

Run this once manually to seed an admin (you'll use this account to log in):
```bash
cd aroma-api && php artisan tinker --execute="App\Models\User::create(['name'=>'Admin','email'=>'admin@aroma.ly','password'=>bcrypt('password'),'phone'=>'0910000000','is_admin'=>true]);"
```

- [x] **Step 7: Commit**

```bash
cd aroma-api && git add database/migrations/2026_04_26_add_is_admin_to_users_table.php app/Models/User.php app/Http/Middleware/IsAdmin.php bootstrap/app.php
git commit -m "feat(admin): add is_admin flag and middleware"
```

---

## Task 2: Backend — Admin API Routes & Controllers

**Files:**
- Create: `aroma-api/app/Http/Controllers/Api/Admin/AdminDashboardController.php`
- Create: `aroma-api/app/Http/Controllers/Api/Admin/AdminOrderController.php`
- Create: `aroma-api/app/Http/Controllers/Api/Admin/AdminProductController.php`
- Create: `aroma-api/app/Http/Controllers/Api/Admin/AdminBrandController.php`
- Create: `aroma-api/app/Http/Controllers/Api/Admin/AdminCategoryController.php`
- Create: `aroma-api/app/Http/Controllers/Api/Admin/AdminUserController.php`
- Modify: `aroma-api/routes/api.php`

- [x] **Step 1: Create AdminDashboardController**

```php
<?php
// aroma-api/app/Http/Controllers/Api/Admin/AdminDashboardController.php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Enums\OrderStatus;

class AdminDashboardController extends Controller
{
    public function stats()
    {
        return response()->json([
            'totalOrders' => Order::count(),
            'totalRevenue' => Order::whereNotIn('status', [OrderStatus::Cancelled])->sum('total'),
            'totalProducts' => Product::count(),
            'totalUsers' => User::where('is_admin', false)->count(),
            'recentOrders' => Order::with('user')
                ->orderByDesc('created_at')
                ->limit(5)
                ->get()
                ->map(fn($o) => [
                    'id' => $o->id,
                    'user' => $o->user?->name,
                    'total' => $o->total,
                    'status' => $o->status?->value,
                    'date' => $o->created_at->format('Y-m-d H:i'),
                ]),
        ]);
    }
}
```

- [x] **Step 2: Create AdminOrderController**

```php
<?php
// aroma-api/app/Http/Controllers/Api/Admin/AdminOrderController.php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Enums\OrderStatus;
use Illuminate\Http\Request;

class AdminOrderController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::with(['user', 'items'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $orders = $query->paginate(20);

        return response()->json([
            'data' => $orders->map(fn($o) => $this->formatOrder($o)),
            'meta' => [
                'total' => $orders->total(),
                'currentPage' => $orders->currentPage(),
                'lastPage' => $orders->lastPage(),
            ],
        ]);
    }

    public function show(string $id)
    {
        $order = Order::with(['user', 'items', 'timeline'])->findOrFail($id);
        return response()->json($this->formatOrder($order, detailed: true));
    }

    public function updateStatus(Request $request, string $id)
    {
        $request->validate(['status' => 'required|in:placed,confirmed,preparing,ready,delivered,cancelled']);
        $order = Order::findOrFail($id);
        $order->update(['status' => $request->status]);

        // Mark timeline entry as done
        $order->timeline()
            ->where('status', ucfirst($request->status))
            ->update(['done' => true, 'occurred_at' => now()]);

        return response()->json($this->formatOrder($order->fresh(['items', 'timeline']), detailed: true));
    }

    public function addAdminNote(Request $request, string $id)
    {
        $request->validate(['admin_note' => 'required|string|max:500']);
        $order = Order::findOrFail($id);
        $order->update(['admin_note' => $request->admin_note]);
        return response()->json(['admin_note' => $order->admin_note]);
    }

    private function formatOrder(Order $order, bool $detailed = false): array
    {
        $base = [
            'id' => $order->id,
            'user' => $order->user?->name,
            'userEmail' => $order->user?->email,
            'total' => $order->total,
            'status' => $order->status?->value,
            'isPickup' => $order->is_pickup,
            'note' => $order->note,
            'adminNote' => $order->admin_note,
            'date' => $order->created_at->format('Y-m-d H:i'),
            'itemCount' => $order->items->count(),
        ];
        if ($detailed) {
            $base['items'] = $order->items->map(fn($i) => [
                'name' => $i->product_name,
                'brand' => $i->brand,
                'size' => $i->size,
                'qty' => $i->qty,
                'unitPrice' => $i->unit_price,
            ]);
            $base['timeline'] = $order->timeline->map(fn($t) => [
                'status' => $t->status,
                'done' => $t->done,
                'date' => $t->occurred_at?->format('Y-m-d H:i'),
            ]);
        }
        return $base;
    }
}
```

- [x] **Step 3: Create AdminProductController**

```php
<?php
// aroma-api/app/Http/Controllers/Api/Admin/AdminProductController.php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class AdminProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['brand', 'category', 'variants'])
            ->orderBy('name');

        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }
        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->brand_id);
        }

        $products = $query->paginate(20);

        return response()->json([
            'data' => $products->map(fn($p) => [
                'id' => $p->id,
                'slug' => $p->slug,
                'name' => $p->name,
                'nameEn' => $p->name_en,
                'brand' => $p->brand?->name,
                'brandId' => $p->brand_id,
                'category' => $p->category?->label,
                'categoryId' => $p->category_id,
                'type' => $p->type?->value,
                'isNew' => $p->is_new,
                'isBestseller' => $p->is_bestseller,
                'isOffer' => $p->is_offer,
                'variantCount' => $p->variants->count(),
                'price' => $p->variants->first()?->price,
            ]),
            'meta' => [
                'total' => $products->total(),
                'currentPage' => $products->currentPage(),
                'lastPage' => $products->lastPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'slug' => 'required|string|unique:products,slug',
            'name' => 'required|string',
            'name_en' => 'nullable|string',
            'brand_id' => 'required|string|exists:brands,id',
            'category_id' => 'required|string|exists:categories,id',
            'type' => 'required|in:EDP,EDT,Parfum,EDC',
            'description' => 'nullable|string',
            'is_new' => 'boolean',
            'is_bestseller' => 'boolean',
            'is_offer' => 'boolean',
            'placeholder_bg' => 'required|string',
            'placeholder_dot' => 'required|string',
        ]);
        $product = Product::create($data);
        return response()->json(['id' => $product->id], 201);
    }

    public function update(Request $request, int $id)
    {
        $product = Product::findOrFail($id);
        $data = $request->validate([
            'slug' => "sometimes|string|unique:products,slug,{$id}",
            'name' => 'sometimes|string',
            'name_en' => 'nullable|string',
            'brand_id' => 'sometimes|string|exists:brands,id',
            'category_id' => 'sometimes|string|exists:categories,id',
            'type' => 'sometimes|in:EDP,EDT,Parfum,EDC',
            'description' => 'nullable|string',
            'is_new' => 'boolean',
            'is_bestseller' => 'boolean',
            'is_offer' => 'boolean',
            'placeholder_bg' => 'sometimes|string',
            'placeholder_dot' => 'sometimes|string',
        ]);
        $product->update($data);
        return response()->json(['id' => $product->id]);
    }

    public function destroy(int $id)
    {
        Product::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
```

- [x] **Step 4: Create AdminBrandController**

```php
<?php
// aroma-api/app/Http/Controllers/Api/Admin/AdminBrandController.php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\Request;

class AdminBrandController extends Controller
{
    public function index()
    {
        $brands = Brand::withCount('products')->orderBy('name')->get();
        return response()->json($brands->map(fn($b) => [
            'id' => $b->id,
            'name' => $b->name,
            'nameEn' => $b->name_en,
            'origin' => $b->origin,
            'tagline' => $b->tagline,
            'bg' => $b->bg,
            'productCount' => $b->products_count,
        ]));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string|unique:brands,id',
            'name' => 'required|string',
            'name_en' => 'nullable|string',
            'origin' => 'nullable|string',
            'tagline' => 'nullable|string',
            'bg' => 'required|string',
        ]);
        $brand = Brand::create($data);
        return response()->json(['id' => $brand->id], 201);
    }

    public function update(Request $request, string $id)
    {
        $brand = Brand::findOrFail($id);
        $data = $request->validate([
            'name' => 'sometimes|string',
            'name_en' => 'nullable|string',
            'origin' => 'nullable|string',
            'tagline' => 'nullable|string',
            'bg' => 'sometimes|string',
        ]);
        $brand->update($data);
        return response()->json(['id' => $brand->id]);
    }

    public function destroy(string $id)
    {
        Brand::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
```

- [x] **Step 5: Create AdminCategoryController**

```php
<?php
// aroma-api/app/Http/Controllers/Api/Admin/AdminCategoryController.php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;

class AdminCategoryController extends Controller
{
    public function index()
    {
        $cats = Category::withCount('products')->orderBy('label')->get();
        return response()->json($cats->map(fn($c) => [
            'id' => $c->id,
            'label' => $c->label,
            'bg' => $c->bg,
            'productCount' => $c->products_count,
        ]));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string|unique:categories,id',
            'label' => 'required|string',
            'bg' => 'required|string',
        ]);
        $cat = Category::create($data);
        return response()->json(['id' => $cat->id], 201);
    }

    public function update(Request $request, string $id)
    {
        $cat = Category::findOrFail($id);
        $data = $request->validate([
            'label' => 'sometimes|string',
            'bg' => 'sometimes|string',
        ]);
        $cat->update($data);
        return response()->json(['id' => $cat->id]);
    }

    public function destroy(string $id)
    {
        Category::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
```

- [x] **Step 6: Create AdminUserController**

```php
<?php
// aroma-api/app/Http/Controllers/Api/Admin/AdminUserController.php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::where('is_admin', false)
            ->withCount('orders')
            ->orderByDesc('created_at');

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%");
            });
        }

        $users = $query->paginate(20);

        return response()->json([
            'data' => $users->map(fn($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone,
                'orderCount' => $u->orders_count,
                'joinedAt' => $u->created_at->format('Y-m-d'),
            ]),
            'meta' => [
                'total' => $users->total(),
                'currentPage' => $users->currentPage(),
                'lastPage' => $users->lastPage(),
            ],
        ]);
    }
}
```

- [x] **Step 7: Add admin routes to api.php**

At the bottom of `aroma-api/routes/api.php`, add:

```php
use App\Http\Controllers\Api\Admin\{
    AdminDashboardController, AdminOrderController, AdminProductController,
    AdminBrandController, AdminCategoryController, AdminUserController
};

Route::middleware(['auth:sanctum', 'is_admin'])->prefix('admin')->group(function () {
    Route::get('/stats', [AdminDashboardController::class, 'stats']);

    Route::get('/orders', [AdminOrderController::class, 'index']);
    Route::get('/orders/{id}', [AdminOrderController::class, 'show']);
    Route::patch('/orders/{id}/status', [AdminOrderController::class, 'updateStatus']);
    Route::patch('/orders/{id}/note', [AdminOrderController::class, 'addAdminNote']);

    Route::get('/products', [AdminProductController::class, 'index']);
    Route::post('/products', [AdminProductController::class, 'store']);
    Route::put('/products/{id}', [AdminProductController::class, 'update']);
    Route::delete('/products/{id}', [AdminProductController::class, 'destroy']);

    Route::get('/brands', [AdminBrandController::class, 'index']);
    Route::post('/brands', [AdminBrandController::class, 'store']);
    Route::put('/brands/{id}', [AdminBrandController::class, 'update']);
    Route::delete('/brands/{id}', [AdminBrandController::class, 'destroy']);

    Route::get('/categories', [AdminCategoryController::class, 'index']);
    Route::post('/categories', [AdminCategoryController::class, 'store']);
    Route::put('/categories/{id}', [AdminCategoryController::class, 'update']);
    Route::delete('/categories/{id}', [AdminCategoryController::class, 'destroy']);

    Route::get('/users', [AdminUserController::class, 'index']);
});
```

- [x] **Step 8: Test all routes exist**

```bash
cd aroma-api && php artisan route:list --path=admin
```
Expected: 14 admin routes listed.

- [x] **Step 9: Commit**

```bash
cd aroma-api && git add app/Http/Controllers/Api/Admin/ routes/api.php
git commit -m "feat(admin): add admin API controllers and routes"
```

---

## Task 3: Frontend — Project Scaffold

**Files:**
- Create: `aroma-admin/package.json`
- Create: `aroma-admin/vite.config.ts`
- Create: `aroma-admin/tailwind.config.ts`
- Create: `aroma-admin/postcss.config.ts`
- Create: `aroma-admin/tsconfig.json`
- Create: `aroma-admin/index.html`
- Create: `aroma-admin/src/main.ts`
- Create: `aroma-admin/src/App.vue`

- [x] **Step 1: Scaffold the Vite+Vue project**

```bash
cd /Users/suhaib/web_projects/aroma-full-project
npm create vite@latest aroma-admin -- --template vue-ts
cd aroma-admin
npm install
npm install vue-router@4 pinia @vueuse/core axios lucide-vue-next zod dayjs
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

- [x] **Step 2: Configure tailwind.config.ts**

Replace contents of `aroma-admin/tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#d6bcb5',
          400: '#c9a0a0',
          500: '#b08080',
          600: '#8a5c5c',
          700: '#6e4040',
          800: '#5a3232',
          900: '#3d1f1f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [x] **Step 3: Update src/main.ts**

```ts
// aroma-admin/src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import './style.css'

createApp(App)
  .use(createPinia())
  .use(router)
  .mount('#app')
```

- [x] **Step 4: Create src/style.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

body {
  @apply bg-gray-50 text-gray-900 antialiased;
}
```

- [x] **Step 5: Create src/App.vue**

```vue
<template>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>
```

- [x] **Step 6: Verify it runs**

```bash
cd aroma-admin && npm run dev
```
Expected: Vite server starts on `http://localhost:5173` with no errors.

- [x] **Step 7: Commit**

```bash
cd aroma-admin && git add . && git commit -m "feat(admin): scaffold Vite+Vue+Tailwind project"
```

---

## Task 4: Frontend — API Client & Auth Store

**Files:**
- Create: `aroma-admin/src/api/client.ts`
- Create: `aroma-admin/src/api/admin.ts`
- Create: `aroma-admin/src/stores/auth.ts`

- [x] **Step 1: Create the Axios client**

```ts
// aroma-admin/src/api/client.ts
import axios from 'axios'

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  headers: { Accept: 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

- [x] **Step 2: Create admin.ts API functions**

```ts
// aroma-admin/src/api/admin.ts
import { client } from './client'

export interface AdminUser { id: number; name: string; email: string; is_admin: boolean }
export interface Stats {
  totalOrders: number; totalRevenue: number; totalProducts: number; totalUsers: number
  recentOrders: Array<{ id: string; user: string; total: string; status: string; date: string }>
}
export interface AdminOrder {
  id: string; user: string; userEmail: string; total: string; status: string
  isPickup: boolean; note: string; adminNote: string; date: string; itemCount: number
  items?: Array<{ name: string; brand: string; size: string; qty: number; unitPrice: string }>
  timeline?: Array<{ status: string; done: boolean; date: string | null }>
}
export interface PageMeta { total: number; currentPage: number; lastPage: number }
export interface AdminProduct {
  id: number; slug: string; name: string; nameEn: string | null
  brand: string; brandId: string; category: string; categoryId: string
  type: string; isNew: boolean; isBestseller: boolean; isOffer: boolean
  variantCount: number; price: string | null
}
export interface AdminBrand { id: string; name: string; nameEn: string | null; origin: string | null; tagline: string | null; bg: string; productCount: number }
export interface AdminCategory { id: string; label: string; bg: string; productCount: number }
export interface AdminUserRow { id: number; name: string; email: string; phone: string; orderCount: number; joinedAt: string }

// Auth
export const adminLogin = (email: string, password: string) =>
  client.post<{ user: AdminUser; token: string }>('/auth/login', { email, password })

// Dashboard
export const getStats = () => client.get<Stats>('/admin/stats')

// Orders
export const getOrders = (params?: { status?: string; page?: number }) =>
  client.get<{ data: AdminOrder[]; meta: PageMeta }>('/admin/orders', { params })
export const getOrder = (id: string) => client.get<AdminOrder>(`/admin/orders/${id}`)
export const updateOrderStatus = (id: string, status: string) =>
  client.patch<AdminOrder>(`/admin/orders/${id}/status`, { status })
export const addAdminNote = (id: string, admin_note: string) =>
  client.patch(`/admin/orders/${id}/note`, { admin_note })

// Products
export const getAdminProducts = (params?: { search?: string; brand_id?: string; page?: number }) =>
  client.get<{ data: AdminProduct[]; meta: PageMeta }>('/admin/products', { params })
export const createProduct = (data: Record<string, unknown>) =>
  client.post<{ id: number }>('/admin/products', data)
export const updateProduct = (id: number, data: Record<string, unknown>) =>
  client.put<{ id: number }>(`/admin/products/${id}`, data)
export const deleteProduct = (id: number) => client.delete(`/admin/products/${id}`)

// Brands
export const getAdminBrands = () => client.get<AdminBrand[]>('/admin/brands')
export const createBrand = (data: Record<string, unknown>) =>
  client.post<{ id: string }>('/admin/brands', data)
export const updateBrand = (id: string, data: Record<string, unknown>) =>
  client.put(`/admin/brands/${id}`, data)
export const deleteBrand = (id: string) => client.delete(`/admin/brands/${id}`)

// Categories
export const getAdminCategories = () => client.get<AdminCategory[]>('/admin/categories')
export const createCategory = (data: Record<string, unknown>) =>
  client.post<{ id: string }>('/admin/categories', data)
export const updateCategory = (id: string, data: Record<string, unknown>) =>
  client.put(`/admin/categories/${id}`, data)
export const deleteCategory = (id: string) => client.delete(`/admin/categories/${id}`)

// Users
export const getAdminUsers = (params?: { search?: string; page?: number }) =>
  client.get<{ data: AdminUserRow[]; meta: PageMeta }>('/admin/users', { params })
```

- [x] **Step 3: Create auth store**

```ts
// aroma-admin/src/stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { adminLogin, type AdminUser } from '../api/admin'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('admin_token'))
  const user = ref<AdminUser | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  async function login(email: string, password: string) {
    const res = await adminLogin(email, password)
    if (!res.data.user.is_admin) throw new Error('Not an admin account')
    token.value = res.data.token
    user.value = res.data.user
    localStorage.setItem('admin_token', res.data.token)
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('admin_token')
  }

  return { token, user, isAuthenticated, login, logout }
})
```

- [x] **Step 4: Commit**

```bash
cd aroma-admin && git add src/api/ src/stores/auth.ts
git commit -m "feat(admin): add API client and auth store"
```

---

## Task 5: Frontend — Router

**Files:**
- Create: `aroma-admin/src/router/index.ts`

- [x] **Step 1: Create router**

```ts
// aroma-admin/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/',
      component: () => import('../components/layout/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
        { path: 'orders', name: 'orders', component: () => import('../views/OrdersView.vue') },
        { path: 'orders/:id', name: 'order-detail', component: () => import('../views/OrderDetailView.vue') },
        { path: 'products', name: 'products', component: () => import('../views/ProductsView.vue') },
        { path: 'brands', name: 'brands', component: () => import('../views/BrandsView.vue') },
        { path: 'categories', name: 'categories', component: () => import('../views/CategoriesView.vue') },
        { path: 'users', name: 'users', component: () => import('../views/UsersView.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) return { name: 'login' }
  if (to.meta.requiresGuest && auth.isAuthenticated) return { name: 'dashboard' }
})
```

- [x] **Step 2: Commit**

```bash
cd aroma-admin && git add src/router/
git commit -m "feat(admin): add Vue Router with auth guards"
```

---

## Task 6: Frontend — UI Component Library

**Files:**
- Create: `aroma-admin/src/components/ui/BaseButton.vue`
- Create: `aroma-admin/src/components/ui/BaseInput.vue`
- Create: `aroma-admin/src/components/ui/BaseSelect.vue`
- Create: `aroma-admin/src/components/ui/BaseModal.vue`
- Create: `aroma-admin/src/components/ui/BaseBadge.vue`
- Create: `aroma-admin/src/components/ui/StatCard.vue`
- Create: `aroma-admin/src/components/ui/Pagination.vue`

- [x] **Step 1: Create BaseButton.vue**

```vue
<!-- aroma-admin/src/components/ui/BaseButton.vue -->
<template>
  <button
    :class="[
      'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
      variants[variant],
    ]"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }>(), { variant: 'primary' })

const variants = {
  primary: 'bg-primary-700 text-white hover:bg-primary-800 focus:ring-primary-500',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-primary-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-400',
}
</script>
```

- [x] **Step 2: Create BaseInput.vue**

```vue
<!-- aroma-admin/src/components/ui/BaseInput.vue -->
<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" :for="id" class="text-sm font-medium text-gray-700">{{ label }}</label>
    <input
      :id="id"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :class="[
        'rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500',
        error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
      ]"
      v-bind="$attrs"
    />
    <span v-if="error" class="text-xs text-red-600">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
defineProps<{ label?: string; modelValue?: string; error?: string }>()
defineEmits<{ 'update:modelValue': [v: string] }>()
const id = useId()
</script>
```

- [x] **Step 3: Create BaseSelect.vue**

```vue
<!-- aroma-admin/src/components/ui/BaseSelect.vue -->
<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" :for="id" class="text-sm font-medium text-gray-700">{{ label }}</label>
    <select
      :id="id"
      :value="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      v-bind="$attrs"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
    <span v-if="error" class="text-xs text-red-600">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
defineProps<{
  label?: string; modelValue?: string; error?: string; placeholder?: string
  options: Array<{ value: string; label: string }>
}>()
defineEmits<{ 'update:modelValue': [v: string] }>()
const id = useId()
</script>
```

- [x] **Step 4: Create BaseModal.vue**

```vue
<!-- aroma-admin/src/components/ui/BaseModal.vue -->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="$emit('close')" />
        <div class="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-xl">
          <div class="flex items-center justify-between border-b p-4">
            <h2 class="text-base font-semibold">{{ title }}</h2>
            <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div class="p-4"><slot /></div>
          <div v-if="$slots.footer" class="flex justify-end gap-2 border-t p-4">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ open: boolean; title: string }>()
defineEmits<{ close: [] }>()
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
```

- [x] **Step 5: Create BaseBadge.vue**

```vue
<!-- aroma-admin/src/components/ui/BaseBadge.vue -->
<template>
  <span :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', colorClass]">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ status: string }>()

const colorMap: Record<string, string> = {
  placed: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-indigo-100 text-indigo-700',
  preparing: 'bg-yellow-100 text-yellow-700',
  ready: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  'in-stock': 'bg-green-100 text-green-700',
  'low-stock': 'bg-yellow-100 text-yellow-700',
  'out-of-stock': 'bg-red-100 text-red-700',
}

const label = computed(() => props.status.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
const colorClass = computed(() => colorMap[props.status] ?? 'bg-gray-100 text-gray-700')
</script>
```

- [x] **Step 6: Create StatCard.vue**

```vue
<!-- aroma-admin/src/components/ui/StatCard.vue -->
<template>
  <div class="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
    <div class="flex items-center gap-3">
      <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
        <component :is="icon" :size="20" />
      </div>
      <div>
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">{{ label }}</p>
        <p class="text-2xl font-bold text-gray-900">{{ value }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
defineProps<{ label: string; value: string | number; icon: Component }>()
</script>
```

- [x] **Step 7: Create Pagination.vue**

```vue
<!-- aroma-admin/src/components/ui/Pagination.vue -->
<template>
  <div v-if="lastPage > 1" class="flex items-center justify-between pt-4 text-sm text-gray-600">
    <span>Page {{ currentPage }} of {{ lastPage }} ({{ total }} total)</span>
    <div class="flex gap-2">
      <button
        @click="$emit('change', currentPage - 1)"
        :disabled="currentPage <= 1"
        class="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >← Prev</button>
      <button
        @click="$emit('change', currentPage + 1)"
        :disabled="currentPage >= lastPage"
        class="rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >Next →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ currentPage: number; lastPage: number; total: number }>()
defineEmits<{ change: [page: number] }>()
</script>
```

- [x] **Step 8: Commit**

```bash
cd aroma-admin && git add src/components/ui/
git commit -m "feat(admin): add reusable UI component library"
```

---

## Task 7: Frontend — App Layout (Sidebar + Topbar)

**Files:**
- Create: `aroma-admin/src/components/layout/Sidebar.vue`
- Create: `aroma-admin/src/components/layout/Topbar.vue`
- Create: `aroma-admin/src/components/layout/AppLayout.vue`

- [x] **Step 1: Create Sidebar.vue**

```vue
<!-- aroma-admin/src/components/layout/Sidebar.vue -->
<template>
  <aside class="flex h-screen w-60 flex-col bg-white border-r border-gray-100 shadow-sm">
    <!-- Logo -->
    <div class="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
      <div class="h-8 w-8 rounded-lg bg-primary-700" />
      <span class="text-base font-bold tracking-wide text-gray-900">Aroma Admin</span>
    </div>
    <!-- Nav -->
    <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
        :class="isActive(item.to) ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
      >
        <component :is="item.icon" :size="17" />
        {{ item.label }}
      </RouterLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { LayoutDashboard, ShoppingBag, Package, Tag, Grid3X3, Users } from 'lucide-vue-next'

const route = useRoute()

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/brands', label: 'Brands', icon: Tag },
  { to: '/categories', label: 'Categories', icon: Grid3X3 },
  { to: '/users', label: 'Users', icon: Users },
]

const isActive = (path: string) => route.path.startsWith(path)
</script>
```

- [x] **Step 2: Create Topbar.vue**

```vue
<!-- aroma-admin/src/components/layout/Topbar.vue -->
<template>
  <header class="flex h-14 items-center justify-between border-b border-gray-100 bg-white px-6">
    <h1 class="text-sm font-semibold text-gray-800">{{ pageTitle }}</h1>
    <div class="flex items-center gap-3">
      <span class="text-sm text-gray-500">{{ auth.user?.name }}</span>
      <BaseButton variant="ghost" @click="handleLogout" class="text-xs py-1 px-3">Logout</BaseButton>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import BaseButton from '../ui/BaseButton.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const titles: Record<string, string> = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  'order-detail': 'Order Detail',
  products: 'Products',
  brands: 'Brands',
  categories: 'Categories',
  users: 'Users',
}

const pageTitle = computed(() => titles[route.name as string] ?? 'Admin')

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>
```

- [x] **Step 3: Create AppLayout.vue**

```vue
<!-- aroma-admin/src/components/layout/AppLayout.vue -->
<template>
  <div class="flex h-screen overflow-hidden">
    <Sidebar />
    <div class="flex flex-1 flex-col overflow-hidden">
      <Topbar />
      <main class="flex-1 overflow-y-auto p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import Sidebar from './Sidebar.vue'
import Topbar from './Topbar.vue'
</script>
```

- [x] **Step 4: Commit**

```bash
cd aroma-admin && git add src/components/layout/
git commit -m "feat(admin): add app layout with sidebar and topbar"
```

---

## Task 8: Frontend — Login View

**Files:**
- Create: `aroma-admin/src/views/LoginView.vue`

- [x] **Step 1: Create LoginView.vue**

```vue
<!-- aroma-admin/src/views/LoginView.vue -->
<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50">
    <div class="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md border border-gray-100">
      <div class="mb-6 text-center">
        <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-700">
          <Lock :size="22" class="text-white" />
        </div>
        <h1 class="text-xl font-bold text-gray-900">Aroma Admin</h1>
        <p class="mt-1 text-sm text-gray-500">Sign in to your admin account</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <BaseInput v-model="email" label="Email" type="email" placeholder="admin@aroma.ly" :error="errors.email" required />
        <BaseInput v-model="password" label="Password" type="password" placeholder="••••••••" :error="errors.password" required />
        <p v-if="errors.general" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ errors.general }}</p>
        <BaseButton type="submit" class="w-full justify-center" :disabled="loading">
          <span v-if="loading">Signing in…</span>
          <span v-else>Sign in</span>
        </BaseButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Lock } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import BaseInput from '../components/ui/BaseInput.vue'
import BaseButton from '../components/ui/BaseButton.vue'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errors = ref<Record<string, string>>({})

async function handleLogin() {
  errors.value = {}
  if (!email.value) { errors.value.email = 'Email is required'; return }
  if (!password.value) { errors.value.password = 'Password is required'; return }

  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push({ name: 'dashboard' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Login failed'
    errors.value.general = msg.includes('admin') ? msg : 'Invalid email or password'
  } finally {
    loading.value = false
  }
}
</script>
```

- [x] **Step 2: Test login manually**

Start both servers:
```bash
# Terminal 1
cd aroma-api && php artisan serve

# Terminal 2
cd aroma-admin && npm run dev
```
Open `http://localhost:5173/login`. Enter `admin@aroma.ly` / `password`. Expect redirect to `/dashboard`.

- [x] **Step 3: Commit**

```bash
cd aroma-admin && git add src/views/LoginView.vue
git commit -m "feat(admin): add login view"
```

---

## Task 9: Frontend — Dashboard View

**Files:**
- Create: `aroma-admin/src/views/DashboardView.vue`

- [x] **Step 1: Create DashboardView.vue**

```vue
<!-- aroma-admin/src/views/DashboardView.vue -->
<template>
  <div class="space-y-6">
    <!-- Stat cards -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Total Orders" :value="stats?.totalOrders ?? '—'" :icon="ShoppingBag" />
      <StatCard label="Revenue (LYD)" :value="stats ? Number(stats.totalRevenue).toFixed(0) : '—'" :icon="DollarSign" />
      <StatCard label="Products" :value="stats?.totalProducts ?? '—'" :icon="Package" />
      <StatCard label="Customers" :value="stats?.totalUsers ?? '—'" :icon="Users" />
    </div>

    <!-- Recent orders -->
    <div class="rounded-xl bg-white shadow-sm border border-gray-100">
      <div class="border-b border-gray-100 px-5 py-4">
        <h2 class="text-sm font-semibold text-gray-800">Recent Orders</h2>
      </div>
      <div v-if="loading" class="p-6 text-center text-sm text-gray-400">Loading…</div>
      <div v-else-if="!stats?.recentOrders?.length" class="p-6 text-center text-sm text-gray-400">No orders yet.</div>
      <table v-else class="w-full text-sm">
        <thead class="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
          <tr>
            <th class="px-5 py-3">Order ID</th>
            <th class="px-5 py-3">Customer</th>
            <th class="px-5 py-3">Total</th>
            <th class="px-5 py-3">Status</th>
            <th class="px-5 py-3">Date</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr
            v-for="order in stats.recentOrders"
            :key="order.id"
            @click="router.push({ name: 'order-detail', params: { id: order.id } })"
            class="cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <td class="px-5 py-3 font-mono text-xs text-gray-700">{{ order.id }}</td>
            <td class="px-5 py-3">{{ order.user }}</td>
            <td class="px-5 py-3">{{ Number(order.total).toFixed(2) }} LYD</td>
            <td class="px-5 py-3"><BaseBadge :status="order.status" /></td>
            <td class="px-5 py-3 text-gray-500">{{ order.date }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ShoppingBag, DollarSign, Package, Users } from 'lucide-vue-next'
import { getStats, type Stats } from '../api/admin'
import StatCard from '../components/ui/StatCard.vue'
import BaseBadge from '../components/ui/BaseBadge.vue'

const router = useRouter()
const stats = ref<Stats | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await getStats()
    stats.value = res.data
  } finally {
    loading.value = false
  }
})
</script>
```

- [x] **Step 2: Verify in browser**

Navigate to `/dashboard`. Expect 4 stat cards and a recent orders table.

- [x] **Step 3: Commit**

```bash
cd aroma-admin && git add src/views/DashboardView.vue
git commit -m "feat(admin): add dashboard view with stats and recent orders"
```

---

## Task 10: Frontend — Orders View & Order Detail View

**Files:**
- Create: `aroma-admin/src/views/OrdersView.vue`
- Create: `aroma-admin/src/views/OrderDetailView.vue`

- [x] **Step 1: Create OrdersView.vue**

```vue
<!-- aroma-admin/src/views/OrdersView.vue -->
<template>
  <div class="space-y-4">
    <!-- Filters -->
    <div class="flex items-center gap-3">
      <BaseSelect
        v-model="statusFilter"
        placeholder="All statuses"
        :options="statusOptions"
        class="w-48"
        @update:modelValue="fetchOrders(1)"
      />
    </div>

    <!-- Table -->
    <div class="rounded-xl bg-white shadow-sm border border-gray-100">
      <div v-if="loading" class="p-8 text-center text-sm text-gray-400">Loading…</div>
      <div v-else-if="!orders.length" class="p-8 text-center text-sm text-gray-400">No orders found.</div>
      <table v-else class="w-full text-sm">
        <thead class="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
          <tr>
            <th class="px-5 py-3">Order ID</th>
            <th class="px-5 py-3">Customer</th>
            <th class="px-5 py-3">Items</th>
            <th class="px-5 py-3">Total</th>
            <th class="px-5 py-3">Status</th>
            <th class="px-5 py-3">Date</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr
            v-for="order in orders"
            :key="order.id"
            @click="router.push({ name: 'order-detail', params: { id: order.id } })"
            class="cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <td class="px-5 py-3 font-mono text-xs text-gray-700">{{ order.id }}</td>
            <td class="px-5 py-3">{{ order.user }}</td>
            <td class="px-5 py-3 text-gray-500">{{ order.itemCount }}</td>
            <td class="px-5 py-3">{{ Number(order.total).toFixed(2) }} LYD</td>
            <td class="px-5 py-3"><BaseBadge :status="order.status" /></td>
            <td class="px-5 py-3 text-gray-500">{{ order.date }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <Pagination v-if="meta" :current-page="meta.currentPage" :last-page="meta.lastPage" :total="meta.total" @change="fetchOrders" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getOrders, type AdminOrder, type PageMeta } from '../api/admin'
import BaseBadge from '../components/ui/BaseBadge.vue'
import BaseSelect from '../components/ui/BaseSelect.vue'
import Pagination from '../components/ui/Pagination.vue'

const router = useRouter()
const orders = ref<AdminOrder[]>([])
const meta = ref<PageMeta | null>(null)
const loading = ref(true)
const statusFilter = ref('')

const statusOptions = [
  { value: 'placed', label: 'Placed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

async function fetchOrders(page = 1) {
  loading.value = true
  try {
    const params: Record<string, unknown> = { page }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await getOrders(params)
    orders.value = res.data.data
    meta.value = res.data.meta
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchOrders())
</script>
```

- [x] **Step 2: Create OrderDetailView.vue**

```vue
<!-- aroma-admin/src/views/OrderDetailView.vue -->
<template>
  <div v-if="loading" class="text-center text-sm text-gray-400 py-10">Loading…</div>
  <div v-else-if="order" class="space-y-5 max-w-3xl">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <p class="font-mono text-xs text-gray-500">{{ order.id }}</p>
        <h2 class="text-lg font-semibold">{{ order.user }} <span class="text-sm text-gray-400">({{ order.userEmail }})</span></h2>
      </div>
      <BaseBadge :status="order.status" />
    </div>

    <!-- Details card -->
    <div class="rounded-xl bg-white shadow-sm border border-gray-100 p-5 space-y-4">
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-gray-500">Date:</span> {{ order.date }}</div>
        <div><span class="text-gray-500">Delivery:</span> {{ order.isPickup ? 'Pickup' : 'Delivery' }}</div>
        <div><span class="text-gray-500">Total:</span> {{ Number(order.total).toFixed(2) }} LYD</div>
        <div><span class="text-gray-500">Customer note:</span> {{ order.note || '—' }}</div>
      </div>

      <!-- Items -->
      <table class="w-full text-sm border-t pt-3">
        <thead class="text-left text-xs text-gray-500 font-medium uppercase">
          <tr>
            <th class="py-2">Product</th><th class="py-2">Brand</th><th class="py-2">Size</th><th class="py-2">Qty</th><th class="py-2 text-right">Price</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="item in order.items" :key="`${item.name}-${item.size}`">
            <td class="py-2">{{ item.name }}</td>
            <td class="py-2 text-gray-500">{{ item.brand }}</td>
            <td class="py-2">{{ item.size }}ml</td>
            <td class="py-2">{{ item.qty }}</td>
            <td class="py-2 text-right">{{ Number(item.unitPrice).toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Timeline -->
    <div class="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
      <h3 class="text-sm font-semibold mb-3">Timeline</h3>
      <div class="flex flex-col gap-2">
        <div v-for="step in order.timeline" :key="step.status" class="flex items-center gap-3 text-sm">
          <div :class="['h-2.5 w-2.5 rounded-full', step.done ? 'bg-green-500' : 'bg-gray-200']" />
          <span :class="step.done ? 'text-gray-800 font-medium' : 'text-gray-400'">{{ step.status }}</span>
          <span v-if="step.date" class="ml-auto text-xs text-gray-400">{{ step.date }}</span>
        </div>
      </div>
    </div>

    <!-- Admin actions -->
    <div class="rounded-xl bg-white shadow-sm border border-gray-100 p-5 space-y-4">
      <h3 class="text-sm font-semibold">Admin Actions</h3>
      <div class="flex gap-3 flex-wrap">
        <BaseSelect v-model="newStatus" :options="statusOptions" placeholder="Update status…" class="w-48" />
        <BaseButton @click="handleStatusUpdate" :disabled="!newStatus || updating">Update Status</BaseButton>
      </div>
      <div class="flex gap-3">
        <BaseInput v-model="adminNote" placeholder="Add admin note…" class="flex-1" />
        <BaseButton variant="secondary" @click="handleAddNote" :disabled="!adminNote || updatingNote">Save Note</BaseButton>
      </div>
      <p v-if="order.adminNote" class="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
        <span class="font-medium">Admin note:</span> {{ order.adminNote }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getOrder, updateOrderStatus, addAdminNote, type AdminOrder } from '../api/admin'
import BaseBadge from '../components/ui/BaseBadge.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import BaseSelect from '../components/ui/BaseSelect.vue'

const route = useRoute()
const order = ref<AdminOrder | null>(null)
const loading = ref(true)
const newStatus = ref('')
const adminNote = ref('')
const updating = ref(false)
const updatingNote = ref(false)

const statusOptions = [
  { value: 'placed', label: 'Placed' }, { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' }, { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' }, { value: 'cancelled', label: 'Cancelled' },
]

onMounted(async () => {
  try {
    const res = await getOrder(route.params.id as string)
    order.value = res.data
    adminNote.value = order.value.adminNote ?? ''
  } finally {
    loading.value = false
  }
})

async function handleStatusUpdate() {
  if (!newStatus.value || !order.value) return
  updating.value = true
  try {
    const res = await updateOrderStatus(order.value.id, newStatus.value)
    order.value = res.data
    newStatus.value = ''
  } finally {
    updating.value = false
  }
}

async function handleAddNote() {
  if (!adminNote.value || !order.value) return
  updatingNote.value = true
  try {
    await addAdminNote(order.value.id, adminNote.value)
    if (order.value) order.value.adminNote = adminNote.value
  } finally {
    updatingNote.value = false
  }
}
</script>
```

- [x] **Step 3: Test in browser**

Navigate to `/orders`, click an order. Expect full detail, timeline, and ability to update status.

- [x] **Step 4: Commit**

```bash
cd aroma-admin && git add src/views/OrdersView.vue src/views/OrderDetailView.vue
git commit -m "feat(admin): add orders list and order detail views"
```

---

## Task 11: Frontend — Products View

**Files:**
- Create: `aroma-admin/src/views/ProductsView.vue`

- [x] **Step 1: Create ProductsView.vue**

```vue
<!-- aroma-admin/src/views/ProductsView.vue -->
<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-3">
      <BaseInput v-model="search" placeholder="Search products…" class="w-64" @input="debouncedFetch" />
      <BaseButton @click="openCreate">+ Add Product</BaseButton>
    </div>

    <!-- Table -->
    <div class="rounded-xl bg-white shadow-sm border border-gray-100">
      <div v-if="loading" class="p-8 text-center text-sm text-gray-400">Loading…</div>
      <table v-else class="w-full text-sm">
        <thead class="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
          <tr>
            <th class="px-5 py-3">Name</th><th class="px-5 py-3">Brand</th>
            <th class="px-5 py-3">Category</th><th class="px-5 py-3">Type</th>
            <th class="px-5 py-3">Price</th><th class="px-5 py-3">Flags</th>
            <th class="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="p in products" :key="p.id">
            <td class="px-5 py-3 font-medium">{{ p.name }}</td>
            <td class="px-5 py-3 text-gray-500">{{ p.brand }}</td>
            <td class="px-5 py-3 text-gray-500">{{ p.category }}</td>
            <td class="px-5 py-3"><BaseBadge :status="p.type.toLowerCase()" /></td>
            <td class="px-5 py-3">{{ p.price ? Number(p.price).toFixed(2) + ' LYD' : '—' }}</td>
            <td class="px-5 py-3 space-x-1">
              <span v-if="p.isNew" class="text-xs bg-blue-50 text-blue-600 rounded px-1.5 py-0.5">New</span>
              <span v-if="p.isBestseller" class="text-xs bg-amber-50 text-amber-600 rounded px-1.5 py-0.5">Best</span>
              <span v-if="p.isOffer" class="text-xs bg-green-50 text-green-600 rounded px-1.5 py-0.5">Offer</span>
            </td>
            <td class="px-5 py-3">
              <div class="flex gap-2 justify-end">
                <BaseButton variant="ghost" class="py-1 px-2 text-xs" @click="openEdit(p)">Edit</BaseButton>
                <BaseButton variant="danger" class="py-1 px-2 text-xs" @click="handleDelete(p.id)">Delete</BaseButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <Pagination v-if="meta" :current-page="meta.currentPage" :last-page="meta.lastPage" :total="meta.total" @change="fetchProducts" />

    <!-- Create/Edit Modal -->
    <BaseModal :open="modalOpen" :title="editingProduct ? 'Edit Product' : 'Add Product'" @close="modalOpen = false">
      <form @submit.prevent="handleSave" class="space-y-3">
        <BaseInput v-model="form.slug" label="Slug" required :disabled="!!editingProduct" />
        <BaseInput v-model="form.name" label="Name (Arabic)" required />
        <BaseInput v-model="form.name_en" label="Name (English)" />
        <BaseSelect v-model="form.type" label="Type" :options="typeOptions" required />
        <BaseInput v-model="form.placeholder_bg" label="Placeholder BG color" placeholder="#F2E8E5" required />
        <BaseInput v-model="form.placeholder_dot" label="Placeholder dot color" placeholder="#C9A0A0" required />
        <div class="flex gap-4 text-sm">
          <label class="flex items-center gap-2"><input type="checkbox" v-model="form.is_new" /> New</label>
          <label class="flex items-center gap-2"><input type="checkbox" v-model="form.is_bestseller" /> Bestseller</label>
          <label class="flex items-center gap-2"><input type="checkbox" v-model="form.is_offer" /> Offer</label>
        </div>
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="modalOpen = false">Cancel</BaseButton>
        <BaseButton @click="handleSave" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getAdminProducts, createProduct, updateProduct, deleteProduct, type AdminProduct, type PageMeta } from '../api/admin'
import BaseInput from '../components/ui/BaseInput.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseSelect from '../components/ui/BaseSelect.vue'
import BaseBadge from '../components/ui/BaseBadge.vue'
import BaseModal from '../components/ui/BaseModal.vue'
import Pagination from '../components/ui/Pagination.vue'

const products = ref<AdminProduct[]>([])
const meta = ref<PageMeta | null>(null)
const loading = ref(true)
const search = ref('')
const modalOpen = ref(false)
const editingProduct = ref<AdminProduct | null>(null)
const saving = ref(false)

const typeOptions = [
  { value: 'EDP', label: 'EDP' }, { value: 'EDT', label: 'EDT' },
  { value: 'Parfum', label: 'Parfum' }, { value: 'EDC', label: 'EDC' },
]

const emptyForm = () => ({ slug: '', name: '', name_en: '', type: '', placeholder_bg: '', placeholder_dot: '', is_new: false, is_bestseller: false, is_offer: false })
const form = ref(emptyForm())

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchProducts(1), 350)
}

async function fetchProducts(page = 1) {
  loading.value = true
  try {
    const res = await getAdminProducts({ search: search.value || undefined, page })
    products.value = res.data.data
    meta.value = res.data.meta
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingProduct.value = null
  form.value = emptyForm()
  modalOpen.value = true
}

function openEdit(p: AdminProduct) {
  editingProduct.value = p
  form.value = { slug: p.slug, name: p.name, name_en: p.nameEn ?? '', type: p.type, placeholder_bg: '', placeholder_dot: '', is_new: p.isNew, is_bestseller: p.isBestseller, is_offer: p.isOffer }
  modalOpen.value = true
}

async function handleSave() {
  saving.value = true
  try {
    if (editingProduct.value) {
      await updateProduct(editingProduct.value.id, form.value)
    } else {
      await createProduct(form.value)
    }
    modalOpen.value = false
    await fetchProducts()
  } finally {
    saving.value = false
  }
}

async function handleDelete(id: number) {
  if (!confirm('Delete this product?')) return
  await deleteProduct(id)
  await fetchProducts()
}

onMounted(() => fetchProducts())
</script>
```

- [x] **Step 2: Commit**

```bash
cd aroma-admin && git add src/views/ProductsView.vue
git commit -m "feat(admin): add products management view"
```

---

## Task 12: Frontend — Brands, Categories & Users Views

**Files:**
- Create: `aroma-admin/src/views/BrandsView.vue`
- Create: `aroma-admin/src/views/CategoriesView.vue`
- Create: `aroma-admin/src/views/UsersView.vue`

- [x] **Step 1: Create BrandsView.vue**

```vue
<!-- aroma-admin/src/views/BrandsView.vue -->
<template>
  <div class="space-y-4">
    <div class="flex justify-end">
      <BaseButton @click="openCreate">+ Add Brand</BaseButton>
    </div>
    <div class="rounded-xl bg-white shadow-sm border border-gray-100">
      <div v-if="loading" class="p-8 text-center text-sm text-gray-400">Loading…</div>
      <table v-else class="w-full text-sm">
        <thead class="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
          <tr>
            <th class="px-5 py-3">ID</th><th class="px-5 py-3">Name</th>
            <th class="px-5 py-3">Origin</th><th class="px-5 py-3">Products</th><th class="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="b in brands" :key="b.id">
            <td class="px-5 py-3 font-mono text-xs text-gray-500">{{ b.id }}</td>
            <td class="px-5 py-3 font-medium">{{ b.name }}</td>
            <td class="px-5 py-3 text-gray-500">{{ b.origin ?? '—' }}</td>
            <td class="px-5 py-3">{{ b.productCount }}</td>
            <td class="px-5 py-3">
              <div class="flex gap-2 justify-end">
                <BaseButton variant="ghost" class="py-1 px-2 text-xs" @click="openEdit(b)">Edit</BaseButton>
                <BaseButton variant="danger" class="py-1 px-2 text-xs" @click="handleDelete(b.id)">Delete</BaseButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseModal :open="modalOpen" :title="editing ? 'Edit Brand' : 'Add Brand'" @close="modalOpen = false">
      <form class="space-y-3">
        <BaseInput v-if="!editing" v-model="form.id" label="ID (slug)" required />
        <BaseInput v-model="form.name" label="Name (Arabic)" required />
        <BaseInput v-model="form.name_en" label="Name (English)" />
        <BaseInput v-model="form.origin" label="Origin country" />
        <BaseInput v-model="form.tagline" label="Tagline" />
        <BaseInput v-model="form.bg" label="Background color" placeholder="#F2E8E5" required />
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="modalOpen = false">Cancel</BaseButton>
        <BaseButton @click="handleSave" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getAdminBrands, createBrand, updateBrand, deleteBrand, type AdminBrand } from '../api/admin'
import BaseInput from '../components/ui/BaseInput.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseModal from '../components/ui/BaseModal.vue'

const brands = ref<AdminBrand[]>([])
const loading = ref(true)
const modalOpen = ref(false)
const editing = ref<AdminBrand | null>(null)
const saving = ref(false)
const form = ref({ id: '', name: '', name_en: '', origin: '', tagline: '', bg: '' })

onMounted(async () => {
  const res = await getAdminBrands()
  brands.value = res.data
  loading.value = false
})

function openCreate() { editing.value = null; form.value = { id: '', name: '', name_en: '', origin: '', tagline: '', bg: '' }; modalOpen.value = true }
function openEdit(b: AdminBrand) { editing.value = b; form.value = { id: b.id, name: b.name, name_en: b.nameEn ?? '', origin: b.origin ?? '', tagline: b.tagline ?? '', bg: b.bg }; modalOpen.value = true }

async function handleSave() {
  saving.value = true
  try {
    if (editing.value) await updateBrand(editing.value.id, form.value)
    else await createBrand(form.value)
    modalOpen.value = false
    const res = await getAdminBrands()
    brands.value = res.data
  } finally { saving.value = false }
}

async function handleDelete(id: string) {
  if (!confirm('Delete this brand? This will affect all its products.')) return
  await deleteBrand(id)
  brands.value = brands.value.filter(b => b.id !== id)
}
</script>
```

- [x] **Step 2: Create CategoriesView.vue**

```vue
<!-- aroma-admin/src/views/CategoriesView.vue -->
<template>
  <div class="space-y-4">
    <div class="flex justify-end">
      <BaseButton @click="openCreate">+ Add Category</BaseButton>
    </div>
    <div class="rounded-xl bg-white shadow-sm border border-gray-100">
      <div v-if="loading" class="p-8 text-center text-sm text-gray-400">Loading…</div>
      <table v-else class="w-full text-sm">
        <thead class="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
          <tr>
            <th class="px-5 py-3">ID</th><th class="px-5 py-3">Label</th><th class="px-5 py-3">Products</th><th class="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="c in categories" :key="c.id">
            <td class="px-5 py-3 font-mono text-xs text-gray-500">{{ c.id }}</td>
            <td class="px-5 py-3 font-medium">{{ c.label }}</td>
            <td class="px-5 py-3">{{ c.productCount }}</td>
            <td class="px-5 py-3">
              <div class="flex gap-2 justify-end">
                <BaseButton variant="ghost" class="py-1 px-2 text-xs" @click="openEdit(c)">Edit</BaseButton>
                <BaseButton variant="danger" class="py-1 px-2 text-xs" @click="handleDelete(c.id)">Delete</BaseButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseModal :open="modalOpen" :title="editing ? 'Edit Category' : 'Add Category'" @close="modalOpen = false">
      <form class="space-y-3">
        <BaseInput v-if="!editing" v-model="form.id" label="ID (slug)" required />
        <BaseInput v-model="form.label" label="Label" required />
        <BaseInput v-model="form.bg" label="Background color" placeholder="#F2E8E5" required />
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="modalOpen = false">Cancel</BaseButton>
        <BaseButton @click="handleSave" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getAdminCategories, createCategory, updateCategory, deleteCategory, type AdminCategory } from '../api/admin'
import BaseInput from '../components/ui/BaseInput.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseModal from '../components/ui/BaseModal.vue'

const categories = ref<AdminCategory[]>([])
const loading = ref(true)
const modalOpen = ref(false)
const editing = ref<AdminCategory | null>(null)
const saving = ref(false)
const form = ref({ id: '', label: '', bg: '' })

onMounted(async () => {
  const res = await getAdminCategories()
  categories.value = res.data
  loading.value = false
})

function openCreate() { editing.value = null; form.value = { id: '', label: '', bg: '' }; modalOpen.value = true }
function openEdit(c: AdminCategory) { editing.value = c; form.value = { id: c.id, label: c.label, bg: c.bg }; modalOpen.value = true }

async function handleSave() {
  saving.value = true
  try {
    if (editing.value) await updateCategory(editing.value.id, form.value)
    else await createCategory(form.value)
    modalOpen.value = false
    const res = await getAdminCategories()
    categories.value = res.data
  } finally { saving.value = false }
}

async function handleDelete(id: string) {
  if (!confirm('Delete this category?')) return
  await deleteCategory(id)
  categories.value = categories.value.filter(c => c.id !== id)
}
</script>
```

- [x] **Step 3: Create UsersView.vue**

```vue
<!-- aroma-admin/src/views/UsersView.vue -->
<template>
  <div class="space-y-4">
    <BaseInput v-model="search" placeholder="Search by name or email…" class="w-64" @input="debouncedFetch" />
    <div class="rounded-xl bg-white shadow-sm border border-gray-100">
      <div v-if="loading" class="p-8 text-center text-sm text-gray-400">Loading…</div>
      <table v-else class="w-full text-sm">
        <thead class="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
          <tr>
            <th class="px-5 py-3">Name</th><th class="px-5 py-3">Email</th>
            <th class="px-5 py-3">Phone</th><th class="px-5 py-3">Orders</th><th class="px-5 py-3">Joined</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="u in users" :key="u.id">
            <td class="px-5 py-3 font-medium">{{ u.name }}</td>
            <td class="px-5 py-3 text-gray-500">{{ u.email }}</td>
            <td class="px-5 py-3 text-gray-500">{{ u.phone }}</td>
            <td class="px-5 py-3">{{ u.orderCount }}</td>
            <td class="px-5 py-3 text-gray-500">{{ u.joinedAt }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <Pagination v-if="meta" :current-page="meta.currentPage" :last-page="meta.lastPage" :total="meta.total" @change="fetchUsers" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getAdminUsers, type AdminUserRow, type PageMeta } from '../api/admin'
import BaseInput from '../components/ui/BaseInput.vue'
import Pagination from '../components/ui/Pagination.vue'

const users = ref<AdminUserRow[]>([])
const meta = ref<PageMeta | null>(null)
const loading = ref(true)
const search = ref('')

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchUsers(1), 350)
}

async function fetchUsers(page = 1) {
  loading.value = true
  try {
    const res = await getAdminUsers({ search: search.value || undefined, page })
    users.value = res.data.data
    meta.value = res.data.meta
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchUsers())
</script>
```

- [x] **Step 4: Commit**

```bash
cd aroma-admin && git add src/views/BrandsView.vue src/views/CategoriesView.vue src/views/UsersView.vue
git commit -m "feat(admin): add brands, categories, and users views"
```

---

## Task 13: Backend — CORS & Final Wiring

**Files:**
- Modify: `aroma-api/config/cors.php` (or `.env`)

- [x] **Step 1: Allow the admin dev server origin in CORS**

In `aroma-api/.env`, ensure:
```
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:3000
```

In `aroma-api/config/cors.php`, ensure:
```php
'allowed_origins' => ['http://localhost:5173', 'http://localhost:3000'],
'supports_credentials' => true,
```

- [x] **Step 2: Create .env for aroma-admin**

```bash
# aroma-admin/.env
echo "VITE_API_URL=http://localhost:8000/api" > /Users/suhaib/web_projects/aroma-full-project/aroma-admin/.env
```

- [x] **Step 3: Full end-to-end smoke test**

Start servers:
```bash
# Terminal 1
cd aroma-api && php artisan serve

# Terminal 2
cd aroma-admin && npm run dev
```

Run through these flows manually:
1. Login with admin@aroma.ly / password → redirects to dashboard
2. Dashboard shows 4 stat cards and recent orders
3. Orders page loads with pagination and status filter
4. Click an order → detail view with timeline and admin actions
5. Update order status → badge updates
6. Products page loads, create/edit/delete work
7. Brands and categories CRUD work
8. Users page loads with search

- [x] **Step 4: Final commit**

```bash
cd aroma-admin && git add .env && git commit -m "chore(admin): add env config"
cd aroma-api && git add config/cors.php && git commit -m "chore(api): allow admin dev origin in CORS"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Admin authentication (login with is_admin guard)
- ✅ Dashboard stats (orders, revenue, products, users counts + recent orders)
- ✅ Orders list (paginated, status filter)
- ✅ Order detail (items, timeline, status update, admin note)
- ✅ Products CRUD (list, create, update, delete with search)
- ✅ Brands CRUD
- ✅ Categories CRUD
- ✅ Users list (read-only, search, pagination)
- ✅ Backend middleware (is_admin gate on all /admin/* routes)
- ✅ Vue Router auth guards (redirect to login if unauthenticated)
- ✅ CORS wiring

**Placeholder scan:** No TBD/TODO/similar-to patterns found.

**Type consistency:**
- `AdminOrder` type matches fields returned by `AdminOrderController::formatOrder()`
- `AdminProduct`, `AdminBrand`, `AdminCategory`, `AdminUserRow` match controller response shapes
- `PageMeta` fields (`total`, `currentPage`, `lastPage`) match backend `paginate()` response keys
- `updateOrderStatus` calls `PATCH /admin/orders/{id}/status` — matches route
- `addAdminNote` calls `PATCH /admin/orders/{id}/note` — matches route
