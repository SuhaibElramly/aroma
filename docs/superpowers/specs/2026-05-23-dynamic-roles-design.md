# Dynamic Roles & Permissions — Design Spec

**Goal:** Let owners create, edit, and delete roles with custom permission matrices. Roles are stored in the database and loaded dynamically so the permission system is consistent across all admin sessions.

---

## Background

Currently all 6 roles (`owner`, `admin`, `catalog_manager`, `sales`, `support`, `read_only`) and their permission matrices are hardcoded in the frontend (`ROLE_PERMS` in `auth.ts`). The Edit button on the Roles tab is a dead stub. There is no way to add or remove roles.

---

## Scope

- Any role can be created, edited, or deleted — including the 6 predefined ones
- Only **owners** can write (create/edit/delete); all admin roles can read
- Delete is blocked while any user holds that role
- The `users.role` string column is unchanged — it stores the slug
- Roles load from the API on `auth.init()` — the hardcoded `ROLE_PERMS` constant is removed

---

## Data Model

### New table: `roles`

| column | type | notes |
|---|---|---|
| `id` | int PK | |
| `name` | string | Display name, e.g. "Catalog Manager" |
| `slug` | string unique | Snake-case identifier, e.g. `catalog_manager`. Auto-generated from name on create. |
| `color` | string | oklch value, e.g. `oklch(56% 0.10 340)` |
| `permissions` | json | `{ products:[1,1,1], orders:[1,0,0], customers:[1,1,0], brands:[1,1,1], specs:[1,1,1], coupons:[1,1,0], admins:[0,0,0] }` — index 0=view, 1=edit/create, 2=delete |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

The 6 predefined roles are seeded in the same migration so existing deployments get them automatically.

`users.role` continues to store the slug string. No foreign key — loose coupling so a role can be renamed without cascading updates.

---

## Backend

### New controller: `AdminRolesController`

All routes are under `auth:sanctum + is_admin` middleware.

| method | route | description |
|---|---|---|
| GET | `/admin/roles` | List all roles (any admin) |
| POST | `/admin/roles` | Create role (owner only → 403 otherwise) |
| PUT | `/admin/roles/{slug}` | Update name/color/permissions (owner only) |
| DELETE | `/admin/roles/{slug}` | Delete role (owner only, 422 if has members) |

**Create:** Validates `name` (required, max 60), `color` (required), `permissions` (required, valid JSON object). Auto-generates `slug` via `Str::slug($name)`, ensures uniqueness (append `-2`, `-3` etc. if collision).

**Update:** Accepts any subset of `name`, `color`, `permissions`. If `name` changes, `slug` does NOT change — the slug is the stable identifier.

**Delete:** Counts `User::where('is_admin', true)->where('role', $slug)`. If count > 0, returns `422 { message: "This role has N members. Reassign them before deleting." }`. Otherwise hard-deletes the row.

**Owner check (reusable):**
```php
if ($request->user()->role !== 'owner') {
    return response()->json(['message' => 'Forbidden'], 403);
}
```

### Updated: `AdminAdminsController`

`Rule::in([...])` for role validation is replaced with:
```php
Rule::in(Role::pluck('slug')->toArray())
```

---

## Frontend

### New type (`types/index.ts`)

```typescript
export interface AdminRole {
  id:          number
  name:        string
  slug:        string
  color:       string
  permissions: Record<string, number[]>
}
```

### New API functions (`api/admin.ts`)

```typescript
apiGetRoles()
apiCreateRole(data: { name: string; color: string; permissions: Record<string, number[]> })
apiUpdateRole(slug: string, data: Partial<{ name: string; color: string; permissions: Record<string, number[]> }>)
apiDeleteRole(slug: string)
```

### Auth store (`stores/auth.ts`)

