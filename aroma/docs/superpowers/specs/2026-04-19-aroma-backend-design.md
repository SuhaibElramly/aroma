# Aroma — Laravel Back-end Design Spec
**Date:** 2026-04-19
**Status:** Approved — ready for implementation

---

## Context

Aroma is a fully-built Next.js 15 luxury perfume storefront. All data is currently served from an in-memory mock layer (`src/mocks/services.ts` + `src/mocks/data.ts`). The mock file contains an explicit comment: *"swap these implementations with real fetch() calls when a backend is available."*

The goal is to build a standalone Laravel 11 REST API that replaces the mock layer with zero frontend refactoring — controllers, query keys, and React Query hooks stay untouched. Only `services.ts` changes (mock returns → `fetch()` calls).

---

## Decisions

| Decision | Choice |
|----------|--------|
| Framework | Laravel 11 |
| Database | SQLite (dev) |
| Auth | Laravel Sanctum — API tokens |
| Admin panel | None (API only) |
| DB enums | PHP-backed enums, `string` columns in DB |
| Product model | Base product + variants (size/price/stock) |
| JSON fields | Fully normalised (`product_notes`, `product_tags`) |
| Cart / Wishlist | Server-side, user-scoped DB tables |
| Order items | Variant FK (nullable) + denormalised snapshot fields |
| Integration | Drop-in replace `services.ts` |

---

## Project Location

```
aroma-full-project/
├── aroma/          ← existing Next.js frontend (untouched)
└── aroma-api/      ← new Laravel 11 project
```

---

## Directory Structure

```
aroma-api/
├── app/
│   ├── Enums/
│   │   ├── ProductType.php        ← EDP | EDT | Parfum | EDC
│   │   ├── NoteType.php           ← top | heart | base
│   │   ├── StockStatus.php        ← in_stock | low_stock | out_of_stock
│   │   └── OrderStatus.php        ← placed | confirmed | preparing | ready | delivered | cancelled
│   │
│   ├── Http/
│   │   ├── Controllers/Api/
│   │   │   ├── AuthController.php
│   │   │   ├── ProductController.php
│   │   │   ├── BrandController.php
│   │   │   ├── CategoryController.php
│   │   │   ├── OrderController.php
│   │   │   ├── AddressController.php
│   │   │   ├── CartController.php
│   │   │   ├── WishlistController.php
│   │   │   └── HomeController.php
│   │   │
│   │   ├── Requests/
│   │   │   ├── Auth/
│   │   │   │   ├── LoginRequest.php
│   │   │   │   └── RegisterRequest.php
│   │   │   ├── Order/
│   │   │   │   └── CreateOrderRequest.php
│   │   │   ├── Address/
│   │   │   │   └── AddressRequest.php
│   │   │   ├── Profile/
│   │   │   │   ├── UpdateProfileRequest.php
│   │   │   │   └── ChangePasswordRequest.php
│   │   │   └── Product/
│   │   │       └── ProductFilterRequest.php
│   │   │
│   │   └── Resources/
│   │       ├── UserResource.php
│   │       ├── ProductResource.php
│   │       ├── ProductCollection.php
│   │       ├── BrandResource.php
│   │       ├── CategoryResource.php
│   │       ├── OrderResource.php
│   │       ├── OrderItemResource.php
│   │       └── AddressResource.php
│   │
│   ├── Services/
│   │   ├── AuthService.php        ← register, login, password change
│   │   ├── ProductService.php     ← search, filtering, sorting, similar
│   │   ├── OrderService.php       ← create order, cancel, timeline management
│   │   ├── AddressService.php     ← default address management
│   │   └── HomeService.php        ← aggregates featured/bestsellers/new/offers
│   │
│   └── Models/
│       ├── User.php
│       ├── Product.php
│       ├── ProductVariant.php
│       ├── ProductNote.php
│       ├── ProductTag.php
│       ├── Brand.php
│       ├── Category.php
│       ├── Order.php
│       ├── OrderItem.php
│       ├── OrderTimeline.php
│       ├── Address.php
│       ├── CartItem.php
│       └── WishlistItem.php
│
├── database/
│   ├── migrations/
│   └── seeders/
│       ├── DatabaseSeeder.php
│       ├── BrandSeeder.php
│       ├── CategorySeeder.php
│       └── ProductSeeder.php      ← seeds from mock data
│
├── routes/
│   └── api.php
│
└── .env                           ← DB_CONNECTION=sqlite
```

---

## Database Schema

### `brands`
| Column | Type | Notes |
|--------|------|-------|
| id | string PK | slug e.g. `maison-elara` |
| name | string | |
| origin | string | |
| tagline | string | |
| bg | string | hex colour |
| timestamps | | |

