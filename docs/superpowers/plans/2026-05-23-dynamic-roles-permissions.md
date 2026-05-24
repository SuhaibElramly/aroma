# Dynamic Roles & Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the hardcoded `ROLE_PERMS` constant with a database-backed roles system so owners can create, edit, and delete roles with custom permission matrices from the admin dashboard.

**Architecture:** A new `roles` table stores role definitions (name, slug, color, permissions JSON). The frontend auth store loads roles from `GET /admin/roles` during `init()` and builds a reactive `rolePermsMap` computed from them, replacing the hardcoded constant. `AdminsView` gets a full inline-edit UI for the roles tab.

**Tech Stack:** Laravel 11 + Eloquent, Vue 3 + Pinia, Axios via custom `client`

---

## File Map

| File | Change |
|------|--------|
| `aroma-api/database/migrations/2026_05_23_000001_create_roles_table.php` | NEW — create table, seed 6 roles |
| `aroma-api/app/Models/Role.php` | NEW — Eloquent model |
| `aroma-api/app/Http/Controllers/Api/Admin/AdminRolesController.php` | NEW — index/store/update/destroy |
| `aroma-api/routes/api.php` | MODIFY — add 4 role routes |
| `aroma-api/app/Http/Controllers/Api/Admin/AdminAdminsController.php` | MODIFY — Rule::in from DB |
| `aroma-admin/src/types/index.ts` | MODIFY — add AdminRole interface |
| `aroma-admin/src/api/admin.ts` | MODIFY — add 4 role API functions |
| `aroma-admin/src/stores/auth.ts` | MODIFY — remove hardcoded ROLE_PERMS, load roles from API |
| `aroma-admin/src/views/AdminsView.vue` | MODIFY — full roles tab rewrite with edit/create/delete UI |

---

## Task 1: Migration + Role Model

**Files:**
- Create: `aroma-api/database/migrations/2026_05_23_000001_create_roles_table.php`
- Create: `aroma-api/app/Models/Role.php`

- [x] **Step 1: Create the migration file**

```php
<?php
// aroma-api/database/migrations/2026_05_23_000001_create_roles_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60);
            $table->string('slug', 80)->unique();
            $table->string('color', 100);
            $table->json('permissions');
            $table->timestamps();
        });

        DB::table('roles')->insert([
            [
                'name'        => 'Owner',
                'slug'        => 'owner',
                'color'       => 'oklch(26% 0.04 250)',
                'permissions' => json_encode(['products'=>[1,1,1],'orders'=>[1,1,1],'coupons'=>[1,1,1],'customers'=>[1,1,1],'brands'=>[1,1,1],'specs'=>[1,1,1],'admins'=>[1,1,1]]),
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'name'        => 'Admin',
                'slug'        => 'admin',
                'color'       => 'oklch(46% 0.075 210)',
                'permissions' => json_encode(['products'=>[1,1,1],'orders'=>[1,1,1],'coupons'=>[1,1,1],'customers'=>[1,1,0],'brands'=>[1,1,1],'specs'=>[1,1,1],'admins'=>[1,0,0]]),
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'name'        => 'Catalog Manager',
                'slug'        => 'catalog_manager',
                'color'       => 'oklch(56% 0.10 340)',
                'permissions' => json_encode(['products'=>[1,1,1],'orders'=>[1,0,0],'coupons'=>[1,1,0],'customers'=>[1,0,0],'brands'=>[1,1,1],'specs'=>[1,1,1],'admins'=>[0,0,0]]),
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'name'        => 'Sales',
                'slug'        => 'sales',
                'color'       => 'oklch(58% 0.10 32)',
                'permissions' => json_encode(['products'=>[1,0,0],'orders'=>[1,1,0],'coupons'=>[1,0,0],'customers'=>[1,1,0],'brands'=>[1,0,0],'specs'=>[1,0,0],'admins'=>[0,0,0]]),
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'name'        => 'Support',
                'slug'        => 'support',
                'color'       => 'oklch(52% 0.045 145)',
                'permissions' => json_encode(['products'=>[1,0,0],'orders'=>[1,1,0],'coupons'=>[1,0,0],'customers'=>[1,1,0],'brands'=>[1,0,0],'specs'=>[1,0,0],'admins'=>[0,0,0]]),
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'name'        => 'Read Only',
                'slug'        => 'read_only',
                'color'       => 'oklch(56% 0.035 240)',
                'permissions' => json_encode(['products'=>[1,0,0],'orders'=>[1,0,0],'coupons'=>[1,0,0],'customers'=>[1,0,0],'brands'=>[1,0,0],'specs'=>[1,0,0],'admins'=>[0,0,0]]),
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
```

- [x] **Step 2: Create the Role Eloquent model**

