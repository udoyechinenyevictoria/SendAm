CREATE TABLE "ConfirmationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "amount" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "routeType" TEXT NOT NULL,
    "summaryHash" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    CONSTRAINT "ConfirmationRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConfirmationRequest_nonce_key" ON "ConfirmationRequest"("nonce");
CREATE INDEX "ConfirmationRequest_userId_state_createdAt_idx"
  ON "ConfirmationRequest"("userId", "state", "createdAt");
CREATE INDEX "ConfirmationRequest_expiresAt_idx" ON "ConfirmationRequest"("expiresAt");
ALTER TABLE "ConfirmationRequest" ADD CONSTRAINT "ConfirmationRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" DROP COLUMN "pendingSend";