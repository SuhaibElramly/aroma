# Admin Audit Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Fix the one user-facing bug and remove all verified dead code surfaced by a static audit of `aroma-admin/`.

**Architecture:** Pure cleanup — no new features. Each task is independent of the others, so the engineer can stop or skip any task without breaking anything. Verification for each task is a grep that should return zero results plus a successful build.

**Tech Stack:** Vue 3, TypeScript, vue-i18n, Vite, Pinia.

---

## Audit Summary (read this first)

The audit examined every file under `aroma-admin/src/` (views, components, stores, composables, api, router, locales). Findings broken down:

| Category | Count | Action |
|---|---|---|
| **Real bugs** | 1 | Fix in Task 1 |
| **Dead components/composables** | 2 files | Delete in Tasks 2 & 3 |
| **Unused i18n keys** | 234 keys | Prune in Tasks 4 & 5 |
| **False positives investigated and dismissed** | 3 | None — documented below |

**Investigated but NOT bugs (do not act on these):**

1. `aroma-admin/src/router/index.ts:39` — `categories` route uses `requiredResource: 'brands'`. Looks wrong at first glance but is *intentional*: categories share the brands permission. Documented in [Sidebar.vue:45](aroma-admin/src/components/layout/Sidebar.vue#L45) (`// shares brands permission — no separate ROLE_PERMS key`) and confirmed against backend role definitions in `aroma-api/database/migrations/2026_05_23_000001_create_roles_table.php` which has no `categories` resource.
2. `aroma-admin/src/views/DashboardView.vue` `'—'` em-dashes — these are legitimate empty-state fallbacks for unloaded `stats` (e.g. `stats?.totalOrders ?? '—'`), not unfinished UI.
3. Locale parity is good — 0 key differences between `en.ts` and `ar.ts`.

---

## File Map

**Modified:**
- `aroma-admin/src/locales/en.ts` — add 1 missing key, remove ~234 dead keys
- `aroma-admin/src/locales/ar.ts` — add 1 missing key (Arabic), remove same ~234 dead keys

**Deleted:**
- `aroma-admin/src/composables/useAsync.ts`
- `aroma-admin/src/components/charts/ComparisonChart.vue`

---

## Task 1: Fix missing i18n key `productVariants.specsSection`

**Severity:** MED (user-facing). The bare key string (`productVariants.specsSection`) renders to the screen in the product-variants editor whenever a product has >1 variant.

**Files:**
- Modify: `aroma-admin/src/locales/en.ts` — under `productVariants:` block (line ~439)
- Modify: `aroma-admin/src/locales/ar.ts` — under `productVariants:` block (line ~441)
- Reference (do not modify): `aroma-admin/src/components/product/StepVariants.vue:258`

- [ ] **Step 1: Reproduce the bug to confirm**

Run the admin dev server, open any product with >1 variant, and look at the "Specs" section header in the variants editor. It will literally display the string `productVariants.specsSection` instead of an English/Arabic label.

```bash
cd aroma-admin && npm run dev
```

Expected: header reads `productVariants.specsSection · N combinations`.

- [ ] **Step 2: Locate where to insert the key**

The `productVariants:` block already exists in both locale files. Read those blocks to see what sibling keys look like:

```bash
sed -n '439,470p' aroma-admin/src/locales/en.ts
sed -n '441,472p' aroma-admin/src/locales/ar.ts
```

- [ ] **Step 3: Add the key to `en.ts`**

Insert inside the `productVariants: { ... }` object. Use this English copy (matches the existing tone — short, sentence case):

```ts
specsSection: 'Specs',
```

- [ ] **Step 4: Add the key to `ar.ts`**

Add the Arabic equivalent in the same position inside `productVariants: { ... }`:

```ts
specsSection: 'المواصفات',
```

- [ ] **Step 5: Verify the bug is fixed**

Restart the dev server (or trust HMR) and reload the same product page. Header now reads `Specs · N combinations` (or `المواصفات · N combinations` in Arabic).

- [ ] **Step 6: Verify nothing else broke**

```bash
cd aroma-admin && npx vue-tsc --noEmit && npm run build
```

Expected: both pass with no new errors.

- [ ] **Step 7: Commit**

```bash
git add aroma-admin/src/locales/en.ts aroma-admin/src/locales/ar.ts
git commit -m "fix(admin): add missing productVariants.specsSection i18n key"
```

---

## Task 2: Delete dead `ComparisonChart.vue` component and its orphaned i18n keys

**Severity:** LOW. 86 lines of dead Vue code plus 3 orphaned locale keys.

**Background:** `aroma-admin/src/components/charts/ComparisonChart.vue` exists in the repo but is never imported anywhere. It was likely created for an earlier dashboard design that was replaced by `AreaChart` and `BarChart`. Its three i18n keys (`dashboard.dayChartTitle`, `dashboard.dayChartSub`, `dashboard.onlineLabel`) are only referenced inside the dead component, so they're orphaned too.

**Files:**
- Delete: `aroma-admin/src/components/charts/ComparisonChart.vue`
- Modify: `aroma-admin/src/locales/en.ts` — remove 3 keys under `dashboard:`
- Modify: `aroma-admin/src/locales/ar.ts` — remove same 3 keys under `dashboard:`

- [ ] **Step 1: Verify ComparisonChart is truly unused**

```bash
cd /Users/suhaib/web_projects/aroma-full-project
grep -rn "ComparisonChart" aroma-admin/src/ --include="*.vue" --include="*.ts" | grep -v "ComparisonChart.vue"
```

Expected: zero output. (If you see any imports, STOP and re-investigate — do not delete.)

- [ ] **Step 2: Verify the 3 i18n keys are only referenced by ComparisonChart**

```bash
grep -rn "dayChartTitle\|dayChartSub\|onlineLabel" aroma-admin/src/ --include="*.vue" --include="*.ts" | grep -v "src/locales/" | grep -v "ComparisonChart.vue"
```

Expected: zero output.

- [ ] **Step 3: Delete the component**

```bash
rm aroma-admin/src/components/charts/ComparisonChart.vue
```

- [ ] **Step 4: Remove the keys from `en.ts`**

Open `aroma-admin/src/locales/en.ts`, find the `dashboard:` block (around line 130), and delete these three lines:

```ts
dayChartTitle: 'Orders by Day',
dayChartSub: 'Last 28 days, grouped by weekday',
onlineLabel: 'Online',
```

- [ ] **Step 5: Remove the same keys from `ar.ts`**

Same operation in `aroma-admin/src/locales/ar.ts` — find the matching `dashboard:` block and delete the same three keys.

- [ ] **Step 6: Verify build still works**

```bash
cd aroma-admin && npx vue-tsc --noEmit && npm run build
```

Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore(admin): delete unused ComparisonChart and its orphaned i18n keys"
```

---

## Task 3: Delete dead `useAsync` composable

**Severity:** LOW. 21 lines of unused composable.

**Background:** `aroma-admin/src/composables/useAsync.ts` defines a generic async-state composable but is never imported anywhere. Views and components use direct `try/catch` with refs instead. Likely a speculative abstraction from early scaffolding that was never adopted.

**Files:**
- Delete: `aroma-admin/src/composables/useAsync.ts`

- [ ] **Step 1: Verify `useAsync` is truly unused**

```bash
cd /Users/suhaib/web_projects/aroma-full-project
grep -rn "useAsync" aroma-admin/src/ --include="*.vue" --include="*.ts" | grep -v "useAsync.ts"
```

Expected: zero output. (If anything matches, STOP and investigate.)

- [ ] **Step 2: Delete the file**

```bash
rm aroma-admin/src/composables/useAsync.ts
```

- [ ] **Step 3: Verify build**

```bash
cd aroma-admin && npx vue-tsc --noEmit && npm run build
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(admin): delete unused useAsync composable"
```

---

## Task 4: Delete orphaned `admins.roles.*` and `admins.roleDescs.*` i18n keys

**Severity:** LOW. 12 unused locale keys + 3 related (`admins.actions`, `admins.editRole`, `admins.members`).

**Background:** [AdminsView.vue](aroma-admin/src/views/AdminsView.vue) displays role names directly from the database (`r.name` from `auth.roles[].name`), not via i18n — see [AdminsView.vue:455](aroma-admin/src/views/AdminsView.vue#L455), [AdminsView.vue:545](aroma-admin/src/views/AdminsView.vue#L545), and the helper [AdminsView.vue:320-321](aroma-admin/src/views/AdminsView.vue#L320-L321). So the locale keys `admins.roles.owner`, `admins.roles.admin`, `admins.roles.catalogManager`, `admins.roles.sales`, `admins.roles.support`, `admins.roles.readOnly` and their description twins under `admins.roleDescs.*` will never be reached. (To localize role names properly the keys would need to be wired into `roleLabel()`, but that's a separate decision — for now they're just dead.)

**Files:**
- Modify: `aroma-admin/src/locales/en.ts`
- Modify: `aroma-admin/src/locales/ar.ts`

- [ ] **Step 1: Re-verify the keys are truly unreferenced (in case AdminsView changed)**

```bash
cd /Users/suhaib/web_projects/aroma-full-project
grep -rn "admins.roles\|admins.roleDescs\|admins\.actions\|admins\.editRole\|admins\.members" aroma-admin/src/ --include="*.vue" --include="*.ts" | grep -v "src/locales/"
```

Expected: zero output. (If anything matches, STOP — someone wired them up since this plan was written.)

- [ ] **Step 2: Remove the keys from `en.ts`**

Open `aroma-admin/src/locales/en.ts`, find the `admins:` block, and remove these sub-blocks and keys (preserve the rest of `admins:`):

```ts
actions: '...',
editRole: '...',
members: '...',
roles: {
  owner: '...',
  admin: '...',
  catalogManager: '...',
  sales: '...',
  support: '...',
  readOnly: '...',
},
roleDescs: {
  owner: '...',
  admin: '...',
  catalog: '...',
  sales: '...',
  support: '...',
  readOnly: '...',
},
```

- [ ] **Step 3: Remove the same keys from `ar.ts`**

Same operation in `aroma-admin/src/locales/ar.ts`.

- [ ] **Step 4: Verify build and runtime**

```bash
cd aroma-admin && npx vue-tsc --noEmit && npm run build
```

Then run `npm run dev`, open `/admins`, and confirm the page renders correctly (roles list, role descriptions, role labels in tables — all still come from `auth.roles`, so should be unaffected).

- [ ] **Step 5: Commit**

```bash
git add aroma-admin/src/locales/en.ts aroma-admin/src/locales/ar.ts
git commit -m "chore(admin): delete orphaned admins role i18n keys (roles come from DB)"
```

---

## Task 5: Audit and prune remaining unused i18n keys

**Severity:** LOW. ~219 more unused keys after Tasks 2 and 4. Worth doing because dead translations have to be maintained whenever a new locale is added and they obscure what's actually live.

**Background:** A static audit found 234 keys defined in `en.ts`/`ar.ts` but never referenced in any `t('...')` call. Tasks 2 and 4 cleared 15 of them. The rest break down (roughly) like this:

| Group | Approx. count | Notes |
|---|---|---|
| `brands.columns.*`, `brands.filter*`, `brands.title`, `brands.delete`, `brands.edit` | ~10 | BrandsView likely refactored without using them |
| `categories.columns.*`, `categories.filter*`, `categories.save`, `categories.delete`, `categories.edit` | ~12 | Same pattern in CategoriesView |
| `coupons.columns.*`, `coupons.delete`, `coupons.edit`, `coupons.never`, `coupons.title`, `coupons.typeFixed`, `coupons.typePercentage` | ~12 | Same pattern in CouponsView |
| `brandDetail.*` | ~2 | Likely stale |
| `orderDetail.*` | ~10 | Some stale |
| `newProductDrawer.*` | ~9 | Verify against current drawer |
| `dashboard.*` (greeting, subtitle, customers, products, revenueChart, ordersChart, timeOfDay.*) | ~9 | Possibly from older dashboard design |
| `common.*` (back, confirmDelete, error, from, name, no, of, page, perPage, phone, search, showing, slug, to, yes, actions) | ~16 | **Be careful** — these are intentionally shared "toolbox" keys; some may be added back next time a generic UI surface is built |
| `nav.main` | 1 | |
| Other scattered | ~138 | Includes various view-level keys |

**Strategy:** This task is best done with a verification script that you re-run as you delete. Do NOT attempt to delete all 219 in one commit — split by namespace so each commit is reviewable.

**Files:**
- Modify: `aroma-admin/src/locales/en.ts`
- Modify: `aroma-admin/src/locales/ar.ts`

- [ ] **Step 1: Generate the up-to-date list of unused keys**

Save this as `aroma-admin/scripts/audit-i18n.mjs` (a one-shot script — delete after you're done):

```js
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, out)
    else if (e.endsWith('.vue') || e.endsWith('.ts')) out.push(p)
  }
  return out
}