```php
<?php
// aroma-api/app/Models/Role.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $fillable = ['name', 'slug', 'color', 'permissions'];

    protected $casts = ['permissions' => 'array'];
}
```

- [x] **Step 3: Run the migration**

```bash
cd aroma-api && php artisan migrate
```

Expected output contains: `Running migrations... 2026_05_23_000001_create_roles_table .... DONE`

- [x] **Step 4: Verify the seed data**

```bash
cd aroma-api && php artisan tinker --execute="echo App\Models\Role::count() . ' roles';"
```

Expected: `6 roles`

- [x] **Step 5: Commit**

```bash
git add aroma-api/database/migrations/2026_05_23_000001_create_roles_table.php aroma-api/app/Models/Role.php
git commit -m "feat(roles): create roles table and seed 6 default roles"
```

---

## Task 2: AdminRolesController + Routes

**Files:**
- Create: `aroma-api/app/Http/Controllers/Api/Admin/AdminRolesController.php`
- Modify: `aroma-api/routes/api.php`

- [x] **Step 1: Create the controller**

```php
<?php
// aroma-api/app/Http/Controllers/Api/Admin/AdminRolesController.php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminRolesController extends Controller
{
    public function index()
    {
        return response()->json(Role::orderBy('id')->get(['id', 'name', 'slug', 'color', 'permissions']));
    }

    public function store(Request $request)
    {
        if ($request->user()->role !== 'owner') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'name'        => 'required|string|max:60',
            'color'       => 'required|string|max:100',
            'permissions' => 'required|array',
        ]);

        $slug = Str::slug($data['name']);
        $base = $slug;
        $i    = 2;
        while (Role::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $i++;
        }

        $role = Role::create([
            'name'        => $data['name'],
            'slug'        => $slug,
            'color'       => $data['color'],
            'permissions' => $data['permissions'],
        ]);

        return response()->json($role, 201);
    }

    public function update(Request $request, string $slug)
    {
        if ($request->user()->role !== 'owner') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $role = Role::where('slug', $slug)->firstOrFail();

        $data = $request->validate([
            'name'        => 'sometimes|string|max:60',
            'color'       => 'sometimes|string|max:100',
            'permissions' => 'sometimes|array',
        ]);

        $role->update($data);

        return response()->json($role);
    }

    public function destroy(Request $request, string $slug)
    {
        if ($request->user()->role !== 'owner') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $role  = Role::where('slug', $slug)->firstOrFail();
        $count = User::where('is_admin', true)->where('role', $slug)->count();

        if ($count > 0) {
            return response()->json(
                ['message' => "This role has {$count} member(s). Reassign them before deleting."],
                422
            );
        }

        $role->delete();

        return response()->json(null, 204);
    }
}
```

- [x] **Step 2: Add the 4 routes to `api.php`**

In `aroma-api/routes/api.php`, add `AdminRolesController` to the existing `use` import at the top of the admin section:

```php
use App\Http\Controllers\Api\Admin\{
    AdminDashboardController, AdminOrderController, AdminProductController,
    AdminBrandController, AdminCategoryController, AdminUserController,
    AdminProductVariantController, AdminProductImageController,
    AdminUserDetailController, AdminCouponController, AdminSpecTypeController,
    AdminProductSpecController, AdminProductVariantGenerateController,
    AdminAdminsController, AdminRolesController,
};
```

Then inside the `Route::middleware(['auth:sanctum', 'is_admin'])->prefix('admin')->group(...)` block, add after the admins routes:

```php
    Route::get('/roles',          [AdminRolesController::class, 'index']);
    Route::post('/roles',         [AdminRolesController::class, 'store']);
    Route::put('/roles/{slug}',   [AdminRolesController::class, 'update']);
    Route::delete('/roles/{slug}',[AdminRolesController::class, 'destroy']);
```

- [x] **Step 3: Verify the routes are registered**

```bash
cd aroma-api && php artisan route:list --path=admin/roles
```

Expected output: 4 rows — GET, POST, PUT, DELETE for `/api/admin/roles` and `/api/admin/roles/{slug}`.

- [x] **Step 4: Test the GET endpoint manually**

```bash
# Get a token first (replace with real credentials)
TOKEN=$(cd aroma-api && php artisan tinker --execute="
  \$u = \App\Models\User::where('role','owner')->first();
  echo \$u->tokens()->create(['name'=>'test'])->plainTextToken;
")
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/admin/roles | python3 -m json.tool | head -20
```

Expected: JSON array of 6 role objects with id, name, slug, color, permissions.

- [x] **Step 5: Commit**

```bash
git add aroma-api/app/Http/Controllers/Api/Admin/AdminRolesController.php aroma-api/routes/api.php
git commit -m "feat(roles): add AdminRolesController with CRUD endpoints"
```

