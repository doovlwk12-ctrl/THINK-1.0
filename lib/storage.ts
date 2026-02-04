/**
 * File storage service
 * Supports local storage (for MVP), Firebase Storage (Phase 4), and S3/Cloudinary (for production)
 * NOTE: This is a SERVER-ONLY module. Do not import in client components.
 */

import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { env } from './env'

export interface UploadOptions {
  folder: string
  maxSize?: number // in bytes
  allowedTypes?: string[]
}

export interface UploadResult {
  url: string
  fileName: string
  fileSize: number
}

/**
 * Upload file to storage
 * Uses local storage for MVP, can be upgraded to S3/Cloudinary
 */
export async function uploadFile(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  // Validate file size
  if (options.maxSize && file.size > options.maxSize) {
    throw new Error(`File size exceeds ${options.maxSize} bytes`)
  }

  // Validate file type
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} not allowed`)
  }

  // For MVP: use local storage
  // In production: switch to S3 or Cloudinary based on env vars
  try {
    const envVars = env
    if (envVars.AWS_S3_BUCKET && envVars.AWS_ACCESS_KEY_ID && envVars.AWS_SECRET_ACCESS_KEY) {
      return uploadToS3(file, options)
    } else if (envVars.CLOUDINARY_CLOUD_NAME && envVars.CLOUDINARY_API_KEY && envVars.CLOUDINARY_API_SECRET) {
      return uploadToCloudinary(file, options)
    } else {
      return uploadToLocal(file, options)
    }
  } catch {
    // If env validation fails, fallback to local storage
    return uploadToLocal(file, options)
  }
}

/**
 * Upload to local storage (for MVP)
 */
async function uploadToLocal(file: File, options: UploadOptions): Promise<UploadResult> {
  const extension = file.name.split('.').pop() || 'bin'
  const fileName = `${randomUUID()}.${extension}`
  const uploadsDir = join(process.cwd(), 'public', 'uploads', options.folder)
  
  await mkdir(uploadsDir, { recursive: true })
  
  const filePath = join(uploadsDir, fileName)
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  
  await writeFile(filePath, buffer)
  
  const fileUrl = `/uploads/${options.folder}/${fileName}`
  
  return {
    url: fileUrl,
    fileName: file.name,
    fileSize: file.size,
  }
}

/**
 * Delete a file from local storage by its public URL (e.g. /uploads/plans/uuid.ext).
 * No-op if file does not exist. Used when upload exceeds post-save size limit.
 */
export async function deleteFileByUrl(url: string): Promise<void> {
  if (!url || !url.startsWith('/uploads/')) return
  const path = join(process.cwd(), 'public', url.replace(/^\//, ''))
  try {
    await unlink(path)
  } catch {
    // Ignore if file not found or other error
  }
}

/**
 * Upload to AWS S3 (for production)
 */
async function uploadToS3(file: File, options: UploadOptions): Promise<UploadResult> {
  // TODO: Implement S3 upload when AWS SDK is added
  // For now, fallback to local storage
  console.warn('S3 upload not implemented yet, using local storage')
  return uploadToLocal(file, options)
  
  /* Example implementation:
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
  
  const s3Client = new S3Client({
    region: env.AWS_REGION!,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    },
  })
  
  const extension = file.name.split('.').pop() || 'bin'
  const fileName = `${options.folder}/${randomUUID()}.${extension}`
  const buffer = Buffer.from(await file.arrayBuffer())
  
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET!,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
      ACL: 'public-read',
    })
  )
  
  const fileUrl = `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${fileName}`
  
  return {
    url: fileUrl,
    fileName: file.name,
    fileSize: file.size,
  }
  */
}

/**
 * Upload to Cloudinary (alternative to S3)
 */
async function uploadToCloudinary(file: File, options: UploadOptions): Promise<UploadResult> {
  // TODO: Implement Cloudinary upload when SDK is added
  // For now, fallback to local storage
  console.warn('Cloudinary upload not implemented yet, using local storage')
  return uploadToLocal(file, options)
  
  /* Example implementation:
  const cloudinary = await import('cloudinary').then(m => m.v2)
  
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME!,
    api_key: env.CLOUDINARY_API_KEY!,
    api_secret: env.CLOUDINARY_API_SECRET!,
  })
  
  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')
  const dataUri = `data:${file.type};base64,${base64}`
  
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: options.folder,
    resource_type: 'auto',
  })
  
  return {
    url: result.secure_url,
    fileName: file.name,
    fileSize: file.size,
  }
  */
}
