-- AlterTable Order: plansPurgedAt, archivedWarningSentAt
ALTER TABLE "Order" ADD COLUMN "plansPurgedAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "archivedWarningSentAt" DATETIME;

-- AlterTable Plan: purgedAt
ALTER TABLE "Plan" ADD COLUMN "purgedAt" DATETIME;