---

## Task 3: Update AdminAdminsController Role Validation

**Files:**
- Modify: `aroma-api/app/Http/Controllers/Api/Admin/AdminAdminsController.php`

Currently `store()` and `update()` use hardcoded `Rule::in([...])`. Replace with dynamic lookup from the `roles` table.

- [x] **Step 1: Add `Role` import to the controller**

In `aroma-api/app/Http/Controllers/Api/Admin/AdminAdminsController.php`, add to the `use` block at the top:

```php
use App\Models\Role;
```

- [x] **Step 2: Replace hardcoded role slugs in `store()`**

Find the `store()` method validation. Replace:

```php
            'role'     => ['required', Rule::in(array_merge(
                ['admin', 'catalog_manager', 'sales', 'support', 'read_only'],
                $isOwner ? ['owner'] : []
            ))],
```

With:

```php
            'role'     => ['required', Rule::in(
                $isOwner
                    ? Role::pluck('slug')->toArray()
                    : Role::where('slug', '!=', 'owner')->pluck('slug')->toArray()
            )],
```

- [x] **Step 3: Replace hardcoded role slugs in `update()`**

Find the `update()` method validation. Replace:

```php
            'role' => ['sometimes', Rule::in(['admin', 'catalog_manager', 'sales', 'support', 'read_only'])],
```

With:

```php
            'role' => ['sometimes', Rule::in(Role::where('slug', '!=', 'owner')->pluck('slug')->toArray())],
```

- [x] **Step 4: Verify the file looks correct**

```bash
grep -n "Role::pluck\|Rule::in" aroma-api/app/Http/Controllers/Api/Admin/AdminAdminsController.php
```

Expected: 2 lines with `Role::pluck` (or `Role::where`) and `Rule::in`.

- [x] **Step 5: Commit**

```bash
git add aroma-api/app/Http/Controllers/Api/Admin/AdminAdminsController.php
git commit -m "feat(roles): validate admin role assignment against DB roles table"
```

---

## Task 4: Frontend AdminRole Type + API Functions

**Files:**
- Modify: `aroma-admin/src/types/index.ts`
- Modify: `aroma-admin/src/api/admin.ts`

- [x] **Step 1: Add `AdminRole` interface to types**

In `aroma-admin/src/types/index.ts`, add after the `AdminMember` interface (after line 35):

```typescript
export interface AdminRole {
  id:          number
  name:        string
  slug:        string
  color:       string
  permissions: Record<string, number[]>
}
```

- [x] **Step 2: Add the 4 role API functions to `admin.ts`**

In `aroma-admin/src/api/admin.ts`, add `AdminRole` to the import at the top:

```typescript
import type {
  AdminUser, DashboardStats, AdminOrder, AdminProduct,
  AdminBrand, AdminCategory, AdminUserRow, PageMeta, ProductVariant, ProductImage,
  AdminCartItem, AdminWishlistProduct, ProductType, AdminCoupon, CouponOrder,
  SpecType, ProductSpec, AdminUserOrder, AdminMember, AdminRole,
} from '../types'
```

Then at the bottom of the file, add after the admin team management section:

```typescript
// ── Roles ─────────────────────────────────────────────────────────────
export const apiGetRoles = () =>
  client.get<AdminRole[]>('/admin/roles')

export const apiCreateRole = (data: {
  name:        string
  color:       string
  permissions: Record<string, number[]>
}) =>
  client.post<AdminRole>('/admin/roles', data)

export const apiUpdateRole = (slug: string, data: Partial<{
  name:        string
  color:       string
  permissions: Record<string, number[]>
}>) =>
  client.put<AdminRole>(`/admin/roles/${slug}`, data)

export const apiDeleteRole = (slug: string) =>
  client.delete(`/admin/roles/${slug}`)
```

- [x] **Step 3: Verify TypeScript compiles**

