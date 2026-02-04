-- CreateTable
CREATE TABLE "RevisionsPurchaseConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pricePerRevision" REAL NOT NULL,
    "maxRevisionsPerPurchase" INTEGER NOT NULL DEFAULT 20,
    "updatedAt" DATETIME NOT NULL
);
