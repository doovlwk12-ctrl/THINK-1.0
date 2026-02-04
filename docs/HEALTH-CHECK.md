# System Health Check API

## Endpoint

- **URL:** `GET /api/system/health`
- **Purpose:** Deep diagnostic of backend stack (Database, Auth, Storage). Returns a JSON report with latency and per-component status.

## Authorization

The route is protected. Use **one** of:

1. **Secret key (recommended for automation / Vercel cron):**
   - Set `HEALTH_CHECK_SECRET` in your environment.
   - Call with header: `x-health-secret: <HEALTH_CHECK_SECRET>`
   - Or query: `?secret=<HEALTH_CHECK_SECRET>`

2. **Admin session:**
   - Call the endpoint while logged in as an **Admin** (cookies sent). No secret needed.

Unauthorized requests receive `401` with a hint.

## Response

- **200:** All checks passed (`success: true`).
- **503:** One or more checks failed (`success: false`). Body still contains the full report.

### Report shape

| Field | Description |
|-------|-------------|
| `timestamp` | ISO time of the check |
| `totalLatencyMs` | Total time to run all checks |
| `env` | Booleans: `database`, `supabaseUrl`, `supabaseAnon`, `serviceRoleKey` (env vars present) |
| `database` | `ok`, `latencyMs`, optional `detail.count` (user count); or `error` / `code` on failure |
| `auth` | `ok`, `latencyMs`, optional `detail`; or `error` / `code` on failure (Supabase Service Role + listUsers) |
| `storage` | `ok`, `latencyMs`, optional `detail.buckets` (bucket names); or `error` / `code` on failure |
| `summary` | Array of short human-readable status lines |

### Example (healthy)

```json
{
  "success": true,
  "timestamp": "2025-02-04T12:00:00.000Z",
  "totalLatencyMs": 245,
  "env": {
    "database": true,
    "supabaseUrl": true,
    "supabaseAnon": true,
    "serviceRoleKey": true
  },
  "database": { "ok": true, "latencyMs": 12, "detail": { "count": 42 } },
  "auth": { "ok": true, "latencyMs": 89, "detail": { "sessionValidation": "Service role can list users; ..." } },
  "storage": { "ok": true, "latencyMs": 120, "detail": { "buckets": ["avatars"] } },
  "summary": [
    "Database: OK (12ms, 42 users)",
    "Auth: OK (89ms, service role valid, 1 sample)",
    "Storage: OK (120ms, buckets: avatars)"
  ]
}
```

### Example (failure)

If the database is unreachable, you'll see something like:

```json
{
  "success": false,
  "database": { "ok": false, "error": "Can't reach database server", "code": "Error" },
  "summary": [ "Database: FAILED - Can't reach database server", ... ]
}
```

## Checks performed

1. **Database (Prisma)**  
   Runs `SELECT count(*) FROM "User"` and measures latency. Confirms connectivity and that the schema is reachable.

2. **Auth (Supabase)**  
   Verifies `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` are set, creates the admin client, and calls `auth.admin.listUsers({ perPage: 1 })`. Confirms the service role works; session validation in the app is done by middleware/getApiAuth using the same stack.

3. **Storage (Supabase Storage)**  
   Uses the same admin client to call `storage.listBuckets()`. Confirms Storage API is reachable and listable. If no buckets exist, the check still passes with `buckets: []`.

## Vercel / cron

You can call this from a cron job or monitoring:

```bash
curl -s -H "x-health-secret: $HEALTH_CHECK_SECRET" "https://your-app.vercel.app/api/system/health"
```

Set `HEALTH_CHECK_SECRET` in Vercel Environment Variables (and optionally in `.env` locally).
