-- Roadmap: webhook event log table. Persists every verified Stripe/PayHere
-- delivery verbatim for replay and dispute debugging.
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT,
    "orderId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebhookEvent_gateway_createdAt_idx" ON "WebhookEvent"("gateway", "createdAt");

CREATE INDEX "WebhookEvent_orderId_idx" ON "WebhookEvent"("orderId");
