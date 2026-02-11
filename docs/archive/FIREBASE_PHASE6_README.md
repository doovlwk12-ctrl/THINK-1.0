# Phase 6: Frontend Firebase Auth + API Client

## Summary

- **Firebase client SDK** is used only when `NEXT_PUBLIC_USE_FIREBASE_AUTH=true`.
- **Unified auth** via `useAuth()`: returns session from Firebase Auth or NextAuth depending on env.
- **API client** (`lib/api.ts`): when Firebase is enabled, uses Cloud Functions base URL and adds `Authorization: Bearer <idToken>`.
- **Login/Register**: use Firebase Auth when enabled; otherwise NextAuth/Next.js API.
- **Middleware**: when Firebase Auth is enabled, auth check is skipped (client-side redirect on protected routes).

## Setup

1. **Install dependencies** (required for build; Firebase client is in `package.json`):
   ```bash
   npm install
   ```

2. **Environment variables** (optional; only for Firebase mode). Add to `.env`:
   ```env
   NEXT_PUBLIC_USE_FIREBASE_AUTH=true
   NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL=https://us-central1-YOUR_PROJECT.cloudfunctions.net
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT
   ```

3. **CSP (Content-Security-Policy)**: When using Firebase, the app calls Cloud Functions (different origin). Ensure `connect-src` in your headers allows the Functions URL (e.g. add `https://*.cloudfunctions.net` or your exact URL). See `next.config.js` headers.

## Files Added/Updated

- `lib/firebaseClient.ts` – init Firebase app/auth only when config present.
- `lib/apiTokenGetter.ts` – module-level token getter for API client.
- `lib/api.ts` – when Firebase: base URL = Functions, add Bearer token; map `/auth/register` → `/apiRegister`.
- `components/providers/FirebaseAuthProvider.tsx` – Firebase auth state, role from Firestore/custom claims, signIn/signOut, sets token getter.
- `hooks/useAuth.ts` – unified hook: Firebase or NextAuth session, signIn, signOut, update.
- `app/layout.tsx` – wrapped with `FirebaseAuthProvider`.
- `app/(auth)/login/page.tsx` – uses `useAuth()` for sign-in and redirect by role.
- `app/(auth)/register/page.tsx` – unchanged; `apiClient.post('/auth/register', ...)` goes to Functions when Firebase.
- `components/layout/Header.tsx` – uses `useAuth()` and passes `onSignOut` to UserMenu.
- `components/layout/UserMenu.tsx` – accepts optional `onSignOut`; uses it when provided.
- `middleware.ts` – when `NEXT_PUBLIC_USE_FIREBASE_AUTH=true`, skips NextAuth and allows all (client-side protection).
- All protected pages – `useSession` replaced with `useAuth()` (dashboard, orders, admin, engineer).

## Behaviour

- **Without Firebase** (`NEXT_PUBLIC_USE_FIREBASE_AUTH` unset or not `true`): NextAuth + Next.js API as before; middleware enforces auth.
- **With Firebase**: Firebase Auth for login/signOut; register via Cloud Function `apiRegister`; API client calls Functions URL with ID token; middleware does not check auth (pages redirect unauthenticated users on the client).

## Acceptance (Phase 6)

- [ ] With Firebase disabled: login, register, protected routes, API calls work as before.
- [ ] With Firebase enabled: login with email/password, redirect by role; register creates user in Firebase + Firestore; signOut; API client sends Bearer token to Functions; protected pages redirect to login when not authenticated.
