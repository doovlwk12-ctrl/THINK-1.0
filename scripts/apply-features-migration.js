/**
 * One-off: apply the featuresJson migration manually (use this when
 * "prisma migrate dev" fails with P3006 / no such table: Package in shadow DB).
 *
 * After running this script, run:
 *   npx prisma migrate resolve --applied 20250201000000_add_package_features_json
 *   npx prisma generate
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Package" ADD COLUMN "featuresJson" TEXT;')
    console.log('Column featuresJson added to Package.')
  } catch (e) {
    const msg = e && e.message ? e.message : String(e)
    if (msg.includes('duplicate column name') || msg.includes('already exists')) {
      console.log('Column featuresJson already exists.')
    } else {
      throw e
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()