function extractUsedKeys(text) {
  const keys = new Set()
  const prefixes = new Set()
  for (const m of text.matchAll(/\bt\(['"]([a-zA-Z][a-zA-Z0-9_.]*\.[a-zA-Z][a-zA-Z0-9_.]*)['"]/g)) keys.add(m[1])
  for (const m of text.matchAll(/\bt\(`([a-zA-Z][a-zA-Z0-9_.]*)\.\$/g)) prefixes.add(m[1])
  return { keys, prefixes }
}

function extractDefinedKeys(text) {
  const keys = new Set()
  const stack = []
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '')
    const m = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/)
    if (!m) continue
    const indent = m[1].length
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop()
    const full = [...stack.map(s => s.name), m[2]].join('.')
    if (m[3].startsWith('{')) stack.push({ indent, name: m[2] })
    else keys.add(full)
  }
  return keys
}

const root = 'aroma-admin/src'
const used = new Set()
const pref = new Set()
for (const f of walk(root)) {
  if (f.includes('/locales/')) continue
  const { keys, prefixes } = extractUsedKeys(readFileSync(f, 'utf8'))
  for (const k of keys) used.add(k)
  for (const p of prefixes) pref.add(p)
}

const defined = extractDefinedKeys(readFileSync(`${root}/locales/en.ts`, 'utf8'))
const unused = [...defined].filter(k => !used.has(k) && ![...pref].some(p => k.startsWith(p + '.')))

console.log(`Dynamic prefixes detected: ${[...pref].join(', ')}`)
console.log(`Unused keys (${unused.length}):`)
for (const k of unused.sort()) console.log(`  ${k}`)
```

Run it:

```bash
cd /Users/suhaib/web_projects/aroma-full-project
node aroma-admin/scripts/audit-i18n.mjs > /tmp/unused-keys.txt
head -40 /tmp/unused-keys.txt
wc -l /tmp/unused-keys.txt
```

Expected: ~221 unused keys (234 minus the 12 admins keys removed in Task 4 minus the 3 dashboard keys removed in Task 2).

- [ ] **Step 2: Group keys by top-level namespace and decide**

For each namespace, decide: delete now, or keep as a deliberate toolkit?

Recommended decisions:
- **Delete:** `admins.*` leftovers, `brands.*`, `brandDetail.*`, `categories.*`, `coupons.*` (column/filter keys for refactored tables), `nav.main`, view-specific orphans under `dashboard.*` / `orderDetail.*` / `newProductDrawer.*`.
- **Keep:** `common.back`, `common.cancel` (already used?), and any other `common.*` keys that read like a future-proof shared toolbox. Default to YAGNI here too — if it's not used, delete it. If you reintroduce it later you can re-add in one line.

- [ ] **Step 3: Delete one namespace at a time, verifying after each**

For each namespace (e.g. `brands`), open both `en.ts` and `ar.ts`, remove the unused sub-keys (leave any keys still referenced), then run:

```bash
cd /Users/suhaib/web_projects/aroma-full-project
node aroma-admin/scripts/audit-i18n.mjs | head -1
cd aroma-admin && npx vue-tsc --noEmit
```

The line count in the audit output should decrease; the typecheck should pass.

- [ ] **Step 4: Smoke-test affected views**

After each namespace deletion, open the corresponding view in the admin dev server (`/brands`, `/categories`, `/coupons`, etc.) and confirm no raw key strings appear. The audit script protects against false negatives (unused), not false positives (used but missed) — so visual smoke tests still matter.

- [ ] **Step 5: Delete the audit script**

After all namespaces are cleaned:

```bash
rm aroma-admin/scripts/audit-i18n.mjs
rmdir aroma-admin/scripts 2>/dev/null || true
```

- [ ] **Step 6: Commit each namespace separately**

```bash
git commit -m "chore(admin): prune unused brands.* i18n keys"
git commit -m "chore(admin): prune unused categories.* i18n keys"
# ... etc, one commit per namespace
```

Frequent small commits make it easy to bisect if a UI suddenly renders a raw key after merge.

---

## Optional follow-ups (not in this plan)

Surfaced by the audit but out of scope here. Consider as separate plans if relevant:

- **Localize admin role names.** Roles currently render with their DB-stored `name` field. If we want Arabic role names without a schema change, wire `roleLabel()` in [AdminsView.vue:320](aroma-admin/src/views/AdminsView.vue#L320) to look up `t(\`admins.roles.${role.slug}\`)` with `role.name` as fallback. (Then Task 4 deletions would need to be reverted.)
- **Add an ESLint rule or pre-commit hook** that fails when an i18n key is used in code but missing from a locale. This would have caught the `productVariants.specsSection` bug at write time.

---

**End of plan.**