```bash
cd aroma-admin && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to the new types or API functions (pre-existing errors are fine).

- [x] **Step 4: Commit**

```bash
git add aroma-admin/src/types/index.ts aroma-admin/src/api/admin.ts
git commit -m "feat(roles): add AdminRole type and role CRUD API functions"
```

---

## Task 5: Update Auth Store — Dynamic Role Permissions

**Files:**
- Modify: `aroma-admin/src/stores/auth.ts`

Replace the hardcoded `ROLE_PERMS` constant with a reactive `roles` ref loaded from the API. The `can()` function reads from a computed `rolePermsMap`.

- [x] **Step 1: Rewrite `auth.ts` with dynamic roles**

Replace the entire contents of `aroma-admin/src/stores/auth.ts` with:

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiLogin, apiGetMe, apiGetRoles } from '../api/admin'
import type { AdminUser, AdminRole } from '../types'

export type PermAction = 'view' | 'edit' | 'delete'
const ACTION_IDX: Record<PermAction, number> = { view: 0, edit: 1, delete: 2 }

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('admin_token'))
  const user  = ref<AdminUser | null>(null)
  const roles = ref<AdminRole[]>([])

  const isAuthenticated = computed(() => !!token.value)
  const isOwner         = computed(() => user.value?.role === 'owner')

  const rolePermsMap = computed<Record<string, 'all' | Record<string, number[]>>>(() =>
    Object.fromEntries(
      roles.value.map(r => [r.slug, r.slug === 'owner' ? 'all' : r.permissions])
    )
  )

  function can(resource: string, action: PermAction = 'view'): boolean {
    const role = user.value?.role
    if (!role) return false
    const perms = rolePermsMap.value[role]
    if (!perms) return false
    if (perms === 'all') return true
    return (perms[resource]?.[ACTION_IDX[action]] ?? 0) === 1
  }

  async function login(email: string, password: string) {
    const res = await apiLogin(email, password)
    if (!res.data.user.is_admin) {
      throw new Error('This account does not have admin access.')
    }
    token.value = res.data.token
    user.value  = res.data.user
    localStorage.setItem('admin_token', res.data.token)
  }

  async function init() {
    if (!token.value) return
    const needsUser  = !user.value
    const needsRoles = roles.value.length === 0
    if (!needsUser && !needsRoles) return
    try {
      await Promise.all([
        needsUser  ? apiGetMe().then(res => { user.value = res.data })   : Promise.resolve(),
        needsRoles ? apiGetRoles().then(res => { roles.value = res.data }) : Promise.resolve(),
      ])
    } catch {
      token.value = null
      user.value  = null
      roles.value = []
      localStorage.removeItem('admin_token')
    }
  }

  function logout() {
    token.value = null
    user.value  = null
    roles.value = []
    localStorage.removeItem('admin_token')
  }

  return { token, user, roles, isAuthenticated, isOwner, can, login, logout, init }
})
```

- [x] **Step 2: Verify TypeScript compiles**

```bash
cd aroma-admin && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors from auth.ts.

- [x] **Step 3: Start the dev server and log in to verify roles load**

```bash
cd aroma-admin && npm run dev &
```

Open the browser, log in as owner. Open the browser console and run:

```javascript
window.__pinia?.state.value?.auth?.roles?.length
```

Expected: `6` (the 6 seeded roles).

- [x] **Step 4: Commit**

```bash
git add aroma-admin/src/stores/auth.ts
git commit -m "feat(roles): load roles from API in auth store, replace hardcoded ROLE_PERMS"
```

---

## Task 6: AdminsView Roles Tab — Edit/Create/Delete UI

**Files:**
- Modify: `aroma-admin/src/views/AdminsView.vue`

This task rewrites the roles tab script logic and template. The members tab and all other script sections (load, createAdmin, toggleStatus, etc.) remain unchanged.

- [x] **Step 1: Update the imports in `<script setup>`**

Replace the current imports at the top of `AdminsView.vue` with:

```typescript
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import type { AdminMember, AdminRole } from '../types'
import {
  apiGetAdmins,
  apiCreateAdmin,
  apiToggleAdminStatus,
  apiResetAdminPassword,
  apiCreateRole,
  apiUpdateRole,
  apiDeleteRole,
} from '../api/admin'
import { useAuthStore } from '../stores/auth'
```

- [x] **Step 2: Remove `rolesData`, add roles logic — replace the `// ── Roles & permissions data` section**

Remove everything from `// ── Roles & permissions data ─────────────────────────────────────` through the end of `function getPerm(...)` (lines 96–151 in the current file). Replace with:

