/**
 * رفع ملفات المهندس إلى Supabase Storage (bucket "orders") مع تسجيل انتهاء الصلاحية.
 * للاستخدام من مسارات الـ API فقط (SERVER-ONLY).
 */

import { randomUUID } from 'crypto'
import { uploadToSupabaseBucket, SUPABASE_BUCKETS } from './supabase'
import { prisma } from './prisma'

/** عدد أيام صلاحية الملف قبل اعتبار تاريخ الحذف (انتهاء الصلاحية). */
export const FILE_EXPIRY_DAYS = 30

/** الأنواع المسموحة لرفع المهندس: PDF، PNG، JPG. */
export const ALLOWED_ENGINEER_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
] as const

export interface UploadEngineerFileOptions {
  /** مجلد فرعي داخل الـ bucket (مثل "plans"). */
  folder?: string
  /** الحجم الأقصى بالبايت (افتراضي 10MB). */
  maxSizeBytes?: number
  /** معرف الطلب — عند توفره نضع ملفات الطلب تحت plans/{orderId}/ لتفريق بيانات كل عميل عن الباقي. */
  orderId?: string
}

export interface UploadEngineerFileResult {
  /** الرابط العام للملف بعد الرفع. */
  url: string
  /** مسار الملف داخل الـ bucket (للتخزين في file_expiry_tracker). */
  filePath: string
  /** الاسم الأصلي للملف. */
  fileName: string
  /** حجم الملف بالبايت. */
  fileSize: number
  /** تاريخ انتهاء الصلاحية المُدخل في الجدول. */
  expiryDate: Date
}

/**
 * حساب تاريخ انتهاء الصلاحية: الآن + عدد الأيام المحدد.
 * يُستخدم لتسجيل موعد مقترح لحذف الملف أو مراجعته.
 *
 * كيف يُحسب برمجياً:
 * - نأخذ الطابع الزمني الحالي بالميلي ثانية: Date.now()
 * - نضيف عدد ميلي ثانية مساوية لـ (عدد الأيام × 24 ساعة × 60 دقيقة × 60 ثانية × 1000)
 * - نُنشئ كائن Date من الناتج فنحصل على نفس اليوم والساعة بعد N يوماً
 *
 * مثال: اليوم ١١ فبراير ٢٠٢٥ الساعة ١٠:٠٠ ص → بعد ٣٠ يوماً = ١٣ مارس ٢٠٢٥ الساعة ١٠:٠٠ ص
 */
export function computeExpiryDate(daysFromNow: number = FILE_EXPIRY_DAYS): Date {
  const nowMs = Date.now()
  const daysInMs = daysFromNow * 24 * 60 * 60 * 1000
  return new Date(nowMs + daysInMs)
}

/**
 * رفع ملف المهندس (PDF, PNG, JPG) إلى bucket "orders" في Supabase،
 * ثم إضافة سجل في جدول file_expiry_tracker يتضمن مسار الملف وتاريخ الحذف (الآن + 30 يوماً).
 *
 * @throws إذا لم يكن Supabase مُعداً أو فشل الرفع أو إدخال السجل
 */
export async function uploadEngineerFileToOrders(
  file: File,
  options: UploadEngineerFileOptions = {}
): Promise<UploadEngineerFileResult> {
  const folder = options.folder ?? 'plans'
  const maxSizeBytes = options.maxSizeBytes ?? 10 * 1024 * 1024 // 10MB

  if (file.size > maxSizeBytes) {
    throw new Error(`حجم الملف يتجاوز الحد المسموح (${maxSizeBytes} bytes)`)
  }

  const allowed = [...ALLOWED_ENGINEER_FILE_TYPES]
  if (!allowed.includes(file.type as (typeof allowed)[number])) {
    throw new Error(`نوع الملف غير مدعوم. المسموح: PDF, PNG, JPG.`)
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const uniqueName = `${randomUUID()}.${extension}`
  // فصل ملفات كل طلب: plans/{orderId}/{uuid}.ext — يمنع اختلاط بيانات العملاء ويُسهّل الحذف والحدود لكل طلب
  const orderSegment = options.orderId?.replace(/[^a-zA-Z0-9_-]/g, '') || ''
  const objectPath = orderSegment
    ? `${folder}/${orderSegment}/${uniqueName}`
    : `${folder}/${uniqueName}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { url, path: storedPath } = await uploadToSupabaseBucket(
    SUPABASE_BUCKETS.ORDERS,
    objectPath,
    buffer,
    { contentType: file.type }
  )

  const expiryDate = computeExpiryDate(FILE_EXPIRY_DAYS)

  await prisma.fileExpiryTracker.create({
    data: {
      filePath: storedPath,
      expiryDate,
      isDeleted: false,
    },
  })

  return {
    url,
    filePath: storedPath,
    fileName: file.name,
    fileSize: file.size,
    expiryDate,
  }
}

/**
 * التحقق من أن Supabase Storage مُعد (للاستخدام قبل استدعاء uploadEngineerFileToOrders).
 */
export function isSupabaseStorageConfigured(): boolean {
  return !!(
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL
  )
}
