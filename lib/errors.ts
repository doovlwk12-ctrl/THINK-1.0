/**
 * Centralized error handling for API routes
 */

import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { logger } from './logger'
import { reportError } from './reportError'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export function handleApiError(error: unknown): Response {
  // Zod validation errors
  if (error instanceof ZodError) {
    logger.warn('Validation error', { errors: error.errors })
    return Response.json(
      {
        success: false,
        error: error.errors[0]?.message || 'بيانات غير صحيحة',
      },
      { status: 400 }
    )
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const errorId = logger.error('Prisma error', { code: error.code }, error as Error)

    switch (error.code) {
      case 'P2002':
        return Response.json(
          {
            success: false,
            error: 'القيمة موجودة مسبقاً',
            ...(process.env.NODE_ENV === 'development' && { errorId }),
          },
          { status: 400 }
        )
      case 'P2025':
        return Response.json(
          {
            success: false,
            error: 'السجل غير موجود',
            ...(process.env.NODE_ENV === 'development' && { errorId }),
          },
          { status: 404 }
        )
      case 'P2003':
        return Response.json(
          {
            success: false,
            error: 'خطأ في العلاقات بين البيانات',
            ...(process.env.NODE_ENV === 'development' && { errorId }),
          },
          { status: 400 }
        )
      case 'P2021':
        return Response.json(
          {
            success: false,
            error: 'جدول غير موجود في قاعدة البيانات. نفّذ: npx prisma db push',
            ...(process.env.NODE_ENV === 'development' && { errorId, code: error.code }),
          },
          { status: 500 }
        )
      case 'P1000':
        // Authentication failed against database (wrong password or URL)
        logger.error('Database authentication failed (P1000)', {}, error as Error)
        return Response.json(
          {
            success: false,
            error:
              process.env.NODE_ENV === 'production'
                ? 'تعذر الاتصال بقاعدة البيانات. تحقق من DATABASE_URL على Vercel (كلمة المرور ورابط Pooler).'
                : error.message,
          },
          { status: 503 }
        )
      default:
        return Response.json(
          {
            success: false,
            error: 'حدث خطأ في قاعدة البيانات',
            ...(process.env.NODE_ENV === 'development' && { errorId, code: error.code }),
          },
          { status: 500 }
        )
    }
  }

  // Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    const errorId = logger.error('Prisma validation error', {}, error as Error)
    return Response.json(
      {
        success: false,
        error: 'بيانات غير صحيحة',
        ...(process.env.NODE_ENV === 'development' && { errorId }),
      },
      { status: 400 }
    )
  }

  // App errors
  if (error instanceof AppError) {
    logger.warn('App error', { message: error.message, statusCode: error.statusCode })
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: error.statusCode }
    )
  }

  // Supabase / env missing (often on Vercel when env vars not loaded)
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('missing next_public_supabase') || msg.includes('supabase_url') || msg.includes('anon_key')) {
      logger.error('Supabase env missing', {}, error)
      return Response.json(
        {
          success: false,
          error:
            process.env.NODE_ENV === 'production'
              ? 'إعداد Supabase غير مكتمل. تحقق من NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY على Vercel ثم Redeploy.'
              : error.message,
        },
        { status: 503 }
      )
    }
  }

  // Prisma / database connection errors (generic Error, not PrismaClientKnownRequestError)
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    const isConnectionError =
      msg.includes("can't reach database server") ||
      msg.includes('connection refused') ||
      msg.includes('connection timed out') ||
      msg.includes('econnrefused') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      msg.includes('socket hang up') ||
      msg.includes('timeout') ||
      msg.includes('p1001') || // Prisma P1001: Can't reach database server
      msg.includes('p1000') || // Authentication failed
      msg.includes('authentication failed') ||
      msg.includes('database server') ||
      msg.includes('connection pool') ||
      msg.includes('transaction pool') ||
      msg.includes('too many clients') ||
      msg.includes('remaining connection slots') ||
      msg.includes('connect econnrefused') ||
      msg.includes('connect etimedout') ||
      (msg.includes('pool') && (msg.includes('timeout') || msg.includes('connection')))
    if (isConnectionError) {
      logger.error('Database connection error', {}, error)
      return Response.json(
        {
          success: false,
          error:
            process.env.NODE_ENV === 'production'
              ? 'تعذر الاتصال بقاعدة البيانات. يرجى التحقق من إعداد DATABASE_URL على Vercel (استخدم وضع Transaction مع ?pgbouncer=true).'
              : error.message,
        },
        { status: 503 }
      )
    }
  }

  // Unknown errors
  const err = error instanceof Error ? error : new Error(String(error))
  const errorId = logger.error(
    'Unknown error',
    {
      errorType: err.constructor.name,
    },
    err
  )
  reportError(err, { errorId })

  return Response.json(
    {
      success: false,
      error:
        process.env.NODE_ENV === 'development'
          ? `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          : 'حدث خطأ ما',
      ...(process.env.NODE_ENV === 'development' && { errorId }),
    },
    { status: 500 }
  )
}
