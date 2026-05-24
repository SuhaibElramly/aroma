# Aroma Shop — Free-Tier Production Deployment Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use superpowers:verification-before-completion before claiming any task done — for deployment work, "verification" means hitting a real URL or running a real command, never "the code looks right."

**Goal:** Get all three Aroma Shop apps (Laravel API, Vue admin, Next.js storefront) running on free hosting tiers with a managed PostgreSQL database and durable image storage, end-to-end working in production.

**Architecture:**
- **Laravel API (`aroma-api/`)** → **Render** free web service (PHP runtime, no Docker). Cold-starts after 15 min idle — acceptable for low traffic.
- **Vue admin (`aroma-admin/`)** → **Vercel** as a Vite SPA, root directory set to the subfolder.
- **Next.js storefront (`aroma/`)** → **Vercel** with native Next.js runtime, root directory set to the subfolder.
- **Database** → **Neon** (free PostgreSQL, 0.5 GB). Replaces local SQLite.
- **Image storage** → **Cloudflare R2** (10 GB free, S3-compatible — drop-in replacement for Laravel's existing `s3` disk, no SDK swap, no egress fees).

**Tech Stack:** PHP 8.3 / Laravel 11 / Sanctum (bearer tokens) / PostgreSQL · Vue 3.5 + Vite + TypeScript · Next.js 15 + React 19. All deployed from the same Git monorepo.

**Read this before starting:**
- `BRAND_GUIDE.md` and `PRODUCT.md` at the repo root — domain context.
- Sanctum here is **stateless bearer-token** auth (confirmed in `aroma-api/bootstrap/app.php:18`). There is **no** SPA cookie flow. That means **`SANCTUM_STATEFUL_DOMAINS` does not need to be set in production** — only CORS matters. Don't waste time on stateful Sanctum config.
- The repo is a monorepo with three independent npm/composer projects. There is **no root `package.json`**. Each app deploys independently from its own subdirectory.

**Scope guards:**
- This plan does **not** add CI/CD, monitoring, Sentry, custom domains, or HTTPS certificates (Render and Vercel handle TLS automatically on their default `.onrender.com` / `.vercel.app` domains). Those are follow-ups.
- This plan **changes upload code** to use the configured filesystem disk consistently, so prod can swap to R2 by env vars alone. It does **not** add image transformations or thumbnailing.
- Don't refactor unrelated code while passing through these files. If you spot something, flag it but don't fix it here.

---

## Phase 1 — Backend hardening (local-only changes)

Goal: make the Laravel API drive all environment-specific behavior from env vars, so the same codebase runs against SQLite+local-disk locally and PostgreSQL+R2 in production. All work in this phase is local; no external accounts required yet.

### Task 1.1: Make CORS allowed origins env-driven

**Why:** `config/cors.php:6-9` currently hardcodes `http://localhost:5173` and `http://localhost:3000`. In production the Vue admin and Next.js storefront will live on `*.vercel.app` URLs we don't know yet. We need to set them via env without editing code.

**Files:**
- Modify: `aroma-api/config/cors.php` (whole `allowed_origins` block)
- Modify: `aroma-api/.env.example` (add new vars at the bottom)

**Step 1: Edit `aroma-api/config/cors.php`**

Replace the existing file contents with:

```php
<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_filter(array_map('trim', explode(
        ',',
        env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:3000')
    ))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

The default fallback preserves current local behavior, so nothing breaks for devs who haven't set the var.

**Step 2: Add the var to `aroma-api/.env.example`**

Append at the end (after the `VITE_APP_NAME` line):

```
# Comma-separated list. Leave unset locally to use the default (localhost:5173 + localhost:3000).
CORS_ALLOWED_ORIGINS=
```

**Step 3: Verify CORS still works locally**

Run from `aroma-api/`:

```bash
php artisan serve &
SERVE_PID=$!
sleep 2
curl -s -i -H "Origin: http://localhost:5173" -X OPTIONS http://127.0.0.1:8000/api/products | grep -i "access-control-allow-origin"
kill $SERVE_PID
```

Expected: header line `Access-Control-Allow-Origin: http://localhost:5173`.

**Step 4: Commit**

```bash
git add aroma-api/config/cors.php aroma-api/.env.example
git commit -m "feat(api): make CORS allowed origins env-driven"
```

---

### Task 1.2: Verify uploads work via the configured default disk

**Why:** Uploads in `AdminBrandController.php` and `AdminProductImageController.php` call `Storage::disk('public')` directly. That hardcodes the local-only disk, which won't survive a Render redeploy (free tier has ephemeral filesystem). We need them to use the configured default disk so prod can be `s3` (= R2) without code changes.

**Files:**
- Modify: `aroma-api/app/Http/Controllers/Api/Admin/AdminBrandController.php` (8 call sites — see Step 2)
- Modify: `aroma-api/app/Http/Controllers/Api/Admin/AdminProductImageController.php` (2 call sites — see Step 2)

**Step 1: Read both files first**

```bash
# Just so you see the exact context — don't edit yet.
grep -n "Storage::disk('public')" aroma-api/app/Http/Controllers/Api/Admin/AdminBrandController.php aroma-api/app/Http/Controllers/Api/Admin/AdminProductImageController.php
```

You should see 8 hits total (6 in brand controller, 2 in product image controller). Confirm before editing.

**Step 2: Replace `Storage::disk('public')` → `Storage::disk(config('filesystems.default'))`**

In both files, change every occurrence. Use a single substitution per file:

```bash
sed -i.bak "s/Storage::disk('public')/Storage::disk(config('filesystems.default'))/g" \
  aroma-api/app/Http/Controllers/Api/Admin/AdminBrandController.php \
  aroma-api/app/Http/Controllers/Api/Admin/AdminProductImageController.php
rm aroma-api/app/Http/Controllers/Api/Admin/*.bak
```

Then `git diff` to verify the change matches expectations — eight lines changed, no other edits.

**Step 3: Verify uploads still work against the local disk**

`FILESYSTEM_DISK` is unset in `.env.example`, which means it defaults to `'local'` per `config/filesystems.php:16`. Locally we want `public` for storage to land in the symlinked `storage/app/public/`. Set it explicitly:

Add this line to your local `aroma-api/.env` (NOT `.env.example`):

```
FILESYSTEM_DISK=public
```

Then:

```bash
cd aroma-api
php artisan storage:link  # idempotent
composer test
```

Expected: all existing PHPUnit tests pass. If the brand or product-image feature tests fail, the disk swap broke something — investigate before continuing.

**Step 4: Commit**

```bash
git add aroma-api/app/Http/Controllers/Api/Admin/AdminBrandController.php \
        aroma-api/app/Http/Controllers/Api/Admin/AdminProductImageController.php
git commit -m "refactor(api): route uploads through configured default disk"
```

---

### Task 1.3: Document the default-disk-for-dev convention in `.env.example`

**Why:** New devs running `composer setup` need to know to set `FILESYSTEM_DISK=public` locally, otherwise uploads land in `storage/app/private/` and are inaccessible via URL.

**Files:**
- Modify: `aroma-api/.env.example`

**Step 1: Update the example**

Find the line `FILESYSTEM_DISK=local` (around line 37) and change it to:

```
# Local dev: "public" makes uploads accessible via /storage symlink.
# Production: set to "s3" with the R2 keys below.
FILESYSTEM_DISK=public

# S3-compatible storage (used in production via Cloudflare R2).
# Leave these empty locally.
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=auto
AWS_BUCKET=
AWS_ENDPOINT=
AWS_USE_PATH_STYLE_ENDPOINT=true
AWS_URL=
```

(The existing AWS lines at .env.example:59-63 should be replaced with the block above so we have the R2-specific extras like `AWS_ENDPOINT` and `AWS_URL`. Delete the original AWS block; do not leave duplicates.)

**Step 2: Verify a fresh checkout would work**

```bash
diff <(grep -E "^[A-Z_]+=" aroma-api/.env.example | sort -u) <(grep -E "^[A-Z_]+=" aroma-api/.env.example | sort)
```

Expected: no output (no duplicate var names).

**Step 3: Commit**

```bash
git add aroma-api/.env.example
git commit -m "docs(api): clarify dev vs prod filesystem and S3 env vars"
```

---

### Task 1.4: Switch default queue/cache/session to filesystem-free options for prod

**Why:** `.env.example` defaults `QUEUE_CONNECTION=database`, `CACHE_STORE=database`, `SESSION_DRIVER=database`. These all need DB tables (`jobs`, `cache`, `sessions`), which Laravel 11 includes in its default migrations. As long as we run migrations on Render, these work fine. **No code change is needed for this task** — but you must verify the migrations create those tables, because if they don't, production will 500 on the first request.

**Files:**
- Read only: `aroma-api/database/migrations/`

**Step 1: Verify the three tables exist in migrations**

```bash
ls aroma-api/database/migrations | grep -E "(jobs|cache|sessions)"
```

Expected output (or similar):

```
0001_01_01_000000_create_users_table.php
0001_01_01_000001_create_cache_table.php
0001_01_01_000002_create_jobs_table.php
```

The `sessions` table lives in `0001_01_01_000000_create_users_table.php` (Laravel 11 default — confirm by grepping):

```bash
grep -l "Schema::create('sessions'" aroma-api/database/migrations/*.php
```

Expected: at least one match.

**Step 2: If any are missing, stop and ask the user**

If you can't find any one of `sessions`, `cache`, or `jobs` migrations, do NOT proceed. The plan assumes Laravel 11 defaults are present. Report to the user and pause.

**Step 3: No commit (read-only verification).**

---

## Phase 2 — Frontend env hygiene

Goal: make sure neither frontend has localhost URLs that will break in production.

### Task 2.1: Replace storefront localhost fallbacks with hard requirement

**Why:** `aroma/src/mocks/services.ts:7` and `aroma/src/app/(storefront)/layout.tsx:6` both have `'http://localhost:8000'` fallbacks. In production, missing env vars should fail loudly at build time, not silently fall back to localhost (which would 404 in production).

**Files:**
- Create: `aroma/src/lib/api-url.ts`
- Modify: `aroma/src/mocks/services.ts:7`
- Modify: `aroma/src/app/(storefront)/layout.tsx:6`

**Step 1: Create the helper**

Create `aroma/src/lib/api-url.ts` with exactly:

```ts
export function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_API_URL is required in production');
    }
    return 'http://localhost:8000';
  }
  return url;
}
```

**Step 2: Update the two consumers**

In `aroma/src/mocks/services.ts` line 7, replace:

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
```

with:

```ts
import { getApiUrl } from '@/lib/api-url'
const API_URL = getApiUrl()
```

Same change in `aroma/src/app/(storefront)/layout.tsx` line 6.

(Adjust the import path if the project uses a different alias — check `aroma/tsconfig.json` for the `paths` config first. If `@/` isn't configured, use a relative path.)

**Step 3: Verify the build still passes locally**

```bash
cd aroma
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run build
```

Expected: build completes, no errors. Then test the failure case:

```bash
cd aroma
unset NEXT_PUBLIC_API_URL
NODE_ENV=production npm run build 2>&1 | tail -20
```

Expected: build either fails or at least logs the error. (Next.js handles this differently depending on whether the helper is called at build-time vs. request-time; the goal is just to confirm the helper exists and compiles.)

**Step 4: Commit**

```bash
git add aroma/src/lib/api-url.ts aroma/src/mocks/services.ts aroma/src/app/\(storefront\)/layout.tsx
git commit -m "feat(storefront): require NEXT_PUBLIC_API_URL in production builds"
```

---

### Task 2.2: Same treatment for admin

**Why:** `aroma-admin/src/api/client.ts:4` and `aroma-admin/src/views/ProductDetailView.vue:44` both have localhost fallbacks. Same fix pattern.

**Files:**
- Create: `aroma-admin/src/lib/api-url.ts`
- Modify: `aroma-admin/src/api/client.ts:4`
- Modify: `aroma-admin/src/views/ProductDetailView.vue:44`

**Step 1: Create the helper**

Create `aroma-admin/src/lib/api-url.ts`:

```ts
export function getApiUrl(): string {
  const url = import.meta.env.VITE_API_URL
  if (!url) {
    if (import.meta.env.PROD) {
      throw new Error('VITE_API_URL is required in production')
    }
    return 'http://localhost:8000/api'
  }
  return url
}
```

**Step 2: Use it in both files**

In `aroma-admin/src/api/client.ts:4`, replace the `baseURL` line with:

```ts
import { getApiUrl } from '@/lib/api-url'
// ...inside the axios.create call:
  baseURL: getApiUrl(),
```

(Add the import at the top. Keep the rest of the axios config identical.)

In `aroma-admin/src/views/ProductDetailView.vue:44`, replace:

```ts
const BASE    = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
```

with:

```ts
import { getApiUrl } from '@/lib/api-url'
const BASE = getApiUrl()
```

Check `aroma-admin/tsconfig.json` / `vite.config.ts` to confirm the `@` alias exists. If not, use relative imports (`../lib/api-url`).

**Step 3: Verify the build still passes**

```bash
cd aroma-admin
VITE_API_URL=http://localhost:8000/api npm run build
```

Expected: build completes without TypeScript errors (the script runs `vue-tsc` first).

**Step 4: Commit**

```bash
git add aroma-admin/src/lib/api-url.ts aroma-admin/src/api/client.ts aroma-admin/src/views/ProductDetailView.vue
git commit -m "feat(admin): require VITE_API_URL in production builds"
```

---

## Phase 3 — Provision external services

Goal: stand up the three external accounts (Neon, Cloudflare R2, Render) and validate the backend talks to Neon + R2 from your laptop before deploying. **This catches connection / driver issues locally where they're cheap to debug, not on Render where every retry is a 5-minute deploy cycle.**

These steps require the user. **Pause the executor here and have the user create the accounts.** The executor's job is to walk them through it and capture the credentials.

### Task 3.1: Provision Neon PostgreSQL

**User action:** Have the user do this themselves — it requires login.

**Step 1: Ask the user to sign up**

Tell the user:
> Go to https://neon.tech, sign up with GitHub or email (free, no card), and create a project named `aroma-shop`. Pick a region close to where Render hosts (US East is a safe default). When the dashboard shows your connection string (looks like `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require`), paste it here.

**Step 2: Save the connection string to a scratchpad**

DO NOT commit the connection string. Save it to a local-only file the executor can reference but git ignores. Create `aroma-api/.env.deploy` (which is already gitignored by Laravel's default `.gitignore` — verify with `git check-ignore aroma-api/.env.deploy`):

```bash
cd aroma-api
cat > .env.deploy <<'EOF'
# Local-only deployment credentials. DO NOT COMMIT.
NEON_DATABASE_URL=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_ACCOUNT_ID=
R2_PUBLIC_URL=
EOF
git check-ignore .env.deploy  # must print the path
```

Fill in `NEON_DATABASE_URL` with what the user pasted.

**Step 3: No commit (the file is ignored).**

---

### Task 3.2: Provision Cloudflare R2

**User action:** Have the user do this themselves.

**Step 1: Ask the user to set up R2**

Tell the user:
> Go to https://dash.cloudflare.com, sign up (free), and from the sidebar open R2. Create a bucket named `aroma-shop-uploads`. Then:
> 1. Click into the bucket → **Settings** → enable **Public access** (so image URLs are reachable). Note the public URL Cloudflare assigns — looks like `https://pub-xxxx.r2.dev`.
> 2. Go to R2 → **Manage R2 API Tokens** → **Create API token**. Permission: **Object Read & Write**. Scope: this bucket. Copy the Access Key ID, Secret Access Key, and the account ID shown.
> Paste all of those here.

**Step 2: Save credentials to `.env.deploy`**

Fill in the remaining R2 vars. The `R2_PUBLIC_URL` is the `pub-xxxx.r2.dev` URL from step 1.

**Step 3: Test the connection locally**

From `aroma-api/`:

```bash
# Source the deploy-only env, then start the app pointing at R2.
set -a; source .env.deploy; set +a

# Run a tinker session that writes a test file.
php artisan tinker --execute='
  config(["filesystems.default" => "s3"]);
  config(["filesystems.disks.s3" => [
    "driver" => "s3",
    "key" => getenv("R2_ACCESS_KEY_ID"),
    "secret" => getenv("R2_SECRET_ACCESS_KEY"),
    "region" => "auto",
    "bucket" => getenv("R2_BUCKET"),
    "endpoint" => "https://" . getenv("R2_ACCOUNT_ID") . ".r2.cloudflarestorage.com",
    "url" => getenv("R2_PUBLIC_URL"),
    "use_path_style_endpoint" => true,
  ]]);
  Storage::disk("s3")->put("deploy-check.txt", "hello from " . date("c"));
  echo Storage::disk("s3")->url("deploy-check.txt") . PHP_EOL;
'
```

Expected: prints a URL like `https://pub-xxxx.r2.dev/deploy-check.txt`. Curl it:

```bash
curl -s -o /dev/null -w "%{http_code}\n" "$URL_FROM_ABOVE"
```

Expected: `200`.

**If you get errors:**
- `403`: bucket isn't public, or the API token doesn't have write access to it.
- `SignatureDoesNotMatch`: account ID is wrong, or the endpoint format is off.
- `NoSuchBucket`: bucket name typo.

Fix and re-run until you see `200`. **Do not proceed until R2 works locally — the Render setup will repeat the same config, and if it's broken here it'll be broken there.**

**Step 4: Clean up the test file**

```bash
set -a; source .env.deploy; set +a
php artisan tinker --execute='Storage::disk("s3")->delete("deploy-check.txt");'
```

**Step 5: No commit.**

---

### Task 3.3: Provision Render account

**User action:**

Tell the user:
> Go to https://render.com, sign up with GitHub (free, no card needed for free tier). Authorize Render to access this repository. Stop there — don't create a service yet; we'll do that from a `render.yaml` we add to the repo.

No code change yet.

---

## Phase 4 — Deploy the Laravel API to Render

Goal: Render deploys `aroma-api/` on every push to `master`, connected to Neon + R2.

### Task 4.1: Add `render.yaml` at the repo root

**Why:** Render auto-detects `render.yaml` (Render Blueprint) and provisions services from it. Putting it at the repo root with `rootDir: aroma-api` keeps the monorepo intact.

**Files:**
- Create: `render.yaml` (repo root, NOT inside `aroma-api/`)

**Step 1: Write the file**

Create `/Users/suhaib/web_projects/aroma-full-project/render.yaml`:

```yaml
services:
  - type: web
    name: aroma-api
    runtime: php
    plan: free
    rootDir: aroma-api
    buildCommand: |
      composer install --no-dev --optimize-autoloader --no-interaction
      php artisan storage:link || true
      php artisan config:cache
      php artisan route:cache
      php artisan migrate --force
    startCommand: php -S 0.0.0.0:$PORT -t public public/index.php
    healthCheckPath: /up
    autoDeploy: true
    envVars:
      - key: APP_ENV
        value: production
      - key: APP_DEBUG
        value: "false"
      - key: APP_KEY
        generateValue: true
      - key: APP_URL
        sync: false  # set manually after first deploy to the .onrender.com URL
      - key: LOG_CHANNEL
        value: stderr
      - key: LOG_LEVEL
        value: warning
      - key: DB_CONNECTION
        value: pgsql
      - key: DATABASE_URL
        sync: false  # paste Neon connection string in Render dashboard
      - key: SESSION_DRIVER
        value: database
      - key: CACHE_STORE
        value: database
      - key: QUEUE_CONNECTION
        value: sync  # no separate worker on free tier
      - key: FILESYSTEM_DISK
        value: s3
      - key: AWS_ACCESS_KEY_ID
        sync: false
      - key: AWS_SECRET_ACCESS_KEY
        sync: false
      - key: AWS_DEFAULT_REGION
        value: auto
      - key: AWS_BUCKET
        sync: false
      - key: AWS_ENDPOINT
        sync: false  # https://<account-id>.r2.cloudflarestorage.com
      - key: AWS_URL
        sync: false  # the pub-xxx.r2.dev public URL
      - key: AWS_USE_PATH_STYLE_ENDPOINT
        value: "true"
      - key: CORS_ALLOWED_ORIGINS
        sync: false  # filled after Vercel deploys give us URLs
      - key: SANCTUM_STATEFUL_DOMAINS
        value: ""  # bearer-token auth; not used
```

**Why `sync: false`:** Tells Render "do not commit this value to the blueprint; I'll set it in the dashboard." Keeps secrets out of git.

**Why `php -S` instead of Apache:** Render's PHP runtime defaults to Apache, but that requires extra config to make Laravel's `public/` directory the docroot. PHP's built-in server with `-t public` does this in one line and is fine for the free tier's traffic level. **This is not production-grade for high traffic, but it's correct for a free-tier deploy.** Document this tradeoff for future maintainers.

**Step 2: Convert `DATABASE_URL` → individual DB_* vars**

Laravel's `config/database.php` doesn't read `DATABASE_URL` for `pgsql` connections by default — it reads `DB_HOST`, `DB_PORT`, etc. Two options:

- **Option A (simpler):** Set `DB_*` vars individually in Render dashboard, derived from the Neon connection string.
- **Option B (cleaner):** Add a small helper that parses `DATABASE_URL` into the individual vars.

Go with **Option A** — fewer moving parts. Remove `DATABASE_URL` from the `envVars` block above and replace with:

```yaml
      - key: DB_HOST
        sync: false
      - key: DB_PORT
        value: "5432"
      - key: DB_DATABASE
        sync: false
      - key: DB_USERNAME
        sync: false
      - key: DB_PASSWORD
        sync: false
      - key: DB_SSLMODE
        value: require
```

Fix the `render.yaml` you just wrote to use these instead of `DATABASE_URL`.

**Step 3: Verify the file parses**

```bash
# Cheap syntax check
python3 -c "import yaml; yaml.safe_load(open('render.yaml'))" && echo "YAML ok"
```

Expected: `YAML ok`.

**Step 4: Commit and push**

```bash
git add render.yaml
git commit -m "feat(infra): add Render blueprint for Laravel API"
git push origin master
```

---

### Task 4.2: Create the Render service from the blueprint

**User action.** Walk them through it.

**Step 1: Ask the user to do this**

Tell the user:
> 1. Render dashboard → **New +** → **Blueprint**.
> 2. Pick the `aroma-full-project` repo.
> 3. Render reads `render.yaml`, shows the service it'll create. Confirm.
> 4. It'll ask you to fill in the `sync: false` env vars before the first deploy. Use these:
>
> | Var | Value |
> |---|---|
> | `APP_URL` | Leave blank for now — we'll set it after the first deploy gives us the `.onrender.com` URL. |
> | `DB_HOST` | The `ep-xxx.neon.tech` portion of the Neon URL (everything between `@` and `/`) |
> | `DB_DATABASE` | The dbname after the `/` |
> | `DB_USERNAME` | The user before the `:` |
> | `DB_PASSWORD` | The password between `:` and `@` |
> | `AWS_ACCESS_KEY_ID` | From `.env.deploy` → `R2_ACCESS_KEY_ID` |
> | `AWS_SECRET_ACCESS_KEY` | From `.env.deploy` → `R2_SECRET_ACCESS_KEY` |
> | `AWS_BUCKET` | From `.env.deploy` → `R2_BUCKET` (`aroma-shop-uploads`) |
> | `AWS_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` using the account ID from `.env.deploy` |
> | `AWS_URL` | From `.env.deploy` → `R2_PUBLIC_URL` (the `pub-xxx.r2.dev` URL) |
> | `CORS_ALLOWED_ORIGINS` | Leave blank for now — we'll fill after Vercel deploys. |
>
> 5. Click **Apply**. Render will start the build. Watch the logs.
> 6. When it finishes, copy the `.onrender.com` URL (e.g. `https://aroma-api-abcd.onrender.com`) and paste it here.

**Step 2: After the user pastes the URL, set `APP_URL`**

Tell the user:
> In the Render dashboard, edit the `APP_URL` env var to be exactly the URL you just sent me (no trailing slash). Save. This triggers a redeploy.

**Step 3: Wait for redeploy, then verify health**

```bash
# Substitute the real URL:
RENDER_URL="https://aroma-api-abcd.onrender.com"
curl -s -o /dev/null -w "Health: %{http_code}\n" "$RENDER_URL/up"
```

Expected: `Health: 200`. If 503, the app is still cold-starting — wait 30s and retry. If 500, check Render logs (linked in the dashboard) for the actual error and fix before proceeding.

---

### Task 4.3: Seed the production database

**Why:** Migrations ran during the build (`php artisan migrate --force` in `buildCommand`), but the tables are empty. The Vue admin needs at least one admin user to log in.

**Step 1: Run `AdminUserSeeder` via Render shell**

Tell the user:
> In the Render dashboard, open the `aroma-api` service → **Shell** tab → start a session. Then run:
>
> ```bash
> php artisan db:seed --class=AdminUserSeeder --force
> ```
>
> Tell me the output. (If the seeder hardcodes a password, note it — that's the initial admin login.)

**Step 2: If the seeder is interactive or hardcoded with weak credentials, stop and fix**

Read `aroma-api/database/seeders/AdminUserSeeder.php` first to know what password gets set. If it's a hardcoded weak password like `password`, this is a deployment risk — flag it to the user and either (a) update the seeder to read from env, or (b) skip the seeder and create the admin manually via `php artisan tinker`. Don't ship `password`/`password` to production.

**Step 3: Verify login works against the deployed API**

```bash
RENDER_URL="https://aroma-api-abcd.onrender.com"
# Adjust the phone/password to whatever the seeder uses:
curl -s -X POST "$RENDER_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"...","password":"..."}'
```

Expected: JSON with a `token` field. If you get `Invalid credentials`, the seeder didn't run or the credentials are wrong. If you get a CORS error, it's a different problem (CORS doesn't gate API tools like curl).

---

### Task 4.4: Smoke-test public API endpoints

**Step 1: Run a quick survey of read endpoints**

```bash
RENDER_URL="https://aroma-api-abcd.onrender.com"

for path in /up /api/products /api/categories /api/brands; do
  echo -n "$path: "
  curl -s -o /dev/null -w "%{http_code}\n" "$RENDER_URL$path"
done
```

Expected: all `200`. If any 404, the route doesn't exist (check `routes/api.php`). If 500, check Render logs.

**Step 2: Verify product seed data is there**

```bash
curl -s "$RENDER_URL/api/products?per_page=3" | python3 -m json.tool | head -30
```

Expected: at least one product object with name, price, etc. If the response is empty, the `ProductSeeder` didn't run — re-run it from the Render shell same as the admin seeder.

**Step 3: No code change, no commit.** Phase 4 is done when all four endpoints return 200.

---

## Phase 5 — Deploy the Vue admin to Vercel

### Task 5.1: Connect admin to Vercel

**User action.**

Tell the user:
> 1. Go to https://vercel.com, sign up with GitHub (free).
> 2. **Add New → Project** → pick `aroma-full-project`.
> 3. In the config screen: **Root Directory** → click **Edit** → select `aroma-admin`. **Framework Preset** → it should auto-detect Vite. Leave the build command and output directory at the defaults (`npm run build` and `dist`).
> 4. **Environment Variables** → add `VITE_API_URL` = `<your-render-url>/api` (e.g. `https://aroma-api-abcd.onrender.com/api`). Scope: Production, Preview, Development.
> 5. Deploy. When it finishes, paste the `.vercel.app` URL here.

**Step 1: When the user pastes the URL, verify the SPA loads**

```bash
ADMIN_URL="https://aroma-admin-xyz.vercel.app"
curl -s -o /dev/null -w "%{http_code}\n" "$ADMIN_URL"
```

Expected: `200`. Then open it in a browser — should see the admin login screen.

---

### Task 5.2: Add admin URL to backend CORS

**Why:** Until we add `<admin>.vercel.app` to `CORS_ALLOWED_ORIGINS` on Render, the browser will block every XHR from the admin to the API.

**Step 1: Update the Render env var**

Tell the user:
> In Render → `aroma-api` service → **Environment** → edit `CORS_ALLOWED_ORIGINS`. Set its value to exactly:
>
> ```
> https://aroma-admin-xyz.vercel.app
> ```
>
> (Substitute the real URL. No trailing slash, no quotes, no spaces.) Save. This triggers a redeploy — wait for it.

**Step 2: Verify the admin can talk to the API**

Tell the user to open the admin URL in a browser and try to log in with the seeded admin credentials. If they see a CORS error in the console, the origin string is wrong (mismatched protocol, trailing slash, typo).

If login works → done. If not → debug:
- Open the admin in the browser, devtools → Network tab → click the failed login request → check the response status and the `Access-Control-Allow-Origin` header.
- Read the Render logs for the request to see if the API even received it.

---

## Phase 6 — Deploy the Next.js storefront to Vercel

### Task 6.1: Connect storefront to Vercel

**User action.**

Tell the user:
> Same as the admin, but pick a different root directory:
> 1. Vercel → **Add New → Project** → pick the same repo.
> 2. **Root Directory** → `aroma`.
> 3. **Framework Preset** → Next.js (auto-detected).
> 4. **Environment Variables** → `NEXT_PUBLIC_API_URL` = `<your-render-url>` (e.g. `https://aroma-api-abcd.onrender.com` — note: **no** `/api` suffix; the storefront code appends paths itself, unlike the admin's axios baseURL which already includes `/api`). Cross-check this against `aroma/src/mocks/services.ts:7` and `aroma/src/app/(storefront)/layout.tsx:6` to confirm whether `/api` should be in the var or not. Whichever the existing code expects, match it.
> 5. Deploy. Paste the URL.

**Step 1: Verify the storefront renders**

```bash
STOREFRONT_URL="https://aroma-vercel-url.vercel.app"
curl -s -o /dev/null -w "%{http_code}\n" "$STOREFRONT_URL"
```

Expected: `200`. Open in a browser — products page should render. If you get a build failure on Vercel, it's likely the `getApiUrl()` helper throwing because `NEXT_PUBLIC_API_URL` isn't set in the environment — re-check.

---

### Task 6.2: Add storefront URL to backend CORS

**Step 1: Update Render env again**

Tell the user:
> Render → `aroma-api` → Environment → `CORS_ALLOWED_ORIGINS`. Append the storefront URL, comma-separated. Final value:
>
> ```
> https://aroma-admin-xyz.vercel.app,https://aroma-vercel-url.vercel.app
> ```
>
> (No spaces around the comma — the trim in `config/cors.php` handles it, but be consistent.) Save and let it redeploy.

**Step 2: Verify end-to-end**

Open the storefront in a browser. Browse products (should load from Render). Add to cart (if the cart talks to the API, that's the real CORS test). Check the console for any blocked requests.

---

## Phase 7 — Cross-app smoke test and docs

### Task 7.1: Run the full happy-path manually

This is the gate. If any of these fail, the deployment is not done.

**Checklist (user runs these from a browser):**

- [ ] Storefront homepage renders, shows seeded products
- [ ] Product detail page loads, shows images **(this is the R2 test — if images 404, R2 isn't wired correctly)**
- [ ] Admin login page loads
- [ ] Admin login succeeds with seeded credentials
- [ ] Admin can list products
- [ ] Admin can upload a new brand logo → it appears in the brand list with a valid image URL pointing to `pub-xxx.r2.dev` **(end-to-end R2 write test)**
- [ ] After the upload, view the same brand in the storefront (if exposed) — image renders

**If any step fails:**
- Browser console + Network tab is your friend.
- Render logs (Render dashboard → service → Logs).
- Vercel logs (Vercel dashboard → project → deployments → latest → Functions / Build logs).

**Do NOT mark this task complete based on "the code looks right." Run the checklist.** This is what superpowers:verification-before-completion is for.

---

### Task 7.2: Document the deployment

**Files:**
- Create: `docs/DEPLOYMENT.md`

**Step 1: Write the doc**

Create `/Users/suhaib/web_projects/aroma-full-project/docs/DEPLOYMENT.md` covering:

1. **Architecture diagram** (ASCII is fine) — what runs where.
2. **Production URLs** — Render URL, both Vercel URLs.
3. **External services** — Neon (with link to dashboard, NO connection string), Cloudflare R2 (link to bucket, NO credentials), Render, Vercel.
4. **How to redeploy** — `git push` to master triggers all three (Render via auto-deploy, Vercel by default).
5. **How to run migrations** — Render dashboard → service → Shell → `php artisan migrate --force`.
6. **How to roll back** — Render dashboard → Deploys → pick a previous build → Redeploy. Vercel same idea.
7. **Known limitations** — cold start on Render free tier, no separate queue worker (jobs run sync), no monitoring, no custom domain.
8. **Cost** — All free at current scale. When you outgrow free tiers: Render $7/mo, Neon $0 → $19, Vercel $0 → $20, R2 stays free under 10 GB.

Aim for 200–400 lines, not more.

**Step 2: Commit**

```bash
git add docs/DEPLOYMENT.md
git commit -m "docs: add deployment guide for Render + Vercel + Neon + R2"
git push origin master
```

(Per `feedback_merge_strategy.md` — directly to master, no PR ceremony.)

---

## Done criteria

The plan is complete when:

1. All seven phases done, all checkboxes in Task 7.1 ticked.
2. `docs/DEPLOYMENT.md` exists and is accurate.
3. `.env.deploy` exists locally with the live credentials and is git-ignored (verify one more time before signing off).
4. `git status` is clean on master.

## Known follow-ups (NOT in this plan)

Flag these for the user at the end so they don't get forgotten:

- **Custom domain** (e.g. `aromashop.ly`) — both Render and Vercel support this in the dashboard; needs DNS changes at the registrar.
- **Cold-start mitigation** — pinger service (UptimeRobot free) hitting `/up` every 14 minutes keeps Render warm. Or upgrade to Render's $7/mo plan.
- **Error tracking** — Sentry's free tier (Laravel + Next.js + Vue all supported).
- **Cron jobs** — Render's free tier doesn't include cron. If the API needs scheduled tasks (`php artisan schedule:run`), use a free cron service (cron-job.org) hitting a webhook route.
- **CI** — add GitHub Actions to run `composer test` on every PR before merge.
- **DB backups** — Neon free tier has 7-day point-in-time recovery built in, which is good. Document this.

---

## Execution

After the plan is approved:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best if you want to watch the work happen and stay in control.

**2. Parallel Session (separate)** — Open a new session, point it at this plan, executor uses `superpowers:executing-plans` to work through batched phases with checkpoints. Best if you want to step away.

**Which approach?**
