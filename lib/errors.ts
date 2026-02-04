/**
 * Centralized error handling for API routes
 */

import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { logger } from './logger'

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
            error: 'جدول غير موجود في قاعدة البيانات. نفّذ: npx tsx scripts/ensure-homepage-content-table.ts',
            ...(process.env.NODE_ENV === 'development' && { errorId, code: error.code }),
          },
          { status: 500 }
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

  // Prisma / database connection errors (generic Error, not PrismaClientKnownRequestError)
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    const isConnectionError =
      msg.includes("can't reach database server") ||
      msg.includes('connection refused') ||
      msg.includes('connection timed out') ||
      msg.includes('econnrefused') ||
      msg.includes('econnreset') ||
      msg.includes('p1001') // Prisma P1001: Can't reach database server
    if (isConnectionError) {
      logger.error('Database connection error', {}, error)
      return Response.json(
        {
          success: false,
          error:
            process.env.NODE_ENV === 'production'
              ? 'تعذر الاتصال بقاعدة البيانات. يرجى المحاولة لاحقاً.'
              : error.message,
        },
        { status: 503 }
      )
    }
  }

  // Unknown errors
  const errorId = logger.error(
    'Unknown error',
    {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    },
    error instanceof Error ? error : new Error(String(error))
  )

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