```typescript
// ── Roles & permissions ───────────────────────────────────────────────
const rolesWithCounts = computed(() =>
  auth.roles.map(r => ({
    ...r,
    members: admins.value.filter(a => a.role === r.slug).length,
  }))
)

const selectedRoleSlug = ref('admin')
const selectedRole = computed(() =>
  rolesWithCounts.value.find(r => r.slug === selectedRoleSlug.value) ?? rolesWithCounts.value[0]
)

interface PermGroup {
  id: string
  label: string
  rows: { id: string; name: string }[]
}

const permGroups = computed<PermGroup[]>(() => [
  { id: 'catalog', label: t('admins.permGroups.catalog'), rows: [
    { id: 'products', name: t('admins.permGroups.products') },
    { id: 'brands',   name: t('admins.permGroups.brands') },
    { id: 'specs',    name: t('admins.permGroups.specs') },
  ]},
  { id: 'sales', label: t('admins.permGroups.sales'), rows: [
    { id: 'orders',  name: t('admins.permGroups.orders') },
    { id: 'coupons', name: t('admins.permGroups.coupons') },
  ]},
  { id: 'people', label: t('admins.permGroups.people'), rows: [
    { id: 'customers', name: t('admins.permGroups.customers') },
  ]},
  { id: 'system', label: t('admins.permGroups.system'), rows: [
    { id: 'admins', name: t('admins.permGroups.adminTeam') },
  ]},
])

// ── Edit / create / delete state ──────────────────────────────────────
const editingRoleSlug = ref<string | null>(null)
const isCreating      = ref(false)
const editDraft       = ref<{ name: string; color: string; permissions: Record<string, number[]> }>({
  name: '', color: '', permissions: {},
})
const deleteConfirm = ref<string | null>(null)
const editError     = ref<string | null>(null)
const saving        = ref(false)

const isEditing = computed(() => editingRoleSlug.value !== null || isCreating.value)

const COLOR_PALETTE = [
  'oklch(26% 0.04 250)',
  'oklch(46% 0.075 210)',
  'oklch(56% 0.10 340)',
  'oklch(58% 0.10 32)',
  'oklch(52% 0.045 145)',
  'oklch(56% 0.035 240)',
  'oklch(52% 0.08 280)',
  'oklch(54% 0.09 60)',
]

const EMPTY_PERMISSIONS: Record<string, number[]> = {
  products:  [0,0,0],
  orders:    [0,0,0],
  coupons:   [0,0,0],
  customers: [0,0,0],
  brands:    [0,0,0],
  specs:     [0,0,0],
  admins:    [0,0,0],
}

function startEdit(slug: string) {
  const role = auth.roles.find(r => r.slug === slug)
  if (!role) return
  editDraft.value = {
    name:        role.name,
    color:       role.color,
    permissions: JSON.parse(JSON.stringify(role.permissions)),
  }
  editingRoleSlug.value = slug
  isCreating.value      = false
  editError.value       = null
}

function startCreate() {
  editDraft.value = {
    name:        '',
    color:       COLOR_PALETTE[1],
    permissions: JSON.parse(JSON.stringify(EMPTY_PERMISSIONS)),
  }
  editingRoleSlug.value = null
  isCreating.value      = true
  editError.value       = null
  auth.roles.push({ id: -1, name: '', slug: '__new__', color: COLOR_PALETTE[1], permissions: { ...EMPTY_PERMISSIONS } })
  selectedRoleSlug.value = '__new__'
}

function cancelEdit() {
  if (isCreating.value) {
    const idx = auth.roles.findIndex(r => r.slug === '__new__')
    if (idx !== -1) auth.roles.splice(idx, 1)
    selectedRoleSlug.value = auth.roles[0]?.slug ?? 'admin'
  }
  editingRoleSlug.value = null
  isCreating.value      = false
  editDraft.value       = { name: '', color: '', permissions: {} }
  editError.value       = null
}

function togglePerm(resource: string, idx: number) {
  if (!editDraft.value.permissions[resource]) {
    editDraft.value.permissions[resource] = [0, 0, 0]
  }
  editDraft.value.permissions[resource][idx] =
    editDraft.value.permissions[resource][idx] ? 0 : 1
}

async function saveEdit() {
  editError.value = null
  saving.value    = true
  try {
    if (isCreating.value) {
      const res     = await apiCreateRole(editDraft.value)
      const tempIdx = auth.roles.findIndex(r => r.slug === '__new__')
      if (tempIdx !== -1) auth.roles.splice(tempIdx, 1, res.data)
      selectedRoleSlug.value = res.data.slug
    } else {
      const res = await apiUpdateRole(editingRoleSlug.value!, editDraft.value)
      const idx = auth.roles.findIndex(r => r.slug === editingRoleSlug.value)
      if (idx !== -1) auth.roles.splice(idx, 1, res.data)
      selectedRoleSlug.value = res.data.slug
    }
    editingRoleSlug.value = null
    isCreating.value      = false
    editDraft.value       = { name: '', color: '', permissions: {} }
  } catch (e: any) {
    editError.value = e?.response?.data?.message ?? 'Failed to save'
  } finally {
    saving.value = false
  }
}

async function deleteRole(slug: string) {
  editError.value = null
  try {
    await apiDeleteRole(slug)
    const idx = auth.roles.findIndex(r => r.slug === slug)
    if (idx !== -1) auth.roles.splice(idx, 1)
    selectedRoleSlug.value = auth.roles[0]?.slug ?? ''
    deleteConfirm.value    = null
  } catch (e: any) {
    editError.value     = e?.response?.data?.message ?? 'Failed to delete'
    deleteConfirm.value = null
  }
}

function getPerm(resource: string, idx: number): boolean {
  if (!isEditing.value && selectedRole.value?.slug === 'owner') return true
  const source = isEditing.value ? editDraft.value.permissions : selectedRole.value?.permissions
  if (!source) return false
  return (source[resource]?.[idx] ?? 0) === 1
}
```

