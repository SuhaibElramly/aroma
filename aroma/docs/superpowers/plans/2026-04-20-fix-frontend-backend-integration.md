# Fix Frontend–Backend Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all integration errors between the Next.js frontend and the Laravel 11 API so that registration, login, and every authenticated action work correctly in the browser.

**Architecture:** All fixes are in the frontend service layer (`src/mocks/services.ts`) and one type definition (`src/types/index.ts`). The backend is correct; the frontend is either sending wrong headers, missing fields, or mishandling wrapped API responses.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Laravel 11 Sanctum (bearer token), fetch API

---

## Root Cause Summary

| # | Problem | Effect | Location |
|---|---------|--------|----------|
| 1 | `Accept: application/json` missing from every fetch call | Laravel returns 302 redirect instead of JSON on validation error | `services.ts` – all functions |
| 2 | `authHeaders()` only adds `Authorization`, never `Accept` | Authenticated requests also redirect on error | `services.ts:14` |
| 3 | `password_confirmation` not in `RegisterPayload` type or sent to API | API validation always fails silently | `types/index.ts`, `services.ts`, `RegisterPageClient.tsx` |
| 4 | `updateProfile` and `changePassword` call `res.json()` raw | Returns `{data:{...}}` object instead of `User` | `services.ts:157,167` |
| 5 | `getHomePageData` returns raw `res.json()` | Returns full object; components must handle correctly | `services.ts:23` |

---

## Files

| File | Change |
|------|--------|
| `src/mocks/services.ts` | Add `Accept: application/json` to every fetch; fix `authHeaders()`; fix `updateProfile`/`changePassword` response unwrapping |
| `src/types/index.ts` | Add `password_confirmation` to `RegisterPayload` |
| `src/features/auth/RegisterPageClient.tsx` | Pass `password_confirmation` in `services.register()` call |

---

## Task 1: Add `Accept: application/json` to `authHeaders()` helper

This fixes every authenticated request (cart, wishlist, orders, addresses, profile) in one change.

**Files:**
- Modify: `src/mocks/services.ts:14-17`

- [ ] **Step 1: Update `authHeaders()` to always include `Accept`**

Replace the existing `authHeaders` function:

```typescript
function authHeaders(): HeadersInit {
  const token = getToken()
  return {
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}
```

- [ ] **Step 2: Verify the function looks correct**

```bash
grep -A 5 "function authHeaders" /Users/suhaib/web_projects/aroma-full-project/aroma/src/mocks/services.ts
```

Expected output:
```
function authHeaders(): HeadersInit {
  const token = getToken()
  return {
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add src/mocks/services.ts
git commit -m "fix: add Accept header to authHeaders() helper"
```

---

## Task 2: Add `Accept: application/json` to unauthenticated POST requests

`login` and `register` don't use `authHeaders()`, so they need the header added explicitly.

**Files:**
- Modify: `src/mocks/services.ts:128-148`

- [ ] **Step 1: Update `login` function headers**

```typescript
export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error('Invalid email or password')
  return res.json()
}
```

- [ ] **Step 2: Update `register` function headers**

```typescript
export async function register(payload: RegisterPayload): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Registration failed')
  }
  return res.json()
}
```

- [ ] **Step 3: Verify both functions have the Accept header**

```bash
grep -A 4 "api/auth/login\|api/auth/register" /Users/suhaib/web_projects/aroma-full-project/aroma/src/mocks/services.ts | grep "Accept"
```

Expected: two lines showing `'Accept': 'application/json'`

- [ ] **Step 4: Test login endpoint directly from terminal**

```bash
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"email":"wrong@example.com","password":"wrong"}' | jq .
```

Expected: `{"message":"Invalid credentials"}` with no redirect.

- [ ] **Step 5: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add src/mocks/services.ts
git commit -m "fix: add Accept header to login and register fetch calls"
```

---

## Task 3: Fix `password_confirmation` missing from registration

The Laravel API uses `confirmed` validation rule, which requires a `password_confirmation` field. The frontend type, service call, and form submission all need updating.

**Files:**
- Modify: `src/types/index.ts:157-161`
- Modify: `src/mocks/services.ts` (no change needed — payload forwarded as-is)
- Modify: `src/features/auth/RegisterPageClient.tsx:46-55`

- [ ] **Step 1: Add `password_confirmation` to `RegisterPayload` type**

In `src/types/index.ts`, find and update the `RegisterPayload` interface:

```typescript
export interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
}
```

- [ ] **Step 2: Pass `password_confirmation` in the form submission**

In `src/features/auth/RegisterPageClient.tsx`, update the `onSubmit` function:

```typescript
const onSubmit = async (data: RegisterValues) => {
  setApiError('')
  try {
    const { user, token } = await services.register({
      name:                  data.name,
      email:                 data.email,
      password:              data.password,
      password_confirmation: data.confirm,
    })
    localStorage.setItem('token', token)
    storeLogin(user)
    showToast('Account created — welcome to Aroma ✦')
    router.push('/profile')
  } catch (err: unknown) {
    setApiError(err instanceof Error ? err.message : 'Something went wrong')
  }
}
```

> **Note:** Check the actual field name used in the form schema. Run:
> ```bash
> grep -n "confirm\|password_confirmation" /Users/suhaib/web_projects/aroma-full-project/aroma/src/lib/schemas.ts
> ```
> Use whatever field name the schema defines for the confirmation field.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Test full registration flow from terminal**

```bash
TIMESTAMP=$(date +%s%N | cut -b1-13)
curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Origin: http://localhost:3000" \
  -d "{
    \"name\": \"Test User\",
    \"email\": \"test$TIMESTAMP@example.com\",
    \"password\": \"TestPass123\",
    \"password_confirmation\": \"TestPass123\"
  }" | jq .
