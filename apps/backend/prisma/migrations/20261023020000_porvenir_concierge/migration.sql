BEGIN;
-- CreateEnum
CREATE TYPE "ConciergeSeat" AS ENUM ('CUSTOMER_CARE', 'SCHEDULING', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "ConciergeMessageRole" AS ENUM ('VISITOR', 'AI', 'HUMAN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ConciergeHandoffState" AS ENUM ('NONE', 'WAITING', 'REQUESTED', 'ASSIGNED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ConciergeBookingState" AS ENUM ('PROPOSED', 'REQUESTED', 'HANDLED');

-- CreateEnum
CREATE TYPE "ConciergeUsageState" AS ENUM ('RESERVED', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ConciergeSettings" (
    "clinicId" UUID NOT NULL,
    "configuration" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ConciergeSettings_pkey" PRIMARY KEY ("clinicId")
);

-- CreateTable
CREATE TABLE "ConciergeConversation" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "busyUntil" TIMESTAMPTZ(3),
    "handoffState" "ConciergeHandoffState" NOT NULL DEFAULT 'NONE',
    "handoffSeat" "ConciergeSeat",
    "contact" VARCHAR(254),
    "assignedMembershipId" UUID,

    CONSTRAINT "ConciergeConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConciergeMessage" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "role" "ConciergeMessageRole" NOT NULL,
    "text" VARCHAR(4000) NOT NULL,
    "authorLabel" VARCHAR(120),
    "requestId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConciergeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConciergePresence" (
    "availability" VARCHAR(16) NOT NULL DEFAULT 'AVAILABLE',
    "clinicId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "seat" "ConciergeSeat" NOT NULL,
    "onlineUntil" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ConciergePresence_pkey" PRIMARY KEY ("clinicId","membershipId"),
    CONSTRAINT "ConciergePresence_availability_check" CHECK ("availability" IN ('AVAILABLE','BUSY','AWAY','OFFLINE'))
);

-- CreateTable
CREATE TABLE "ConciergeBookingProposal" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" "ConciergeBookingState" NOT NULL DEFAULT 'PROPOSED',
    "contact" JSONB,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConciergeBookingProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConciergeUsage" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "state" "ConciergeUsageState" NOT NULL DEFAULT 'RESERVED',
    "reservedMicros" INTEGER NOT NULL,
    "estimatedMicros" INTEGER,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "inputRate" DOUBLE PRECISION NOT NULL,
    "outputRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConciergeUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConciergeConversation_tokenHash_key" ON "ConciergeConversation"("tokenHash");

-- CreateIndex
CREATE INDEX "ConciergeConversation_clinicId_expiresAt_idx" ON "ConciergeConversation"("clinicId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConciergeConversation_id_clinicId_key" ON "ConciergeConversation"("id", "clinicId");

-- CreateIndex
CREATE INDEX "ConciergeMessage_clinicId_conversationId_createdAt_idx" ON "ConciergeMessage"("clinicId", "conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConciergeMessage_conversationId_requestId_key" ON "ConciergeMessage"("conversationId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "ConciergePresence_membershipId_key" ON "ConciergePresence"("membershipId");

-- CreateIndex
CREATE INDEX "ConciergePresence_clinicId_onlineUntil_idx" ON "ConciergePresence"("clinicId", "onlineUntil");

-- CreateIndex
CREATE UNIQUE INDEX "ConciergePresence_membershipId_clinicId_key" ON "ConciergePresence"("membershipId", "clinicId");

-- CreateIndex
CREATE INDEX "ConciergeBookingProposal_clinicId_status_createdAt_idx" ON "ConciergeBookingProposal"("clinicId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConciergeBookingProposal_id_clinicId_key" ON "ConciergeBookingProposal"("id", "clinicId");

-- CreateIndex
CREATE INDEX "ConciergeUsage_clinicId_createdAt_idx" ON "ConciergeUsage"("clinicId", "createdAt");

-- AddForeignKey
ALTER TABLE "ConciergeSettings" ADD CONSTRAINT "ConciergeSettings_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciergeConversation" ADD CONSTRAINT "ConciergeConversation_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciergeConversation" ADD CONSTRAINT "ConciergeConversation_assignedMembershipId_clinicId_fkey" FOREIGN KEY ("assignedMembershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciergeMessage" ADD CONSTRAINT "ConciergeMessage_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciergeMessage" ADD CONSTRAINT "ConciergeMessage_conversationId_clinicId_fkey" FOREIGN KEY ("conversationId", "clinicId") REFERENCES "ConciergeConversation"("id", "clinicId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciergePresence" ADD CONSTRAINT "ConciergePresence_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciergePresence" ADD CONSTRAINT "ConciergePresence_membershipId_clinicId_fkey" FOREIGN KEY ("membershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciergeBookingProposal" ADD CONSTRAINT "ConciergeBookingProposal_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciergeBookingProposal" ADD CONSTRAINT "ConciergeBookingProposal_conversationId_clinicId_fkey" FOREIGN KEY ("conversationId", "clinicId") REFERENCES "ConciergeConversation"("id", "clinicId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciergeUsage" ADD CONSTRAINT "ConciergeUsage_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConciergeSettings" ADD CONSTRAINT "ConciergeSettings_config_check" CHECK (jsonb_typeof("configuration")='object' AND "version">0);
ALTER TABLE "ConciergeConversation" ADD CONSTRAINT "ConciergeConversation_expiry_check" CHECK ("expiresAt">"createdAt"), ADD CONSTRAINT "ConciergeConversation_token_check" CHECK ("tokenHash" ~ '^[a-f0-9]{64}$'), ADD CONSTRAINT "ConciergeConversation_assignment_check" CHECK (("handoffState"='ASSIGNED') = ("assignedMembershipId" IS NOT NULL));
ALTER TABLE "ConciergeBookingProposal" ADD CONSTRAINT "ConciergeBookingProposal_time_check" CHECK ("endsAt">"startsAt" AND "expiresAt">"createdAt"), ADD CONSTRAINT "ConciergeBookingProposal_contact_check" CHECK ("status"='PROPOSED' OR jsonb_typeof("contact")='object');
ALTER TABLE "ConciergeUsage" ADD CONSTRAINT "ConciergeUsage_cost_check" CHECK ("reservedMicros">=0 AND ("estimatedMicros" IS NULL OR "estimatedMicros">=0) AND "inputTokens">=0 AND "outputTokens">=0 AND "inputRate">0 AND "outputRate">0);

COMMIT;