- [x] **Step 3: Update the KPI helpers and visual helpers**

Replace the `// ── KPI helpers` section:

```typescript
// ── KPI helpers ───────────────────────────────────────────────────────
const stats = computed(() => ({
  total:     admins.value.length,
  active:    admins.value.filter(a => a.adminStatus === 'active').length,
  roles:     auth.roles.length,
  suspended: admins.value.filter(a => a.adminStatus === 'suspended').length,
}))
```

Replace the `// ── Visual helpers` section (roleLabel, ROLE_HUE, roleColor, initials, adminHue):

```typescript
// ── Visual helpers ────────────────────────────────────────────────────
function roleLabel(role: string): string {
  return auth.roles.find(r => r.slug === role)?.name ?? role
}

function roleColor(role: string): string {
  return auth.roles.find(r => r.slug === role)?.color ?? 'oklch(52% 0.07 200)'
}

function initials(name: string): string {
  if (!name) return '?'
  const words = name.trim().split(/\s+/)
  return (words[0][0] + (words[1]?.[0] ?? '')).toUpperCase()
}

function adminHue(name: string): number {
  const palette = [32, 340, 200, 96, 48, 140, 280, 18, 54, 24, 8, 160]
  return palette[(name?.charCodeAt(0) ?? 65) % palette.length]
}
```

- [x] **Step 4: Update the create-admin form's role `<select>`**

Find the `<select v-model="form.role" ...>` block (around line 292). Replace its `<option>` children with dynamic options from `auth.roles`:

```html
              <select
                v-model="form.role"
                class="w-full h-9 px-3 rounded-lg border border-dash-border bg-dash-paper-2 text-[12.5px] outline-none text-dash-text-2 focus:border-dash-primary transition-colors"
              >
                <option
                  v-for="r in auth.roles"
                  :key="r.slug"
                  :value="r.slug"
                  :disabled="r.slug === 'owner' && !isOwner"
                  :style="{ display: r.slug === 'owner' && !isOwner ? 'none' : '' }"
                >{{ r.name }}</option>
              </select>
```

- [x] **Step 5: Replace the roles tab template**

Replace the entire `<!-- ── Roles tab ── -->` section (from `<template v-else>` to its closing `</template>`, including the grid inside) with:

