import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { unstable_cache } from 'next/cache'
import { PACKAGES_CACHE_TAG } from '@/lib/cacheTags'

export const dynamic = 'force-dynamic'

async function getPackages() {
  const packages = await prisma.package.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      price: 'asc'
    }
  })
  return packages
}

const cachedGetPackages = unstable_cache(
  getPackages,
  [PACKAGES_CACHE_TAG],
  { revalidate: 60, tags: [PACKAGES_CACHE_TAG] }
)

const CACHE_MAX_AGE = 60 // seconds

function parseFeatures(featuresJson: string | null): string[] {
  if (!featuresJson || featuresJson.trim() === '') return []
  try {
    const arr = JSON.parse(featuresJson) as unknown
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export async function GET() {
  try {
    const packages = await cachedGetPackages()

    const packagesWithFeatures = packages.map((pkg) => ({
      id: pkg.id,
      nameAr: pkg.nameAr,
      nameEn: pkg.nameEn,
      price: pkg.price,
      revisions: pkg.revisions,
      executionDays: pkg.executionDays,
      isActive: pkg.isActive,
      features: parseFeatures((pkg as { featuresJson?: string | null }).featuresJson ?? null),
    }))

    return Response.json(
      { success: true, packages: packagesWithFeatures },
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
