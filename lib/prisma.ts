import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prismaClient = globalForPrisma.prisma

if (!prismaClient) {
  // #region agent log
  try {
    const rawUrl = typeof process !== 'undefined' ? process.env.DATABASE_URL : undefined
    let dbHost = ''
    let dbPort = ''
    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl)
        dbHost = parsed.hostname || ''
        dbPort = parsed.port || ''
      } catch {
        dbHost = ''
        dbPort = ''
      }
    }
    if (typeof fetch !== 'undefined') {
      fetch('http://127.0.0.1:7244/ingest/a8eee1e4-a2b5-45ab-8ecd-ef5f28c71af1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/prisma.ts:prisma-init',message:'prisma init',data:{hasDatabaseUrl:!!rawUrl,dbHost,dbPort},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{})
    }
  } catch {
    // ignore logging errors
  }
  // #endregion

  prismaClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = prismaClient

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Helper function to handle Prisma errors
export function handlePrismaError(error: unknown) {
  if (error instanceof Error) {
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Prisma Error:', error.message)
    }
    return error.message
  }
  return 'An unknown error occurred'
}
