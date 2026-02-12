import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

/** استخراج bucket و path من رابط Supabase: .../object/public/BUCKET/path أو .../object/sign/... */
function parseSupabaseStorageUrl(decoded: string): { bucket: string; path: string } | null {
  // شكل الرابط العام: https://xxx.supabase.co/storage/v1/object/public/orders/plans/file.jpg
  const match = decoded.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
  if (match) return { bucket: match[1], path: match[2] }
  return null
}

/**
 * وكيل الصور: يجلب الصورة من Supabase Storage ويعيدها للمتصفح.
 * يستخدم Service Role لتحميل الملف (يعمل حتى لو كان الـ bucket خاصاً) وتجنب CORS و 400.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url || typeof url !== 'string') {
    return new Response(null, { status: 400 })
  }

  let decoded: string
  try {
    decoded = decodeURIComponent(url).trim()
    if (decoded.startsWith('//')) decoded = `https:${decoded}`
  } catch {
    return new Response(null, { status: 400 })
  }

  // إزالة query و hash للمقارنة والتحميل
  try {
    const u = new URL(decoded)
    decoded = u.origin + u.pathname
  } catch {
    return new Response(null, { status: 400 })
  }

  const base = SUPABASE_URL.replace(/\/$/, '').trim()
  if (!base || !decoded.startsWith(base)) {
    return new Response(null, { status: 403 })
  }

  if (!decoded.includes('/storage/v1/object/')) {
    return new Response(null, { status: 403 })
  }

  const parsed = parseSupabaseStorageUrl(decoded)
  const admin = createAdminClient()

  if (parsed && admin) {
    try {
      const { data, error } = await admin.storage.from(parsed.bucket).download(parsed.path)
      if (error || !data) {
        return new Response(null, { status: error?.message?.includes('not found') ? 404 : 502 })
      }
      const contentType = data.type || 'image/png'
      const buffer = await data.arrayBuffer()
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      })
    } catch {
      return new Response(null, { status: 502 })
    }
  }

  // fallback: fetch بالرابط العام (إن لم يكن Admin متوفراً أو الرابط بغير شكل التخزين)
  try {
    const res = await fetch(decoded, {
      method: 'GET',
      headers: { Accept: 'image/*' },
      cache: 'force-cache',
      next: { revalidate: 3600 },
    })

    if (!res.ok || !res.body) {
      return new Response(null, { status: res.status === 404 ? 404 : 502 })
    }

    const contentType = res.headers.get('Content-Type') || 'image/png'
    const cacheControl = res.headers.get('Cache-Control') || 'public, max-age=3600, s-maxage=3600'

    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
    })
  } catch {
    return new Response(null, { status: 502 })
  }
}