```

Expected:
```json
{
  "user": { "id": ..., "name": "Test User", "email": "...", "phone": null },
  "token": "..."
}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add src/types/index.ts src/features/auth/RegisterPageClient.tsx
git commit -m "fix: send password_confirmation in register payload"
```

---

## Task 4: Fix `updateProfile` and `changePassword` response unwrapping

These return `res.json()` directly, but the API wraps the User in a `UserResource` which adds a `data` key. They need the same `json.data || json` pattern used elsewhere.

**Files:**
- Modify: `src/mocks/services.ts` — `updateProfile` and `changePassword` functions

- [ ] **Step 1: Fix `updateProfile` to unwrap `.data`**

```typescript
export async function updateProfile(userId: string, updates: Partial<User>): Promise<User> {
  const res = await fetch(`${API_URL}/api/user`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update profile')
  const json = await res.json()
  return json.data || json
}
```

- [ ] **Step 2: Verify `changePassword` doesn't need unwrapping**

The API returns an empty 204 response for password change, so no body parsing is needed. Confirm:

```bash
grep -A 15 "changePassword" /Users/suhaib/web_projects/aroma-full-project/aroma-api/app/Http/Controllers/Api/AuthController.php
```

If the controller returns `response()->noContent()` or `204`, no change needed. If it returns a User resource, add `const json = await res.json(); return json.data || json`.

- [ ] **Step 3: Test profile update from terminal**

```bash
TIMESTAMP=$(date +%s%N | cut -b1-13)
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d "{\"name\":\"T\",\"email\":\"t$TIMESTAMP@t.com\",\"password\":\"TestPass123\",\"password_confirmation\":\"TestPass123\"}" | jq -r '.token')

curl -s -X PATCH http://localhost:8000/api/user \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Updated Name"}' | jq .
```

Expected: `{"data": {"id":...,"name":"Updated Name",...}}`

- [ ] **Step 4: Commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add src/mocks/services.ts
git commit -m "fix: unwrap .data from updateProfile response"
```

---

## Task 5: End-to-end browser verification

Verify the full registration and login flow works in the browser without any 302 redirects or console errors.

**Files:** None — verification only.

- [ ] **Step 1: Restart both servers fresh**

```bash
# API
pkill -f "php artisan serve"; sleep 1
cd /Users/suhaib/web_projects/aroma-full-project/aroma-api
php artisan serve --host=127.0.0.1 --port=8000 > /tmp/api.log 2>&1 &
sleep 2

# Frontend
pkill -f "next dev"; sleep 1
cd /Users/suhaib/web_projects/aroma-full-project/aroma
npm run dev > /tmp/next.log 2>&1 &
sleep 5

curl -s http://localhost:8000/api/health | jq .
# Expected: {"status":"ok"}

curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/register
# Expected: 200
```

- [ ] **Step 2: Open browser to `http://localhost:3000/register`**

Open DevTools → Network tab. Filter by `Fetch/XHR`.

- [ ] **Step 3: Submit the registration form**

Fill in:
- Full Name: any name
- Email: a new unique email
- Password: `TestPass123`
- Confirm Password: `TestPass123`

Click the submit button.

- [ ] **Step 4: Verify network request**

In DevTools Network tab, the `register` request should show:
- Status: `201`
- Response: `{"user":{...},"token":"..."}`
- No redirect to `localhost:3000/`

- [ ] **Step 5: Verify redirect to profile page**

After successful registration, the browser should redirect to `/profile` and display the user's name.

- [ ] **Step 6: Test login with the same credentials**

Navigate to `http://localhost:3000/login`, enter the same email and password. Should redirect to `/profile` with status `200` in Network tab.

- [ ] **Step 7: Final commit**

```bash
cd /Users/suhaib/web_projects/aroma-full-project/aroma
git add -A
git commit -m "fix: complete frontend-backend integration — auth and headers"
```
