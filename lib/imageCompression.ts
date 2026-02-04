/**
 * Image compression utility using browser-image-compression
 */

export interface CompressionOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  useWebWorker?: boolean
  quality?: number
  /** Skip compression when file size is at or below this (bytes). Default 500KB. */
  skipCompressionBelow?: number
}

/** Skip compression if file is already under this size (bytes) */
const SKIP_COMPRESSION_BELOW_BYTES = 500 * 1024 // 500KB

/**
 * Compress image file
 * Skips compression for small files (<= 500KB) to avoid unnecessary delay.
 * Note: Compression is optional - if browser-image-compression is not installed,
 * the original file will be returned
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    return file
  }

  // Skip compression for small files to speed up upload flow
  if (file.size <= (options.skipCompressionBelow ?? SKIP_COMPRESSION_BELOW_BYTES)) {
    return file
  }

  try {
    const imageCompressionModule = await import('browser-image-compression')
    const imageCompression = imageCompressionModule.default || imageCompressionModule

    const compressionOptions = {
      maxSizeMB: options.maxSizeMB || 2, // Default 2MB
      maxWidthOrHeight: options.maxWidthOrHeight || 1920, // Default 1920px
      useWebWorker: options.useWebWorker ?? true,
      quality: options.quality || 0.8, // Default 80% quality
    }

    const compressedFile = await imageCompression(file, compressionOptions)
    return compressedFile
  } catch (error: unknown) {
    // If library is not installed or compression fails, return original file
    const errorMessage = error instanceof Error ? error.message : ''
    if (
      errorMessage.includes('Cannot resolve') ||
      errorMessage.includes('MODULE_NOT_FOUND') ||
      errorMessage.includes('Failed to fetch') ||
      (typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'MODULE_NOT_FOUND')
    ) {
      // Library not installed - return original file silently
      return file
    }
    console.error('Image compression error:', error)
    // Return original file if compression fails
    return file
  }
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