### `categories`
| Column | Type | Notes |
|--------|------|-------|
| id | string PK | slug e.g. `women`, `oud` |
| label | string | display name |
| bg | string | hex colour |
| timestamps | | |

### `products`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| slug | string unique | |
| brand_id | string FK → brands | |
| category_id | string FK → categories | |
| name | string | |
| description | text | |
| type | string | cast → `ProductType` enum |
| rating | decimal(3,2) | |
| reviews_count | integer | default 0 |
| is_new | boolean | default false |
| is_bestseller | boolean | default false |
| is_offer | boolean | default false |
| placeholder_bg | string | |
| placeholder_dot | string | |
| timestamps | | |

### `product_variants`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| product_id | bigint FK → products | |
| size | string | e.g. `30ml`, `50ml` |
| price | decimal(10,2) | |
| original_price | decimal(10,2) nullable | |
| stock | string | cast → `StockStatus` enum |
| timestamps | | |

### `product_notes`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| product_id | bigint FK → products | |
| type | string | cast → `NoteType` enum (top / heart / base) |
| note | string | e.g. `Bergamot`, `Damascus Rose` |

### `product_tags`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| product_id | bigint FK → products | |
| tag | string | e.g. `Floral`, `Woody` |

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| name | string | |
| email | string unique | |
| password | string | hashed |
| phone | string nullable | |
| email_verified_at | timestamp nullable | |
| remember_token | string nullable | |
| timestamps | | |

### `addresses`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| user_id | bigint FK → users | |
| label | string | Home / Work / Other |
| name | string | |
| phone | string | |
| street | string | |
| city | string | |
| country | string | |
| is_default | boolean | default false |
| timestamps | | |

### `orders`
| Column | Type | Notes |
|--------|------|-------|
| id | string PK | `ARM-xxxx-xxxx` |
| user_id | bigint FK → users | |
| status | string | cast → `OrderStatus` enum |
| total | decimal(10,2) | |
| note | text nullable | customer note |
| admin_note | text nullable | internal note |
| is_pickup | boolean | delivery vs pickup |
| placeholder_bg | string | |
| placeholder_dot | string | |
| timestamps | | |

### `order_items`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| order_id | string FK → orders | |
| product_variant_id | bigint FK nullable (SET NULL) | |
| product_name | string | snapshot at checkout |
| brand | string | snapshot |
| size | string | snapshot |
| qty | integer | |
| unit_price | decimal(10,2) | price at time of purchase |

### `order_timeline`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| order_id | string FK → orders | |
| status | string | e.g. `Order Placed` |
| occurred_at | datetime nullable | |
| done | boolean | default false |
| sort_order | integer | display order |

### `cart_items`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| user_id | bigint FK → users | |
| product_variant_id | bigint FK → product_variants | |
| quantity | integer | |
| timestamps | | |

### `wishlist_items`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| user_id | bigint FK → users | |
| product_id | bigint FK → products | |
| timestamps | | unique(user_id, product_id) |

### `personal_access_tokens`
Auto-created by Sanctum. No manual migration needed.

---

## PHP Enums

All are PHP-backed string enums. DB columns are plain `string`. Models cast via `$casts`.

```php
// app/Enums/ProductType.php
enum ProductType: string {
    case EDP    = 'EDP';
    case EDT    = 'EDT';
    case Parfum = 'Parfum';
    case EDC    = 'EDC';
}

// app/Enums/StockStatus.php
enum StockStatus: string {
    case InStock    = 'in_stock';
    case LowStock   = 'low_stock';
    case OutOfStock = 'out_of_stock';
}

// app/Enums/NoteType.php
enum NoteType: string {
    case Top   = 'top';
    case Heart = 'heart';
    case Base  = 'base';
}

// app/Enums/OrderStatus.php
enum OrderStatus: string {
    case Placed    = 'placed';
    case Confirmed = 'confirmed';
    case Preparing = 'preparing';
    case Ready     = 'ready';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';
}
```

---

## API Endpoints

All routes prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### Public

| Method | Endpoint | Controller@method |
|--------|----------|-------------------|
| POST | `/auth/register` | `AuthController@register` |
| POST | `/auth/login` | `AuthController@login` |
| GET | `/home` | `HomeController@index` |
| GET | `/brands` | `BrandController@index` |
| GET | `/categories` | `CategoryController@index` |
| GET | `/products` | `ProductController@index` |
| GET | `/products/{slug}` | `ProductController@show` |
| GET | `/products/{id}/similar` | `ProductController@similar` |

### Protected (`auth:sanctum`)

