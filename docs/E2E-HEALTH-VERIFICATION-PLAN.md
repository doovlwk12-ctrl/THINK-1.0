# E2E Health Verification Plan – Order Lifecycle

This document outlines how to verify the full lifecycle of a core operation (Creating an Order) from "Zero" (frontend load) to "Done" (transaction success and UI update). It can be implemented as a **Playwright test** or run manually.

---

## Flow to Validate

| Step | Name | What to verify |
|------|------|----------------|
| 1 | **Zero** | User visits site → frontend loads (no critical JS errors, main content visible). |
| 2 | **Auth handshake** | User logs in → session established → cookies set (e.g. `sb-*-auth-token` or NextAuth session). |
| 3 | **Transaction** | User sends `POST /api/orders` (e.g. from order creation flow). |
| 4 | **Backend** | Server: Zod schema validation, auth (RLS / permission check), insert into DB (Prisma/Supabase). |
| 5 | **Last operation** | Success response to UI; optional: webhooks/notifications (e.g. WhatsApp, in-app). |

---

## 1. The "Zero" Point – Frontend Loads

**Manual:** Open `/`, ensure homepage renders, no red errors in console.

**Playwright example:**

```ts
await test('homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
  // Optional: check for critical element (e.g. header or CTA)
  await expect(page.getByRole('link', { name: /تسجيل|دخول|الرئيسية/ })).toBeVisible()
})
```

---

## 2. Auth Handshake – Login & Session

**Manual:** Log in as CLIENT; in DevTools → Application → Cookies, confirm session cookies exist (e.g. Supabase or NextAuth).

**Playwright example:**

```ts
await test('login sets session cookies', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/بريد|email/i).fill('client@example.com')
  await page.getByLabel(/كلمة المرور|password/i).fill('password')
  await page.getByRole('button', { name: /دخول|تسجيل/i }).click()
  await expect(page).toHaveURL(/\/(dashboard|orders)/)
  const cookies = await page.context().cookies()
  const hasAuth = cookies.some(c => c.name.includes('auth') || c.name.includes('sb-'))
  expect(hasAuth).toBeTruthy()
})
```

Use a test user (and optionally a test DB) so credentials are stable.

---

## 3. The Transaction – POST /api/orders

**Manual:** Complete the order-creation flow in the UI until "Create order" is clicked; in Network tab confirm `POST /api/orders` returns 200 and a JSON body with an order id.

**Playwright example:**

```ts
await test('order creation POST succeeds', async ({ page }) => {
  await loginAsClient(page) // helper that does login and navigates to dashboard
  await page.goto('/orders/select-package')
  // Select package, fill minimal form, go to create step…
  const res = await page.request.post('/api/orders', {
    data: { packageId: '...', formData: { ... } }, // match your create order schema
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(body.success).toBe(true)
  expect(body.order?.id).toBeDefined()
})
```

Alternatively, use `page.goto` and form submission, then wait for navigation or a success message and assert on the next URL or DOM.

---

## 4. Backend Processing – Validation, RLS, Insert

**What the backend does (no direct E2E test of RLS; inferred by success/failure):**

- **Zod:** Invalid body → 400 with message.
- **Auth:** Missing or wrong role (e.g. CLIENT only) → 401/403.
- **RLS / permission:** Your API uses `requireAuth` and checks `clientId` / `engineerId`; unauthorized user → 403.
- **Insert:** Success → 200 and order in DB.

**Playwright:** Same as step 3; if you want to assert "backend validated", send an invalid payload and expect 400:

```ts
const bad = await page.request.post('/api/orders', { data: {} })
expect(bad.status()).toBe(400)
```

---

## 5. Last Operation – Success in UI & Optional Notifications

**Manual:** After creating an order, confirm redirect to order detail or orders list, and that the new order appears. If you have in-app notifications or webhooks, confirm they fire (e.g. check DB or logs).

**Playwright example:**

```ts
await test('after order create, UI shows success and order', async ({ page }) => {
  // … create order via UI or API …
  await expect(page.getByText(/تم إنشاء الطلب|success|تم بنجاح/i)).toBeVisible()
  await expect(page).toHaveURL(/\/orders\/[a-z0-9-]+/)
})
```

---

## Suggested Playwright Structure

- **File:** e.g. `e2e/order-lifecycle.spec.ts`.
- **Before:** Seed or use a test user and a known package id.
- **Tests:**
  1. `homepage loads` (Zero).
  2. `login sets session` (Auth handshake).
  3. `create order POST returns 200 and order id` (Transaction + Backend).
  4. `invalid create order returns 400` (Backend validation).
  5. `after create order, UI shows order` (Last operation).

This gives you a single E2E suite that validates the full lifecycle from connection to transaction success.
