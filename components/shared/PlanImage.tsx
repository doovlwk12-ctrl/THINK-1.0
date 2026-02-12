'use client'

import { useState } from 'react'
import Image from 'next/image'

const BLUR_PLACEHOLDER =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='

/** نطاقات التخزين المعروفة: أي رابط يحتويها نعرضه بـ <img> مباشرة */
const STORAGE_HOSTS = ['supabase.co', 'amazonaws.com', 'cloudinary.com', 'res.cloudinary.com']

/** روابط Supabase نمررها عبر وكيل الصور لضمان ظهور الصورة (حتى مع bucket خاص أو CORS) */
function isSupabaseStorageUrl(url: string): boolean {
  if (typeof url !== 'string' || !url.trim()) return false
  return url.includes('supabase.co') && url.includes('/storage/v1/object/')
}

/** تحويل رابط Supabase إلى رابط وكيل الصور */
function getProxyUrl(fileUrl: string): string {
  const normalized = fileUrl.trim().startsWith('//') ? `https:${fileUrl.trim()}` : fileUrl.trim()
  return `/api/image-proxy?url=${encodeURIComponent(normalized)}`
}

/** مسار محلي فقط (مثل /uploads/...) نمرره لـ Next/Image؛ غير ذلك نستخدم <img> لتجنب 400 على Vercel */
function isLocalPath(url: string): boolean {
  if (typeof url !== 'string' || !url.trim()) return false
  const u = url.trim()
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('//')) return false
  if (STORAGE_HOSTS.some((host) => u.includes(host))) return false
  return u.startsWith('/')
}

/** تطبيع الرابط: //... → https://... */
function normalizeImageSrc(url: string): string {
  const u = url.trim()
  if (u.startsWith('//')) return `https:${u}`
  return u
}

export interface PlanImageProps {
  fileUrl: string
  fileType: string
  alt?: string
  width?: number
  height?: number
  className?: string
  loading?: 'lazy' | 'eager'
  placeholder?: 'blur'
  blurDataURL?: string
  priority?: boolean
  quality?: number
  /** عند توفرهما نستخدم مسار الصورة الموحّد /api/orders/[id]/plans/[planId]/image (مضمون مع الصلاحيات) */
  orderId?: string
  planId?: string
  /** للصفحات التي تحتاج ref (مثل صفحة التعديلات) */
  imageRef?: React.RefObject<HTMLImageElement | null>
  onClick?: React.MouseEventHandler<HTMLImageElement>
  onLoad?: React.ReactEventHandler<HTMLImageElement>
  draggable?: boolean
  onMouseMove?: (e: React.MouseEvent<HTMLImageElement>) => void
  onMouseUp?: () => void
  onTouchMove?: (e: React.TouchEvent<HTMLImageElement>) => void
  onTouchEnd?: () => void
}

/** مصدر العرض: روابط التخزين مباشرة (بدون وكيل) لتظهر الصورة */
function getImageSrc(fileUrl: string): string {
  return normalizeImageSrc(fileUrl)
}

/**
 * يعرض صورة مخطط:
 * - أي رابط خارجي (http/https أو //): <img> مع الرابط المباشر (لا يمر عبر _next/image)
 * - مسارات محلية (/uploads/): Next/Image
 */
/** مسار موحّد لعرض صورة المخطط (مع صلاحيات) — يُفضّل عند توفر orderId و planId */
function getPlanImageApiPath(orderId: string, planId: string): string {
  return `/api/orders/${orderId}/plans/${planId}/image`
}

export function PlanImage({
  fileUrl,
  fileType,
  alt = 'Plan',
  width = 480,
  height = 192,
  className,
  loading = 'lazy',
  placeholder,
  blurDataURL,
  priority,
  quality,
  orderId,
  planId,
  imageRef,
  onClick,
  onLoad,
  draggable,
  onMouseMove,
  onMouseUp,
  onTouchMove,
  onTouchEnd,
}: PlanImageProps) {
  const [loadError, setLoadError] = useState(false)
  const [triedProxy, setTriedProxy] = useState(false)

  if (fileType !== 'image') return null

  // مسار موحّد: عند وجود orderId و planId نعرض الصورة من API الصور (مضمون مع الصلاحيات)
  if (orderId && planId) {
    const imgSrc = getPlanImageApiPath(orderId, planId)
    if (loadError) {
      return (
        <div
          className={className}
          style={{ width, height, minHeight: height }}
          role="img"
          aria-label={alt}
        >
          <div className="w-full h-full flex items-center justify-center bg-greige/20 dark:bg-charcoal-600 rounded text-blue-gray dark:text-greige text-sm text-center p-4">
            لم تُحمّل الصورة — استخدم &quot;تحميل المخطط&quot; أدناه
          </div>
        </div>
      )
    }
    return (
      /* eslint-disable-next-line @next/next/no-img-element -- مسار API موحّد للصور */
      <img
        key={imgSrc}
        ref={imageRef as React.RefObject<HTMLImageElement>}
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? 'eager' : loading}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setLoadError(true)}
        onLoad={onLoad}
        onClick={onClick}
        draggable={draggable}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />
    )
  }

  if (!fileUrl) return null

  // روابط التخزين (Supabase وغيرها) أو أي رابط غير محلي: <img> مباشرة أو عبر الوكيل
  if (!isLocalPath(fileUrl)) {
    const isSupabase = isSupabaseStorageUrl(fileUrl)
    const proxySrc = getProxyUrl(fileUrl)
    const directSrc = getImageSrc(fileUrl)
    const imgSrc = isSupabase && !triedProxy ? proxySrc : directSrc

    if (loadError) {
      return (
        <div
          className={className}
          style={{ width, height, minHeight: height }}
          role="img"
          aria-label={alt}
        >
          <div className="w-full h-full flex items-center justify-center bg-greige/20 dark:bg-charcoal-600 rounded text-blue-gray dark:text-greige text-sm text-center p-4">
            لم تُحمّل الصورة — استخدم &quot;تحميل المخطط&quot; أدناه
          </div>
        </div>
      )
    }
    return (
      /* eslint-disable-next-line @next/next/no-img-element -- روابط تخزين خارجية أو وكيل؛ next/image يسبب 400 على Vercel */
      <img
        key={imgSrc}
        ref={imageRef as React.RefObject<HTMLImageElement>}
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? 'eager' : loading}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => {
          if (isSupabase && !triedProxy) {
            setTriedProxy(true)
          } else {
            setLoadError(true)
          }
        }}
        onLoad={onLoad}
        onClick={onClick}
        draggable={draggable}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />
    )
  }

  return (
    <Image
      ref={imageRef as React.Ref<HTMLImageElement>}
      src={fileUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : loading}
      placeholder={placeholder}
      blurDataURL={blurDataURL ?? BLUR_PLACEHOLDER}
      priority={priority}
      quality={quality}
      onClick={onClick}
      onLoad={onLoad}
      draggable={draggable}
      onMouseMove={onMouseMove as (e: React.MouseEvent<HTMLImageElement>) => void}
      onMouseUp={onMouseUp}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    />
  )
}
