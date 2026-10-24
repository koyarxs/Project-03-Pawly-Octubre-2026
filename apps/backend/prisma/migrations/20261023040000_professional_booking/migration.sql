-- Additive booking migration. Existing clinical records are preserved.
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppointmentStatus" ADD VALUE 'ARRIVED';
ALTER TYPE "AppointmentStatus" ADD VALUE 'NO_SHOW';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "blockedUntil" TIMESTAMPTZ(3),
ADD COLUMN     "resourceKey" VARCHAR(80),
ADD COLUMN     "serviceId" UUID,
ADD COLUMN     "source" VARCHAR(16) NOT NULL DEFAULT 'INTERNAL';

-- CreateTable
CREATE TABLE "BookingSettings" (
    "clinicId" UUID NOT NULL,
    "configuration" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BookingSettings_pkey" PRIMARY KEY ("clinicId")
);

-- CreateTable
CREATE TABLE "BookingService" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL DEFAULT '',
    "durationMinutes" INTEGER NOT NULL,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
    "resourceKey" VARCHAR(80),
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BookingService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingServiceProfessional" (
    "clinicId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,

    CONSTRAINT "BookingServiceProfessional_pkey" PRIMARY KEY ("clinicId","serviceId","membershipId")
);

-- CreateTable
CREATE TABLE "BookingRequest" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "serviceId" UUID NOT NULL,
    "professionalMembershipId" UUID NOT NULL,
    "appointmentId" UUID,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "blockedUntil" TIMESTAMPTZ(3) NOT NULL,
    "resourceKey" VARCHAR(80),
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "ownerName" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "petName" VARCHAR(100) NOT NULL,
    "species" "Species" NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "additionalInfo" VARCHAR(1000) NOT NULL DEFAULT '',
    "cancellationReason" VARCHAR(500),
    "consentAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingEvent" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "actorMembershipId" UUID,
    "action" VARCHAR(40) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingNotification" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "bookingId" UUID,
    "appointmentId" UUID,
    "eventKey" VARCHAR(200) NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "state" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "deliverAt" TIMESTAMPTZ(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "deliveredAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingService_clinicId_enabled_idx" ON "BookingService"("clinicId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "BookingService_id_clinicId_key" ON "BookingService"("id", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingRequest_appointmentId_key" ON "BookingRequest"("appointmentId");

-- CreateIndex
CREATE INDEX "BookingRequest_clinicId_startsAt_status_idx" ON "BookingRequest"("clinicId", "startsAt", "status");

-- CreateIndex
CREATE INDEX "BookingRequest_clinicId_professionalMembershipId_startsAt_b_idx" ON "BookingRequest"("clinicId", "professionalMembershipId", "startsAt", "blockedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "BookingRequest_id_clinicId_key" ON "BookingRequest"("id", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingRequest_clinicId_requestId_key" ON "BookingRequest"("clinicId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingRequest_appointmentId_clinicId_key" ON "BookingRequest"("appointmentId", "clinicId");

-- CreateIndex
CREATE INDEX "BookingEvent_clinicId_bookingId_createdAt_idx" ON "BookingEvent"("clinicId", "bookingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookingNotification_eventKey_key" ON "BookingNotification"("eventKey");

-- CreateIndex
CREATE INDEX "BookingNotification_state_deliverAt_idx" ON "BookingNotification"("state", "deliverAt");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_clinicId_fkey" FOREIGN KEY ("serviceId", "clinicId") REFERENCES "BookingService"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSettings" ADD CONSTRAINT "BookingSettings_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingServiceProfessional" ADD CONSTRAINT "BookingServiceProfessional_serviceId_clinicId_fkey" FOREIGN KEY ("serviceId", "clinicId") REFERENCES "BookingService"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingServiceProfessional" ADD CONSTRAINT "BookingServiceProfessional_membershipId_clinicId_fkey" FOREIGN KEY ("membershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_serviceId_clinicId_fkey" FOREIGN KEY ("serviceId", "clinicId") REFERENCES "BookingService"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_professionalMembershipId_clinicId_fkey" FOREIGN KEY ("professionalMembershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_appointmentId_clinicId_fkey" FOREIGN KEY ("appointmentId", "clinicId") REFERENCES "Appointment"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_bookingId_clinicId_fkey" FOREIGN KEY ("bookingId", "clinicId") REFERENCES "BookingRequest"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_actorMembershipId_clinicId_fkey" FOREIGN KEY ("actorMembershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingNotification" ADD CONSTRAINT "BookingNotification_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingNotification" ADD CONSTRAINT "BookingNotification_bookingId_clinicId_fkey" FOREIGN KEY ("bookingId", "clinicId") REFERENCES "BookingRequest"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingNotification" ADD CONSTRAINT "BookingNotification_appointmentId_clinicId_fkey" FOREIGN KEY ("appointmentId", "clinicId") REFERENCES "Appointment"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enforce bounds and tenant-safe resource indexes for direct database writes.
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_bounds" CHECK (
  "durationMinutes" BETWEEN 5 AND 480 AND "bufferMinutes" BETWEEN 0 AND 120
  AND length(btrim("name")) > 0 AND "version" >= 1
);
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_bounds" CHECK (
  "endsAt" >= "startsAt" + interval '5 minutes'
  AND "endsAt" <= "startsAt" + interval '480 minutes'
  AND "blockedUntil" >= "endsAt" AND "blockedUntil" <= "endsAt" + interval '120 minutes'
  AND "status" IN ('PENDING','CONFIRMED','CONVERTED','CANCELLED','REJECTED')
  AND "tokenHash" ~ '^[a-f0-9]{64}$' AND "version" >= 1
  AND length(btrim("ownerName")) > 0 AND length(btrim("petName")) > 0
  AND length(btrim("reason")) > 0
  AND ("status" <> 'CONVERTED' OR "appointmentId" IS NOT NULL)
  AND ("status" NOT IN ('CANCELLED','REJECTED') OR length(btrim("cancellationReason")) > 0 AND "cancellationReason" IS NOT NULL)
);
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_booking_bounds" CHECK (
  ("blockedUntil" IS NULL OR "blockedUntil" >= "endsAt" AND "blockedUntil" <= "endsAt" + interval '120 minutes')
  AND "source" IN ('INTERNAL','PUBLIC')
);
ALTER TABLE "BookingNotification" ADD CONSTRAINT "BookingNotification_target" CHECK (
  ("bookingId" IS NOT NULL)::int + ("appointmentId" IS NOT NULL)::int = 1
  AND "state" IN ('PENDING','SENT','DISABLED','FAILED','SKIPPED') AND "attempts" >= 0
);
CREATE INDEX "Appointment_clinicId_resourceKey_startsAt_idx" ON "Appointment" ("clinicId","resourceKey","startsAt");
CREATE INDEX "BookingRequest_clinicId_resourceKey_startsAt_idx" ON "BookingRequest" ("clinicId","resourceKey","startsAt");
