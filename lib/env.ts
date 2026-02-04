/**
 * Environment variables validation
 * Validates required environment variables at startup
 */

import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().or(z.string().startsWith('file:')),

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url(),

  // Optional: AWS S3 (for file storage)
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),

  // Optional: Cloudinary (alternative to S3)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Optional: Push Notifications
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().email().optional().or(z.string().startsWith('mailto:').optional()),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

type Env = z.infer<typeof envSchema>

let validatedEnv: Env | null = null

export function validateEnv(): Env {
  if (validatedEnv) {
    return validatedEnv
  }

  try {
    validatedEnv = envSchema.parse(process.env)
    return validatedEnv
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n')
      throw new Error(
        `Invalid environment variables:\n${missingVars}\n\nPlease check your .env file.`
      )
    }
    throw error
  }
}

// Export validated env (will be validated when accessed)
// In development, we allow missing optional vars
export const env = new Proxy({} as Env, {
  get(_target, prop: keyof Env) {
    try {
      const validated = validateEnv()
      return validated[prop]
    } catch {
      // In development, return undefined for optional vars
      if (process.env.NODE_ENV === 'development') {
        return process.env[prop as string] as Env[keyof Env] | undefined
      }
      throw new Error(`Environment variable ${String(prop)} is required`)
    }
  },
})
