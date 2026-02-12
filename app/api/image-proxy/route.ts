import { NextRequest } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

/**
 * وكيل الصور: يجلب الصورة من Supabase Storage ويعيدها للمتصفح.
 * يستخدم لتجنب 400 من _next/image و CORS عند عرض مخططات الطلبات.
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

  const base = SUPABASE_URL.trim()
  if (!base || !decoded.startsWith(base)) {
    return new Response(null, { status: 403 })
  }

  if (!decoded.includes('/storage/v1/object/')) {
    return new Response(null, { status: 403 })
  }

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
