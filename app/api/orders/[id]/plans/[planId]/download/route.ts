import { NextRequest } from 'next/server'
import { getApiAuth } from '@/lib/getApiAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { join } from 'path'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'

const EXT_TO_CONTENT_TYPE: Record<string, string> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
  webp: 'image/webp',
}

const FILE_TYPE_TO_EXT: Record<string, string> = {
  image: 'jpeg',
  pdf: 'pdf',
}

/** Sanitize filename for Content-Disposition: keep safe chars and one extension. */
function safeDownloadFilename(fileName: string | null | undefined, fileType: string): string {
  const extFromType = FILE_TYPE_TO_EXT[fileType] || 'bin'
  if (!fileName || !fileName.trim()) {
    return `plan.${extFromType}`
  }
  const base = fileName.replace(/[^\w\u0600-\u06FF\u0750-\u077F\s.-]/g, '').trim() || 'plan'
  const lastDot = base.lastIndexOf('.')
  let name = base
  let ext = extFromType
  if (lastDot > 0 && lastDot < base.length - 1) {
    const candidateExt = base.slice(lastDot + 1).toLowerCase()
    if (EXT_TO_CONTENT_TYPE[candidateExt]) {
      name = base.slice(0, lastDot).trim() || 'plan'
      ext = candidateExt
    }
  }
  return `${name || 'plan'}.${ext}`
}

function getContentType(fileName: string | null | undefined, fileType: string): string {
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext && EXT_TO_CONTENT_TYPE[ext]) return EXT_TO_CONTENT_TYPE[ext]
  }
  if (fileType === 'pdf') return 'application/pdf'
  return 'image/jpeg'
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; planId: string }> | { id: string; planId: string } }
) {
  try {
    const auth = await getApiAuth(request)
    if (!auth) {
      return new Response(null, { status: 401 })
    }

    const { id: orderId, planId } = await Promise.resolve(context.params)

    const plan = await prisma.plan.findFirst({
      where: { id: planId, orderId },
      include: {
        order: {
          select: { clientId: true, engineerId: true },
        },
      },
    })

    if (!plan) {
      return new Response(null, { status: 404 })
    }

    if (plan.purgedAt || !plan.fileUrl?.trim()) {
      return new Response(
        JSON.stringify({ error: 'تم حذف الملف من الأرشيف بعد 45 يوماً من الموعد النهائي.' }),
        { status: 410, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { order } = plan
    const isClient = order.clientId === auth.userId
    const isEngineer = order.engineerId === auth.userId
    const isAdmin = auth.role === 'ADMIN'
    if (!isClient && !isEngineer && !isAdmin) {
      return new Response(null, { status: 403 })
    }

    const contentType = getContentType(plan.fileName, plan.fileType)
    const downloadName = safeDownloadFilename(plan.fileName, plan.fileType)

    const fileUrl = plan.fileUrl

    if (fileUrl.startsWith('/')) {
      const filePath = join(process.cwd(), 'public', fileUrl)
      if (!existsSync(filePath)) {
        return new Response(null, { status: 404 })
      }
      const buffer = await readFile(filePath)
      return new Response(buffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${downloadName}"`,
        },
      })
    }

    const remoteRes = await fetch(fileUrl, { method: 'GET' })
    if (!remoteRes.ok || !remoteRes.body) {
      return new Response(null, { status: 502 })
    }
    return new Response(remoteRes.body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${downloadName}"`,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error) as Response
  }
}