- Remove hardcoded `ROLE_PERMS` constant
- Add `roles = ref<AdminRole[]>([])`
- In `init()`, call `apiGetRoles()` and:
  - Populate `roles.value`
  - Build `ROLE_PERMS` map dynamically: `Object.fromEntries(roles.map(r => [r.slug, r.permissions]))`
- `owner` role still maps to `'all'` — detect by slug: `r.slug === 'owner' ? 'all' : r.permissions`
- Export `roles` from the store

### AdminsView.vue

**Roles list (left panel):**
- Iterates `auth.roles` instead of local `rolesData`
- "+ New role" button at the bottom of the list

**Right panel — view mode:**
- Read-only permission matrix (as today)
- Edit button + Delete button in top-right
- Delete is disabled (greyed, `cursor-not-allowed`) when `selectedRole.members > 0`; tooltip: "Remove all members first"

**Right panel — edit mode** (triggered by Edit or new role):
- Role name becomes an `<input>`
- Color swatch row appears: 8 preset oklch colors as clickable circles; selected color has a ring
- Permission checkboxes are interactive toggles
- Save / Cancel buttons at top-right
- Save: `apiUpdateRole` or `apiCreateRole` → update `auth.roles` → rebuild `ROLE_PERMS` → exit edit mode
- Cancel: restore draft, exit edit mode without API call

**State refs added to AdminsView:**
```typescript
const editingRoleId = ref<number | null>(null)   // null = view mode
const isCreating    = ref(false)
const editDraft     = ref<Partial<AdminRole>>({})
const deleteConfirm = ref<string | null>(null)    // slug awaiting confirm
```

**Creating a new role:**
1. Click "+ New role"
2. Blank entry appended to `auth.roles` in-memory (not yet saved)
3. Right panel enters edit mode with empty name, no color, all permissions off
4. Save → `apiCreateRole` → replace the temp entry with the server response
5. Cancel → remove the temp entry

**Deleting a role:**
1. Click Delete (only enabled when members === 0)
2. `deleteConfirm` is set to the role's slug — the Delete button is replaced with `"Delete this role?" [Confirm] [Cancel]`
3. Confirm → `apiDeleteRole` → remove from `auth.roles` → select first role
4. Cancel → `deleteConfirm = null`

**Color palette** (8 presets, matches existing role colors):
```
oklch(26% 0.04 250)   // owner dark
oklch(46% 0.075 210)  // admin blue
oklch(56% 0.10 340)   // catalog pink
oklch(58% 0.10 32)    // sales orange
oklch(52% 0.045 145)  // support green
oklch(56% 0.035 240)  // read-only slate
oklch(52% 0.08 280)   // purple
oklch(54% 0.09 60)    // amber
```

**Create admin form** — role `<select>` iterates `auth.roles` instead of hardcoded options.

---

## Access control summary

| action | who can do it |
|---|---|
| View roles list + permission matrix | any admin |
| Edit role name/color/permissions | owner only |
| Create new role | owner only |
| Delete role (0 members) | owner only |
| Delete role (has members) | blocked — 422 |

---

## Files changed

| file | change |
|---|---|
| `aroma-api/database/migrations/2026_05_23_000001_create_roles_table.php` | new — create table + seed 6 roles |
| `aroma-api/app/Models/Role.php` | new — Eloquent model |
| `aroma-api/app/Http/Controllers/Api/Admin/AdminRolesController.php` | new — CRUD |
| `aroma-api/routes/api.php` | add 4 role routes |
| `aroma-api/app/Http/Controllers/Api/Admin/AdminAdminsController.php` | update `Rule::in` to pull from DB |
| `aroma-admin/src/types/index.ts` | add `AdminRole` type |
| `aroma-admin/src/api/admin.ts` | add 4 role API functions |
| `aroma-admin/src/stores/auth.ts` | remove hardcoded `ROLE_PERMS`, load from API, expose `roles` |
| `aroma-admin/src/views/AdminsView.vue` | full roles tab rewrite — edit/create/delete UI |
