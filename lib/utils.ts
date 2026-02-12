import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'SAR'): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: currency === 'SAR' ? 'SAR' : 'USD',
    minimumFractionDigits: 0,
  }).format(amount)
}

/** توقيت المملكة لضمان دقة اليوم عند عرض التاريخ */
const DATE_TIMEZONE = 'Asia/Riyadh'

const FORMAT_OPTS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: DATE_TIMEZONE,
}

export function formatDate(date: Date | string, locale: string = 'ar-SA'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, FORMAT_OPTS).format(dateObj)
}

/**
 * عرض التاريخ بالهجري والميلادي معاً لضمان دقة اليوم (توقيت الرياض).
 * مثال: "١٢ شعبان ١٤٤٧ هـ / ١٥ مارس ٢٠٢٥ م"
 */
export function formatDateHijriMiladi(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', FORMAT_OPTS).format(dateObj)
  const miladi = new Intl.DateTimeFormat('ar-SA', { ...FORMAT_OPTS, calendar: 'gregory' }).format(dateObj)
  return `${hijri} هـ / ${miladi} م`
}

const FORMAT_OPTS_DATETIME: Intl.DateTimeFormatOptions = {
  ...FORMAT_OPTS,
  hour: '2-digit',
  minute: '2-digit',
  timeZone: DATE_TIMEZONE,
}

/**
 * عرض التاريخ والوقت بالهجري والميلادي (توقيت الرياض).
 * مثال: "١٢ شعبان ١٤٤٧ هـ ٠٣:٣٠ م / ١٥ مارس ٢٠٢٥ م ٠٣:٣٠ م"
 */
export function formatDateTimeHijriMiladi(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', FORMAT_OPTS_DATETIME).format(dateObj)
  const miladi = new Intl.DateTimeFormat('ar-SA', { ...FORMAT_OPTS_DATETIME, calendar: 'gregory' }).format(dateObj)
  return `${hijri} هـ / ${miladi} م`
}

export function generateOrderNumber(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9).toUpperCase()
  return `ORD-${timestamp}-${random}`
}

export function validatePhoneNumber(phone: string): boolean {
  // Saudi phone number validation
  const saudiPhoneRegex = /^(05|5)[0-9]{8}$/
  return saudiPhoneRegex.test(phone.replace(/\s/g, ''))
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Check if an order deadline has expired
 * @param deadline - The deadline date (Date or string)
 * @returns true if deadline has passed, false otherwise
 */
export function isOrderExpired(deadline: Date | string): boolean {
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline
  const now = new Date()
  return deadlineDate < now
}

/** عدد أيام بعد الموعد النهائي لنقل الملفات إلى مجلد الأرشيف (ثم تبقى هناك مدة أخرى ثم تُحذف). */
export const ARCHIVE_PURGE_DAYS_AFTER_DEADLINE = 15

/** عدد أيام بقاء الملفات في مجلد الأرشيف قبل الحذف النهائي من التخزين (يمكن تغييره بالاتفاق). */
export const ARCHIVE_RETENTION_DAYS = 15

/**
 * تاريخ نقل الملفات إلى الأرشيف = الموعد النهائي + ARCHIVE_PURGE_DAYS_AFTER_DEADLINE يوم
 */
export function getArchivePurgeDate(deadline: Date | string): Date {
  const d = typeof deadline === 'string' ? new Date(deadline) : deadline
  const out = new Date(d)
  out.setDate(out.getDate() + ARCHIVE_PURGE_DAYS_AFTER_DEADLINE)
  return out
}

/** تاريخ الحذف النهائي من التخزين = تاريخ النقل إلى الأرشيف + مدة الاحتفاظ */
export function getArchiveDeleteDate(purgedAt: Date | string): Date {
  const d = typeof purgedAt === 'string' ? new Date(purgedAt) : purgedAt
  const out = new Date(d)
  out.setDate(out.getDate() + ARCHIVE_RETENTION_DAYS)
  return out
}
