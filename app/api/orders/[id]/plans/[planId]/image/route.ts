import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { createAdminClient } from '@/lib/supabase'
import { join } from 'path'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { gunzipSync } from 'zlib'

const FAIL_REASON_HEADER = 'X-Image-Fail-Reason'

function noStoreWithReason(reason: string): Record<string, string> {
  return { 'Cache-Control': 'no-store', [FAIL_REASON_HEADER]: reason }
}

const EXT_TO_CONTENT_TYPE: Record<string, string> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

function getImageContentType(fileName: string | null | undefined): string {
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext && EXT_TO_CONTENT_TYPE[ext]) return EXT_TO_CONTENT_TYPE[ext]
  }
  return 'image/jpeg'
}

/** استخراج bucket و path من أي رابط Supabase Storage (حتى لو النطاق مختلف قليلاً). */
function parseSupabaseStorageUrl(url: string): { bucket: string; path: string } | null {
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
  if (match) return { bucket: match[1], path: match[2] }
  return null
}

/**
 * مسار موحّد لعرض صورة المخطط — يعيد الصورة بعد التحقق من الصلاحية.
 * للاستخدام في <img src="/api/orders/[id]/plans/[planId]/image" /> مع إرسال الجلسة (cookies).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; planId: string }> | { id: string; planId: string } }
) {
  try {
    const result = await requireAuth(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    const resolved = await Promise.resolve(context.params)
    const orderId = resolved?.id ?? resolved?.orderId
    const planId = resolved?.planId

    if (!orderId || !planId) {
      return NextResponse.json(
        { error: 'معرف الطلب أو المخطط ناقص' },
        { status: 400, headers: noStoreWithReason('params_missing') }
      )
    }

    const plan = await prisma.plan.findFirst({
      where: { id: planId, orderId },
      include: {
        order: {
          select: { clientId: true, engineerId: true },
        },
      },
    })

    if (!plan) {
      return new Response(null, { status: 404, headers: noStoreWithReason('plan_not_found') })
    }

    if (plan.fileType?.toLowerCase() !== 'image') {
      return new Response(null, { status: 404, headers: noStoreWithReason('file_type') })
    }

    if (plan.purgedAt || !plan.fileUrl?.trim()) {
      return new Response(null, { status: 410, headers: noStoreWithReason('purged') })
    }

    const { order } = plan
    const isClient = order.clientId === auth.userId
    const isEngineer = order.engineerId === auth.userId
    const isAdmin = auth.role === 'ADMIN'
    if (!isClient && !isEngineer && !isAdmin) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 403, headers: noStoreWithReason('forbidden') }
      )
    }

    const contentType = getImageContentType(plan.fileName)
    let fileUrl = plan.fileUrl.trim()
    if (fileUrl.startsWith('//')) fileUrl = `https:${fileUrl}`

    // مسار محلي (public/uploads/plans/...) — يعمل فقط عندما الملف موجود على القرص (مثلاً في التطوير المحلي؛ على Vercel لا يُحفظ محلياً فالصورة لن تظهر)
    if (fileUrl.startsWith('/')) {
      const filePath = join(process.cwd(), 'public', fileUrl)
      if (!existsSync(filePath)) {
        return new Response(null, { status: 404, headers: noStoreWithReason('local_missing') })
      }
      const buffer = await readFile(filePath)
      return new Response(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      })
    }

    // Supabase: أي رابط بصيغة .../storage/v1/object/public/BUCKET/PATH — تحميل عبر Service Role (يعمل مع bucket خاص)
    const parsed = parseSupabaseStorageUrl(fileUrl)
    const admin = createAdminClient()
    if (parsed && admin) {
      const { data, error } = await admin.storage.from(parsed.bucket).download(parsed.path)
      if (!error && data) {
        let buffer = Buffer.from(await data.arrayBuffer())
        if (parsed.path.endsWith('.gz')) {
          try {
            buffer = gunzipSync(buffer)
          } catch (decompressErr) {
            logger.warn('Plan image gunzip failed', { planId, path: parsed.path })
            return new Response(null, {
              status: 502,
              headers: noStoreWithReason('decompress_failed'),
            })
          }
        }
        return new Response(buffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          },
        })
      }
      logger.warn('Plan image Supabase download failed', {
        planId,
        path: parsed.path,
        error: error?.message ?? 'unknown',
      })
    } else if (parsed && !admin) {
      logger.warn('Plan image: Supabase admin client not available (check SUPABASE_SERVICE_ROLE_KEY)', {
        planId,
      })
    }

    const failReason = parsed ? 'supabase_failed' : 'fetch_failed'

    // روابط خارجية أخرى: fetch
    try {
      const res = await fetch(fileUrl, { method: 'GET', redirect: 'follow' })
      if (res.ok && res.body) {
        return new Response(res.body, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          },
        })
      }
    } catch {
      // fetch failed
    }

    return new Response(null, { status: 502, headers: noStoreWithReason(failReason) })
  } catch (error: unknown) {
    return handleApiError(error) as Response
  }
}