```html
    <!-- ── Roles tab ── -->
    <template v-else>
      <div class="grid grid-cols-12 gap-4">

        <!-- Left: role list -->
        <div class="col-span-4 bg-dash-paper border border-dash-border rounded-card overflow-hidden shadow-[0_1px_0_oklch(26%_0.04_250/0.025)] flex flex-col">
          <div class="divide-y divide-dash-border-lt flex-1">
            <button
              v-for="role in rolesWithCounts"
              :key="role.slug"
              class="w-full flex items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-dash-paper-2"
              :class="{ 'bg-dash-primary-lt': selectedRoleSlug === role.slug }"
              @click="selectedRoleSlug = role.slug"
            >
              <div
                class="h-9 w-9 rounded-lg grid place-items-center shrink-0 border border-dash-border-lt"
                :style="{
                  background: selectedRoleSlug === role.slug ? 'white' : 'var(--dash-paper-2)',
                  color: role.color
                }"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z"/></svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-[13px] font-semibold text-dash-text">
                    {{ role.slug === '__new__' ? (editDraft.name || 'New Role') : role.name }}
                  </p>
                  <span v-if="role.slug !== '__new__'" class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-dash-paper-2 border border-dash-border-lt text-dash-muted">{{ role.members }}</span>
                </div>
              </div>
              <svg v-if="selectedRoleSlug === role.slug" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="text-dash-primary shrink-0 mt-0.5"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
            </button>
          </div>
          <!-- New role button (owner only) -->
          <div v-if="isOwner && !isEditing" class="p-3 border-t border-dash-border-lt">
            <button
              class="w-full h-8 border-2 border-dashed border-dash-border rounded-lg flex items-center justify-center gap-1.5 text-[11.5px] font-medium text-dash-muted hover:text-dash-text hover:border-dash-border-dk transition-colors"
              @click="startCreate"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              New role
            </button>
          </div>
        </div>

        <!-- Right: permission matrix -->
        <div class="col-span-8 bg-dash-paper border border-dash-border rounded-card p-6 shadow-[0_1px_0_oklch(26%_0.04_250/0.025)]">

          <!-- Header row -->
          <div class="flex items-start justify-between gap-3 mb-5">
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="h-12 w-12 rounded-xl grid place-items-center border border-dash-border-lt shrink-0"
                :style="{ background: 'var(--dash-primary-lt)', color: isEditing ? editDraft.color : (selectedRole?.color ?? '') }"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z"/></svg>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10.5px] tracking-[.16em] uppercase font-semibold text-dash-faint">{{ isEditing ? (isCreating ? 'New Role' : 'Editing') : $t('admins.roleHeading') }}</p>
                <!-- Name input (edit mode) or heading (view mode) -->
                <input
                  v-if="isEditing"
                  v-model="editDraft.name"
                  placeholder="Role name"
                  maxlength="60"
                  class="font-display text-[22px] leading-tight text-dash-text bg-transparent border-b border-dash-border focus:border-dash-primary outline-none w-full mt-0.5"
                />
                <h2 v-else class="font-display text-[22px] leading-tight mt-0.5 text-dash-text">{{ selectedRole?.name }}</h2>
              </div>
            </div>
            <!-- Action buttons -->
            <div class="flex items-center gap-2 shrink-0">
              <!-- Edit mode: Save + Cancel -->
              <template v-if="isEditing">
                <button
                  class="h-8 px-3 rounded-lg border border-dash-border text-[12px] bg-white text-dash-text-2 hover:bg-dash-paper-2 transition-colors"
                  @click="cancelEdit"
                >{{ $t('common.cancel') }}</button>
                <button
                  class="h-8 px-4 rounded-lg text-[12px] font-semibold text-white bg-dash-text hover:opacity-90 transition-opacity disabled:opacity-50"
                  :disabled="saving || !editDraft.name.trim()"
                  @click="saveEdit"
                >{{ saving ? 'Saving…' : $t('common.save') }}</button>
              </template>
              <!-- View mode: Delete + Edit (owner only, not for owner role) -->
              <template v-else-if="isOwner && selectedRole?.slug !== 'owner'">
                <!-- Delete confirm flow -->
                <template v-if="deleteConfirm === selectedRole?.slug">
                  <span class="text-[11.5px] text-dash-text-2 mr-1">Delete this role?</span>
                  <button
                    class="h-8 px-3 rounded-lg text-[12px] font-semibold bg-dash-danger text-white hover:opacity-80 transition-opacity"
                    @click="deleteRole(selectedRole!.slug)"
                  >Confirm</button>
                  <button
                    class="h-8 px-3 rounded-lg border border-dash-border text-[12px] bg-white text-dash-text-2 hover:bg-dash-paper-2 transition-colors"
                    @click="deleteConfirm = null"
                  >{{ $t('common.cancel') }}</button>
                </template>
                <template v-else>
                  <button
                    class="h-8 px-3 rounded-lg border border-dash-border text-[12px] bg-white transition-colors"
                    :class="selectedRole?.members > 0 ? 'text-dash-faint cursor-not-allowed' : 'text-dash-danger hover:bg-dash-danger-lt'"
                    :disabled="selectedRole?.members > 0"
                    :title="selectedRole?.members > 0 ? 'Remove all members first' : ''"
                    @click="deleteConfirm = selectedRole?.slug ?? null"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline -mt-px mr-0.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                    Delete
                  </button>
                  <button
                    class="h-8 px-3 rounded-lg border border-dash-border text-[12px] bg-white text-dash-text-2 hover:bg-dash-paper-2 whitespace-nowrap transition-colors"
                    @click="startEdit(selectedRole!.slug)"
                  >{{ $t('common.edit') }}</button>
                </template>
              </template>
            </div>
          </div>

          <!-- Color palette (edit mode only) -->
          <div v-if="isEditing" class="flex items-center gap-2 mb-5">
            <span class="text-[11px] font-semibold text-dash-faint uppercase tracking-[.12em] mr-1">Color</span>
            <button
              v-for="color in COLOR_PALETTE"
              :key="color"
              type="button"
              class="h-6 w-6 rounded-full transition-transform hover:scale-110"
              :style="{
                background: color,
                boxShadow: editDraft.color === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none'
              }"
              @click="editDraft.color = color"
            />
          </div>

          <!-- Error banner -->
          <div v-if="editError" class="mb-4 rounded-lg border border-dash-danger/30 bg-dash-danger-lt px-4 py-2.5 text-[11.5px] text-dash-danger">
            {{ editError }}
          </div>

          <!-- Permission matrix -->
          <table class="w-full text-[12.5px]">
            <thead>
              <tr class="text-[10.5px] uppercase tracking-wider text-dash-faint">
                <th class="text-start font-semibold py-2 border-b border-dash-border-lt">{{ $t('admins.colResource') }}</th>
                <th class="font-semibold py-2 border-b border-dash-border-lt text-center w-20">{{ $t('admins.colView') }}</th>
                <th class="font-semibold py-2 border-b border-dash-border-lt text-center w-20">{{ $t('admins.colEdit') }}</th>
                <th class="font-semibold py-2 border-b border-dash-border-lt text-center w-20">{{ $t('admins.colDelete') }}</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="group in permGroups" :key="group.id">
                <tr>
                  <td colspan="4" class="pt-4 pb-1 text-[10px] uppercase tracking-[.16em] font-semibold text-dash-faint">{{ group.label }}</td>
                </tr>
                <tr v-for="row in group.rows" :key="row.id">
                  <td class="py-2.5 border-b border-dash-border-lt">
                    <span class="font-medium text-dash-text-2">{{ row.name }}</span>
                  </td>
                  <td v-for="idx in [0, 1, 2]" :key="idx" class="py-2.5 border-b border-dash-border-lt text-center">
                    <button
                      v-if="isEditing"
                      type="button"
                      class="inline-flex items-center justify-center h-6 w-6 rounded-md transition-colors"
                      :style="{
                        background: getPerm(row.id, idx) ? 'var(--dash-success)' : 'var(--dash-paper-2)',
                        border: getPerm(row.id, idx) ? '1px solid var(--dash-success-dk)' : '2px solid var(--dash-border)'
                      }"
                      @click="togglePerm(row.id, idx)"
                    >
                      <svg v-if="getPerm(row.id, idx)" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M5 12l5 5 9-11"/></svg>
                    </button>
                    <span
                      v-else
                      class="inline-flex items-center justify-center h-6 w-6 rounded-md"
                      :style="{
                        background: getPerm(row.id, idx) ? 'var(--dash-success)' : 'var(--dash-paper-2)',
                        border: getPerm(row.id, idx) ? '1px solid var(--dash-success-dk)' : '1px solid var(--dash-border)'
                      }"
                    >
                      <svg v-if="getPerm(row.id, idx)" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M5 12l5 5 9-11"/></svg>
                    </span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </template>
```