| Method | Endpoint | Controller@method |
|--------|----------|-------------------|
| POST | `/auth/logout` | `AuthController@logout` |
| GET | `/user` | `AuthController@me` |
| PATCH | `/user` | `AuthController@update` |
| PATCH | `/user/password` | `AuthController@changePassword` |
| GET | `/orders` | `OrderController@index` |
| POST | `/orders` | `OrderController@store` |
| GET | `/orders/{id}` | `OrderController@show` |
| PATCH | `/orders/{id}/cancel` | `OrderController@cancel` |
| GET | `/addresses` | `AddressController@index` |
| POST | `/addresses` | `AddressController@store` |
| PUT | `/addresses/{id}` | `AddressController@update` |
| DELETE | `/addresses/{id}` | `AddressController@destroy` |
| GET | `/cart` | `CartController@index` |
| POST | `/cart` | `CartController@store` |
| PATCH | `/cart/{id}` | `CartController@update` |
| DELETE | `/cart/{id}` | `CartController@destroy` |
| GET | `/wishlist` | `WishlistController@index` |
| POST | `/wishlist` | `WishlistController@store` |
| DELETE | `/wishlist/{productId}` | `WishlistController@destroy` |

### `GET /products` query parameters

```
?query=        full-text search (name, brand, notes, tags)
&category=     category slug (FK)
&brand=        brand slug (FK)
&type=         EDP | EDT | Parfum | EDC
&special=      new | offer | bestseller
&min_price=
&max_price=
&sort=         featured | newest | price_asc | price_desc | rating
```

---

## Auth Flow

1. **Register** → `RegisterRequest` validates → `AuthService@register` hashes password, creates user → returns `UserResource` + plain-text Sanctum token
2. **Login** → `LoginRequest` validates → `AuthService@login` calls `Auth::attempt()`, 401 on failure → deletes old tokens, issues fresh token → returns `UserResource` + token
3. **Authenticated requests** → `Authorization: Bearer <token>` header → `auth:sanctum` middleware resolves `$request->user()`
4. **Logout** → deletes current access token → `204 No Content`

Token stored in the existing Zustand `aroma-auth` persisted store on the frontend.

---

## Service Responsibilities

| Service | Responsibilities |
|---------|-----------------|
| `AuthService` | Hash password, create user, attempt login, change password |
| `ProductService` | Build filtered/sorted query, eager-load variants/notes/tags, similar products logic |
| `OrderService` | Generate order ID (`ARM-xxxx`), create items from variants, build initial 5-step timeline, cancel logic |
| `AddressService` | Enforce single default (unset others when `is_default = true`) |
| `HomeService` | Single aggregation — featured brand + products, bestsellers, new arrivals, offers, categories, brands |

---

## Error Responses

All errors return a consistent JSON shape:

```json
{ "message": "Human-readable string", "errors": { "field": ["detail"] } }
```

| Scenario | HTTP |
|----------|------|
| Validation failure | 422 (FormRequest auto) |
| Wrong credentials | 401 |
| Unauthenticated | 401 (Sanctum) |
| Not found | 404 |
| Cancel non-placed order | 422 |
| Duplicate email on register | 422 (unique rule) |
| Server error | 500 |

---

## Frontend Integration

Only `src/mocks/services.ts` needs to change. Every function becomes a `fetch()` call:

```ts
// Before
export async function getBrands(): Promise<Brand[]> {
  await delay(MOCK_DELAY)
  return BRANDS
}

// After
export async function getBrands(): Promise<Brand[]> {
  const res = await fetch(`${API_URL}/api/brands`)
  if (!res.ok) throw new Error('Failed to fetch brands')
  return res.json()
}

// Protected example
export async function getOrders(): Promise<Order[]> {
  const token = useAuthStore.getState().token
  const res = await fetch(`${API_URL}/api/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch orders')
  return res.json()
}
```

All React Query hooks, query keys, Zustand stores, and components remain **unchanged**.

---

## Seeders

Seed data mirrors `src/mocks/data.ts`:

- `BrandSeeder` — 8 brands
- `CategorySeeder` — 6 categories
- `ProductSeeder` — 12 products with full variants, notes, and tags

---

## Implementation Order

1. `laravel new aroma-api` — scaffold project
2. Configure `.env` → SQLite, CORS origins, Sanctum
3. Create all migrations in dependency order (brands → categories → products → variants → notes → tags → users → addresses → orders → order_items → order_timeline → cart_items → wishlist_items)
4. Create PHP enums (`app/Enums/`)
5. Create models with casts, relationships, and `$fillable`
6. Write and run seeders
7. Implement public endpoints (brands, categories, products, home)
8. Implement auth (register, login, logout, me, update, change password)
9. Implement orders (index, store, show, cancel)
10. Implement addresses (CRUD)
11. Implement cart (index, store, update, destroy)
12. Implement wishlist (index, store, destroy)
13. Update `src/mocks/services.ts` → real `fetch()` calls
