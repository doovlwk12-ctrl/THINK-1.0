# Phase 7: Deploy Config and Final Test Checklist

## Deploy Configuration

### 1. Functions environment variables

Set any required env vars for Cloud Functions (Firebase Console → Functions → config, or `.env` in `functions/` with Firebase Admin):

- No external integrations required for Phase 5/6 (apiRegister only); add as you migrate more API routes.

### 2. Deploy Functions

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

Or from project root (predeploy in `firebase.json` runs `npm run build` in `functions/`):

```bash
firebase deploy --only functions
```

Note: `firebase.json` includes a predeploy step: `npm --prefix "$RESOURCE_DIR" run build` so TypeScript is compiled before deploy.

### 3. Deploy frontend (Hosting)

**Option A – Static export (current setup)**  
`firebase.json` points `hosting.public` to `public`. For a static Next.js export:

1. Add `output: 'export'` in `next.config.js` (if not already) and run `npm run build`; copy `out/` contents to `public/` (or point hosting to `out`).
2. Or keep serving a pre-built static site from `public/` and deploy:

```bash
firebase deploy --only hosting
```

**Option B – Next.js with SSR**  
Use a Node-capable host (e.g. Vercel, Firebase App Hosting, or another Node host). Keep calling the same Cloud Functions URL from the client; do not deploy Next.js API routes for migrated endpoints.

### 4. Authorized domains and CORS

- **Firebase Authentication → Authorized domains:** Add your production domain (e.g. `your-app.web.app`, `your-domain.com`) so sign-in works.
- **Cloud Functions CORS:** Functions in this project set `Access-Control-Allow-Origin` (e.g. in `register.ts`). For production, restrict to your front-end origin instead of `*` if required by policy.

### 5. CSP (Content-Security-Policy)

When using Firebase Auth and Cloud Functions from the browser, allow the Functions origin in `connect-src` (e.g. in `next.config.js` headers):

- Example: add `https://us-central1-YOUR_PROJECT.cloudfunctions.net` (or your region/project) to the `connect-src` list so the client can call the Functions URL.

---

## Final test checklist (production)

Run these on the **deployed URL** after deploy.

### Auth and roles

- [ ] **Login (client):** Sign in with email/password → redirect to `/dashboard`.
- [ ] **Login (engineer):** Sign in → redirect to `/engineer/dashboard`.
- [ ] **Login (admin):** Sign in → redirect to `/admin/dashboard`.
- [ ] **Register:** New account created; redirect to login; can sign in.
- [ ] **Sign out:** Sign out from header → redirect to login.

### Client flows

- [ ] **Create order:** Create order from dashboard; select package; flow completes.
- [ ] **Order detail:** Open an order; see details and chat (if applicable).
- [ ] **Payment:** Payment step works (if implemented).
- [ ] **Plans:** Upload/view plans (Firebase Storage when enabled).

### Engineer flows

- [ ] **Engineer dashboard:** List of orders; open order; start work.
- [ ] **Chat:** Send/receive messages on an order.
- [ ] **Revisions:** Create/view revisions (if implemented).
- [ ] **Plan upload:** Upload plan; file appears in Storage and in client view.

### Admin flows

- [ ] **Admin dashboard:** Stats and overview load.
- [ ] **Packages:** List/create/edit packages.
- [ ] **Orders:** List/filter orders.
- [ ] **Engineers:** List applications; approve/reject (if implemented).

### Platform checks

- [ ] No unexpected errors in browser console.
- [ ] Firebase Console: no unexpected errors in Functions, Firestore, or Storage logs.
- [ ] Rate limiting / abuse protection behaves as expected (if configured).

---

## Reference

- **Scope and API list:** FIREBASE_MIGRATION_SCOPE.md  
- **Acceptance tests (all phases):** FIREBASE_ACCEPTANCE_TESTS.md  
- **Phase 6 (frontend auth):** FIREBASE_PHASE6_README.md  
