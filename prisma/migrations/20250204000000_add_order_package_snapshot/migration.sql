-- AlterTable Order: package snapshot at creation (admin edits do not affect existing orders)
ALTER TABLE "Order" ADD COLUMN "packageNameAr" TEXT;
ALTER TABLE "Order" ADD COLUMN "packagePrice" REAL;
ALTER TABLE "Order" ADD COLUMN "packageRevisionsAtCreate" INTEGER;
ALTER TABLE "Order" ADD COLUMN "packageExecutionDays" INTEGER;
