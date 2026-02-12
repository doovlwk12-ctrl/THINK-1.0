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

const CACHE_TAG = 'homepage-content'
const cachedGetHomepageContent = unstable_cache(getHomepageContent, [CACHE_TAG], {
  revalidate: 60,
  tags: [CACHE_TAG],
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
    return handleApiError(error)
  }
}