- [x] **Step 6: Verify TypeScript compiles**

```bash
cd aroma-admin && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
```

Expected: no errors from AdminsView.vue.

- [x] **Step 7: Test the full UI flow in the browser**

Open http://localhost:5173 in the browser and log in as an owner. Test:

1. Navigate to Admin Team → Roles tab. Verify 6 roles load.
2. Click each role and verify the permission matrix renders correctly.
3. Click **Edit** on the Admin role. Verify name input, color palette, and interactive checkboxes appear.
4. Toggle a permission checkbox. Verify it visually toggles.
5. Change the color. Verify the icon color updates.
6. Click **Save**. Verify the change persists (check via `GET /api/admin/roles` or re-navigate).
7. Click **+ New role**. Fill in a name, pick a color, toggle some permissions. Save. Verify the new role appears in the list.
8. With 0 members on the new role, click **Delete**. Confirm. Verify it disappears.
9. Verify the **Delete** button is disabled (greyed) on the Admin role when it has members.

- [x] **Step 8: Commit**

```bash
git add aroma-admin/src/views/AdminsView.vue
git commit -m "feat(roles): roles tab — inline edit/create/delete UI with dynamic DB roles"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| `roles` table with id, name, slug, color, permissions JSON, timestamps | Task 1 |
| 6 predefined roles seeded in migration | Task 1 |
| `users.role` unchanged (stores slug string) | No change needed |
| GET /admin/roles (any admin) | Task 2 |
| POST /admin/roles (owner only → 403) | Task 2 |
| PUT /admin/roles/{slug} (owner only) | Task 2 |
| DELETE /admin/roles/{slug} (owner only, 422 if members) | Task 2 |
| Slug auto-generated from name, unique suffix if collision | Task 2 |
| Slug never changes on name update | Task 2 (update only touches name/color/permissions) |
| AdminAdminsController Rule::in from DB | Task 3 |
| `AdminRole` TypeScript type | Task 4 |
| `apiGetRoles`, `apiCreateRole`, `apiUpdateRole`, `apiDeleteRole` | Task 4 |
| Remove hardcoded ROLE_PERMS | Task 5 |
| `roles` ref in auth store | Task 5 |
| `init()` loads roles from API | Task 5 |
| `owner` slug → `'all'` detection in rolePermsMap | Task 5 |
| Roles list iterates `auth.roles` | Task 6 |
| "+ New role" button at bottom of list | Task 6 |
| Edit button + Delete button in top-right (owner only) | Task 6 |
| Delete disabled when members > 0 with tooltip | Task 6 |
| Edit mode: name input, color swatches, interactive checkboxes | Task 6 |
| Save/Cancel buttons in edit mode | Task 6 |
| Delete confirm inline flow | Task 6 |
| Create admin form role select iterates auth.roles | Task 6 (Step 4) |
| Cancel on new role removes temp entry | Task 6 |
