import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const result = await requireAdmin(request)
    if (result instanceof NextResponse) return result
    const { auth: _auth } = result

    // Check if engineerApplication model exists in Prisma Client
    if (!prisma.engineerApplication) {
      console.error('Prisma Client does not include EngineerApplication model. Please run: npx prisma generate')
      return Response.json(
        { success: false, error: 'خطأ في النظام. يرجى إعادة تشغيل الخادم' },
        { status: 500 }
      )
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex')

    // Create application with empty fields (engineer will fill them)
    const application = await prisma.engineerApplication.create({
      data: {
        token,
        name: '', // Will be filled by engineer
        email: '', // Will be filled by engineer
        phone: '', // Will be filled by engineer
        password: '', // Will be set when engineer fills the form
        status: 'pending'
      }
    })

    // Generate invitation link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const invitationLink = `${baseUrl}/engineer/apply/${token}`

    return Response.json({
      success: true,
      application: {
        id: application.id,
        token: application.token,
        createdAt: application.createdAt
      },
      invitationLink
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
