/**
 * One-off: create HomepageContent table if missing (e.g. after P2021).
 * Run: npx tsx scripts/ensure-homepage-content-table.ts
 */
import { prisma } from '../lib/prisma'

const SQL = `
CREATE TABLE IF NOT EXISTS "HomepageContent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "content" TEXT NOT NULL,
  "updatedAt" DATETIME NOT NULL
);
`

async function main() {
  await prisma.$executeRawUnsafe(SQL)
  console.log('HomepageContent table ensured.')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
