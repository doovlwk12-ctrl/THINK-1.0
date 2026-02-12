/**
 * Supabase — نقطة دخول واحدة لكل ما يخص Supabase في المشروع
 * (مصادقة، خوادم العميل، التخزين، الثوابت)
 *
 * استيراد من الواجهة (المتصفح): createBrowserClient فقط.
 * استيراد من السيرفر (API / Server Components): createServerClient, createClientFromRequest, createAdminClient, createClientForAuthActions.
 * استيراد من الـ middleware: getSupabaseSession.
 */

// ============== الثوابت والإعداد ==============

/** أسماء متغيرات البيئة الخاصة بـ Supabase */
export const SUPABASE_ENV = {
  URL: 'NEXT_PUBLIC_SUPABASE_URL',
  ANON_KEY: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  SERVICE_ROLE_KEY: 'SUPABASE_SERVICE_ROLE_KEY',
  USE_SUPABASE_AUTH: 'NEXT_PUBLIC_USE_SUPABASE_AUTH',
} as const

/** أسماء الـ buckets في Storage (يجب أن تطابق ما في لوحة Supabase) */
export const SUPABASE_BUCKETS = {
  /** الـ bucket الذي تُحفظ فيه ملفات الطلبات/المخططات في Supabase */
  ORDERS: 'orders',
} as const

/** التحقق من تفعيل مصادقة Supabase من متغيرات البيئة */
export function isSupabaseAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === 'true' || process.env.USE_SUPABASE_AUTH === 'true'
}

/** التحقق من توفر إعدادات Supabase (URL + Anon Key) */
export function hasSupabaseConfig(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

// ============== عميل المتصفح (للـ Client Components) ==============

export { createClient as createBrowserClient } from './supabase/client'

// ============== خوادم السيرفر (لـ API Routes و Server Components) ==============

export {
  createAdminClient,
  createClientForAuthActions,
  createClientFromRequest,
} from './supabase/server'

/** عميل السيرفر مع قراءة الكوكيز من next/headers (لـ Server Components) */
export { createClient as createServerClient } from './supabase/server'

// ============== الـ Middleware ==============

export { getSupabaseSession, type SupabaseMiddlewareResult } from './supabase/middleware'

// ============== التخزين (Storage) — للاستخدام من مسارات الـ API ==============

import { createAdminClient } from './supabase/server'

/**
 * رفع ملف إلى bucket في Supabase Storage (من السيرفر فقط، باستخدام Service Role).
 * يُستخدم عند تفعيل Supabase وتوجيه رفع المخططات إلى Storage.
 */
export async function uploadToSupabaseBucket(
  bucket: string,
  path: string,
  file: globalThis.File | Buffer,
  options?: { contentType?: string }
): Promise<{ url: string; path: string }> {
  const admin = createAdminClient()
  if (!admin) throw new Error('Supabase admin client not available (missing SUPABASE_SERVICE_ROLE_KEY)')
  const buffer = Buffer.isBuffer(file) ? file : Buffer.from(await (file as globalThis.File).arrayBuffer())
  const contentType =
    options?.contentType ?? (typeof (file as globalThis.File).type === 'string' ? (file as globalThis.File).type : 'application/octet-stream')
  const { data, error } = await admin.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true,
  })
  if (error) throw error
  const { data: urlData } = admin.storage.from(bucket).getPublicUrl(data.path)
  return { url: urlData.publicUrl, path: data.path }
}

/**
 * الحصول على رابط عام لملف في bucket (بعد الرفع).
 */
export function getSupabasePublicUrl(bucket: string, path: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  const base = url.replace(/\/$/, '')
  return `${base}/storage/v1/object/public/${bucket}/${path}`
}

/**
 * حذف ملف من bucket (من السيرفر فقط).
 */
export async function deleteFromSupabaseBucket(bucket: string, path: string): Promise<void> {
  const admin = createAdminClient()
  if (!admin) throw new Error('Supabase admin client not available')
  const { error } = await admin.storage.from(bucket).remove([path])
  if (error) throw error
}

/**
 * نقل ملف داخل نفس الـ bucket (من السيرفر فقط).
 * يُستخدم لنقل المخططات من plans/ إلى archive/ عند انتهاء مدة الطلب.
 */
export async function moveInSupabaseBucket(
  bucket: string,
  fromPath: string,
  toPath: string
): Promise<void> {
  const admin = createAdminClient()
  if (!admin) throw new Error('Supabase admin client not available')
  const { error } = await admin.storage.from(bucket).move(fromPath, toPath)
  if (error) throw error
}
