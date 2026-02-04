import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { unstable_cache } from 'next/cache'

export type SocialLinkType = 'instagram' | 'snapchat' | 'x' | 'whatsapp' | 'linkedin'

export interface HomepageContentPublic {
  hero: { title: string; subtitle: string } | null
  faq: { sectionTitle: string; items: Array<{ question: string; answer: string }> } | null
  cta: {
    badge: string
    title: string
    subtitle: string
    paragraph: string
    features: Array<{ title: string; desc: string }>
  } | null
  footer: {
    email: string
    phone: string
    copyright: string
    socialLinks: Array<{ type: SocialLinkType; url: string; visible: boolean }>
  } | null
}

function parseContent(content: string | null): Partial<HomepageContentPublic> | null {
  if (!content) return null
  try {
    return JSON.parse(content) as Partial<HomepageContentPublic>
  } catch {
    return null
  }
}

async function getHomepageContent() {
  const row = await prisma.homepageContent.findFirst({ orderBy: { updatedAt: 'desc' } })
  const content = parseContent(row?.content ?? null)
  return {
    hero: content?.hero ?? null,
    faq: content?.faq ?? null,
    cta: content?.cta ?? null,
    footer: content?.footer ?? null,
  }
}

const cachedGetHomepageContent = unstable_cache(getHomepageContent, ['homepage-content'], {
  revalidate: 60,
})

const CACHE_MAX_AGE = 60

export async function GET() {
  try {
    const content = await cachedGetHomepageContent()
    return Response.json(
      { success: true, content },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_MAX_AGE}`,
        },
      }
    )
  } catch (error: unknown) {
    // #region agent log
    const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : undefined
    fetch('http://127.0.0.1:7244/ingest/a8eee1e4-a2b5-45ab-8ecd-ef5f28c71af1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'content/homepage/route.ts:catch', message: 'GET error', data: { code, errorMessage: error instanceof Error ? error.message : String(error) }, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {})
    // #endregion
    return handleApiError(error)
  }
}
