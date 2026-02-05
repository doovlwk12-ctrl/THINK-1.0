import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prismaClient = globalForPrisma.prisma

if (!prismaClient) {
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
