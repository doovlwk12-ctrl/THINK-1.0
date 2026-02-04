/**
 * Deep Diagnostic API: /api/system/health
 *
 * Secured by HEALTH_CHECK_SECRET (header x-health-secret or query ?secret=) or Admin session.
 * Performs live checks: Database (Prisma), Auth (Supabase Service Role), Storage (Supabase Storage).
 * Returns a JSON report with status, latency, and exact failure points.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/server'
import { getApiAuth } from '@/lib/getApiAuth'

const HEALTH_SECRET = process.env.HEALTH_CHECK_SECRET

type CheckResult<T = unknown> =
  | { ok: true; latencyMs?: number; detail?: T }
  | { ok: false; error: string; code?: string }

async function authorize(request: NextRequest): Promise<boolean> {
  if (HEALTH_SECRET && HEALTH_SECRET.length > 0) {
    const headerSecret = request.headers.get('x-health-secret')
    const querySecret = request.nextUrl.searchParams.get('secret')
    if (headerSecret === HEALTH_SECRET || querySecret === HEALTH_SECRET) {
      return true
    }
  }
  const auth = await getApiAuth(request)
  return auth?.role === 'ADMIN'
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now()

  if (!(await authorize(request))) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        hint: 'Set x-health-secret header or ?secret= to HEALTH_CHECK_SECRET, or call as Admin.',
      },
      { status: 401 }
    )
  }

  const report: {
    success: boolean
    timestamp: string
    totalLatencyMs: number
    env: { database: boolean; supabaseUrl: boolean; supabaseAnon: boolean; serviceRoleKey: boolean }
    database: CheckResult<{ count?: number }>
    auth: CheckResult<{ sessionValidation: string }>
    storage: CheckResult<{ buckets?: string[] }>
    summary: string[]
  } = {
    success: true,
    timestamp: new Date().toISOString(),
    totalLatencyMs: 0,
    env: {
      database: !!process.env.DATABASE_URL,
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    database: { ok: false, error: 'Not run' },
    auth: { ok: false, error: 'Not run' },
    storage: { ok: false, error: 'Not run' },
    summary: [],
  }

  // ---- 1. Env sanity ----
  if (!report.env.database) {
    report.summary.push('Env: DATABASE_URL is missing')
    report.success = false
  }
  if (!report.env.supabaseUrl) report.summary.push('Env: NEXT_PUBLIC_SUPABASE_URL is missing')
  if (!report.env.supabaseAnon) report.summary.push('Env: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing')
  if (!report.env.serviceRoleKey) {
    report.summary.push('Env: SUPABASE_SERVICE_ROLE_KEY is missing')
    report.success = false
  }

  // ---- 2. Database connection (latency) ----
  const dbStart = Date.now()
  try {
    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`SELECT count(*) as count FROM "User"`
    const count = Number(countResult[0]?.count ?? 0)
    report.database = {
      ok: true,
      latencyMs: Date.now() - dbStart,
      detail: { count },
    }
    report.summary.push(`Database: OK (${report.database.latencyMs}ms, ${count} users)`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    report.database = {
      ok: false,
      error: message,
      code: err instanceof Error ? err.name : 'Unknown',
    }
    report.summary.push(`Database: FAILED - ${message}`)
    report.success = false
  }

  // ---- 3. Authentication (Supabase Service Role + session validation) ----
  const authStart = Date.now()
  try {
    if (!report.env.serviceRoleKey || !report.env.supabaseUrl) {
      report.auth = {
        ok: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL not set',
      }
      report.summary.push('Auth: Skipped (missing env)')
    } else {
      const admin = createAdminClient()
      if (!admin) {
        report.auth = { ok: false, error: 'createAdminClient() returned null' }
        report.summary.push('Auth: FAILED - Admin client not created')
        report.success = false
      } else {
        const { data: userList, error: listError } = await admin.auth.admin.listUsers({ perPage: 1 })
        if (listError) {
          report.auth = {
            ok: false,
            error: listError.message,
            code: listError.name ?? 'AuthError',
          }
          report.summary.push(`Auth: FAILED - ${listError.message}`)
          report.success = false
        } else {
          report.auth = {
            ok: true,
            latencyMs: Date.now() - authStart,
            detail: {
              sessionValidation: 'Service role can list users; middleware will validate tokens via getApiAuth.',
            },
          }
          report.summary.push(
            `Auth: OK (${report.auth.latencyMs}ms, service role valid, ${userList?.users?.length ?? 0} sample)`
          )
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    report.auth = {
      ok: false,
      error: message,
      code: err instanceof Error ? err.name : 'Unknown',
    }
    report.summary.push(`Auth: FAILED - ${message}`)
    report.success = false
  }

  // ---- 4. Storage (Supabase Storage buckets list) ----
  const storageStart = Date.now()
  try {
    if (!report.env.serviceRoleKey || !report.env.supabaseUrl) {
      report.storage = { ok: false, error: 'Supabase env not set; storage check skipped.' }
      report.summary.push('Storage: Skipped (missing Supabase env)')
    } else {
      const admin = createAdminClient()
      if (!admin) {
        report.storage = { ok: false, error: 'Admin client null' }
        report.summary.push('Storage: Skipped (no admin client)')
      } else {
        const { data: buckets, error: storageError } = await admin.storage.listBuckets()
        if (storageError) {
          report.storage = {
            ok: false,
            error: storageError.message,
            code: storageError.name ?? 'StorageError',
          }
          report.summary.push(`Storage: FAILED - ${storageError.message}`)
          report.success = false
        } else {
          const names = (buckets ?? []).map((b) => b.name)
          report.storage = {
            ok: true,
            latencyMs: Date.now() - storageStart,
            detail: { buckets: names },
          }
          report.summary.push(
            `Storage: OK (${report.storage.latencyMs}ms, buckets: ${names.length > 0 ? names.join(', ') : 'none'})`
          )
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    report.storage = {
      ok: false,
      error: message,
      code: err instanceof Error ? err.name : 'Unknown',
    }
    report.summary.push(`Storage: FAILED - ${message}`)
    report.success = false
  }

  report.totalLatencyMs = Date.now() - startedAt

  return NextResponse.json(report, {
    status: report.success ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Health-Status': report.success ? 'healthy' : 'degraded',
    },
  })
}
