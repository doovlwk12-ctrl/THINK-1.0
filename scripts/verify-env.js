#!/usr/bin/env node

/**
 * التحقق من اتساق متغيرات البيئة قبل البناء (مهم لـ Vercel + Supabase).
 * يُشغّل تلقائياً مع prebuild؛ يمكن تشغيله يدوياً: node scripts/verify-env.js
 *
 * القواعد:
 * - إذا NEXT_PUBLIC_USE_SUPABASE_AUTH=true يجب وجود NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - على Vercel (VERCEL=1): إذا وُجد DATABASE_URL يجب أن يحتوي على pgbouncer=true
 */

const useSupabaseAuth = process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === 'true'
const isVercel = process.env.VERCEL === '1'
let failed = false

if (useSupabaseAuth) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !url.trim()) {
    console.error('[verify-env] NEXT_PUBLIC_USE_SUPABASE_AUTH=true but NEXT_PUBLIC_SUPABASE_URL is missing or empty.')
    failed = true
  }
  if (!anon || !anon.trim()) {
    console.error('[verify-env] NEXT_PUBLIC_USE_SUPABASE_AUTH=true but NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or empty.')
    failed = true
  }
}

if (isVercel) {
  const dbUrl = process.env.DATABASE_URL
  if (dbUrl && typeof dbUrl === 'string') {
    const startsWithPostgres = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')
    if (!startsWithPostgres) {
      console.error('[verify-env] On Vercel, DATABASE_URL must start with postgresql:// or postgres://')
      failed = true
    }
    if (!dbUrl.includes('pgbouncer=true')) {
      console.error('[verify-env] On Vercel, DATABASE_URL should use Transaction pooler and include ?pgbouncer=true (see docs/VERCEL-SUPABASE-CHECKLIST.md)')
      failed = true
    }
  }
}

if (failed) {
  process.exit(1)
}
