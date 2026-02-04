-- CreateTable
CREATE TABLE "PinPackConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pinPackPrice" REAL NOT NULL,
    "pinPackOldPrice" REAL,
    "pinPackDiscountPercent" REAL,
    "messageWhen1Left" TEXT,
    "messageWhen0Left" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PinPackPurchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "transactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PinPackPurchase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PinPackPurchase_orderId_idx" ON "PinPackPurchase"("orderId");
CREATE INDEX "PinPackPurchase_createdAt_idx" ON "PinPackPurchase"("createdAt");
