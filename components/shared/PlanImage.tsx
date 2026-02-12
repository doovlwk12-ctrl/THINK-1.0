'use client'

import Image from 'next/image'

const BLUR_PLACEHOLDER =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='

/** روابط Supabase تمر عبر _next/image وتُرجع 400 على Vercel — نعرضها بـ img عادي */
function isSupabaseStorageUrl(url: string): boolean {
  return typeof url === 'string' && url.includes('supabase.co') && url.includes('/storage/')
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

/**
 * يعرض صورة مخطط: لروابط Supabase نستخدم <img> لتجنب 400 من _next/image،
 * وللمسارات المحلية نستخدم Next/Image للتحسين.
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

  if (isSupabaseStorageUrl(fileUrl)) {
    return (
      <img
        ref={imageRef as React.RefObject<HTMLImageElement>}
        src={fileUrl}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={loading}
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
