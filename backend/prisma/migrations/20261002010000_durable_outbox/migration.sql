CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'DEAD');
CREATE TABLE "OutboxMessage" (
  "id" TEXT PRIMARY KEY, "kind" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "dedupeKey" TEXT NOT NULL, "encryptedPayload" TEXT NOT NULL,
  "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), "expiresAt" TIMESTAMP(3),
  "firstAttemptAt" TIMESTAMP(3), "leaseToken" TEXT, "leaseExpiresAt" TIMESTAMP(3),
  "providerReceipt" TEXT, "lastErrorCode" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
  "deliveredAt" TIMESTAMP(3),
  CONSTRAINT "OutboxMessage_kind_check" CHECK ("kind" IN ('EMAIL','REVALIDATION')),
  CONSTRAINT "OutboxMessage_attempts_check" CHECK ("attempts" >= 0)
);
CREATE UNIQUE INDEX "OutboxMessage_dedupeKey_key" ON "OutboxMessage"("dedupeKey");
CREATE INDEX "OutboxMessage_status_availableAt_idx" ON "OutboxMessage"("status","availableAt");
CREATE INDEX "OutboxMessage_status_leaseExpiresAt_idx" ON "OutboxMessage"("status","leaseExpiresAt");
CREATE TABLE "JobLease" ("name" TEXT PRIMARY KEY, "owner" TEXT NOT NULL, "fence" BIGINT NOT NULL DEFAULT 1, "expiresAt" TIMESTAMP(3) NOT NULL);
