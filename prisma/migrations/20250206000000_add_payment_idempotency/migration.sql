-- CreateTable
CREATE TABLE "PaymentIdempotency" (
    "idempotencyKey" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentIdempotency_pkey" PRIMARY KEY ("idempotencyKey")
);

-- CreateIndex
CREATE INDEX "PaymentIdempotency_idempotencyKey_idx" ON "PaymentIdempotency"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentIdempotency_createdAt_idx" ON "PaymentIdempotency"("createdAt");
