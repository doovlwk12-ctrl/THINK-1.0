'use client'

import Image from 'next/image'

const BLUR_PLACEHOLDER =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='

/** أي رابط خارجي لا نمرره لـ Next/Image لتجنب 400 على Vercel */
function isExternalUrl(url: string): boolean {
  if (typeof url !== 'string' || !url.trim()) return false
  const u = url.trim()
  return u.startsWith('http://') || u.startsWith('https://') || u.startsWith('//')
}

/** روابط Supabase — نمررها عبر وكيل الصور لتجنب 400 و CORS */
function isSupabaseStorageUrl(url: string): boolean {
  return typeof url === 'string' && url.includes('supabase.co') && url.includes('/storage/')
}

/** تطبيع الرابط للوكيل: //... → https://... */
function normalizeProxyUrl(url: string): string {
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
  /** للصفحات التي تحتاج ref (مثل صفحة التعديلات) */
  imageRef?: React.RefObject<HTMLImageElement | null>
  onClick?: () => void
  onLoad?: () => void
  draggable?: boolean
  onMouseMove?: (e: React.MouseEvent<HTMLImageElement>) => void
  onMouseUp?: () => void
  onTouchMove?: (e: React.TouchEvent<HTMLImageElement>) => void
  onTouchEnd?: () => void
}

/** مصدر العرض: روابط Supabase عبر وكيل API، والباقي كما هو */
function getImageSrc(fileUrl: string): string {
  const normalized = normalizeProxyUrl(fileUrl)
  if (isSupabaseStorageUrl(normalized)) {
    return `/api/image-proxy?url=${encodeURIComponent(normalized)}`
  }
  return fileUrl.startsWith('//') ? `https:${fileUrl}` : fileUrl
}

/**
 * يعرض صورة مخطط:
 * - روابط Supabase: عبر /api/image-proxy (تجنب 400 و CORS)
 * - أي رابط خارجي آخر: <img> مباشر
 * - مسارات محلية (/uploads/): Next/Image للتحسين
 */
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
  imageRef,
  onClick,
  onLoad,
  draggable,
  onMouseMove,
  onMouseUp,
  onTouchMove,
  onTouchEnd,
}: PlanImageProps) {
  if (fileType !== 'image' || !fileUrl) return null

  if (isExternalUrl(fileUrl)) {
    return (
      <img
        ref={imageRef as React.RefObject<HTMLImageElement>}
        src={getImageSrc(fileUrl)}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? 'eager' : loading}
        decoding="async"
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
