-- AlterTable: Remove UNIQUE constraint from Payment.orderId so an order can have multiple payments (initial + revision/extension purchases).
-- SQLite does not support dropping UNIQUE; recreate table.

CREATE TABLE "Payment_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'card',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "transactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "Payment_new" ("id", "orderId", "amount", "method", "status", "transactionId", "createdAt", "updatedAt")
SELECT "id", "orderId", "amount", "method", "status", "transactionId", "createdAt", "updatedAt" FROM "Payment";

DROP TABLE "Payment";

ALTER TABLE "Payment_new" RENAME TO "Payment";

CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");
