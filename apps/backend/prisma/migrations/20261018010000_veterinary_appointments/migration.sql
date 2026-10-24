-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Appointment" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "tutorId" UUID NOT NULL,
    "professionalMembershipId" UUID,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "cancellationReason" VARCHAR(500),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentEvent" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "actorMembershipId" UUID NOT NULL,
    "before" JSONB,
    "after" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Appointment_clinicId_startsAt_idx" ON "Appointment"("clinicId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_professionalMembershipId_startsAt_ends_idx" ON "Appointment"("clinicId", "professionalMembershipId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_id_clinicId_key" ON "Appointment"("id", "clinicId");

-- CreateIndex
CREATE INDEX "AppointmentEvent_clinicId_appointmentId_createdAt_idx" ON "AppointmentEvent"("clinicId", "appointmentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicMembership_id_clinicId_key" ON "ClinicMembership"("id", "clinicId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_clinicId_fkey" FOREIGN KEY ("patientId", "clinicId") REFERENCES "Patient"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tutorId_clinicId_fkey" FOREIGN KEY ("tutorId", "clinicId") REFERENCES "Tutor"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_professionalMembershipId_clinicId_fkey" FOREIGN KEY ("professionalMembershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AppointmentEvent" ADD CONSTRAINT "AppointmentEvent_appointmentId_clinicId_fkey" FOREIGN KEY ("appointmentId", "clinicId") REFERENCES "Appointment"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AppointmentEvent" ADD CONSTRAINT "AppointmentEvent_actorMembershipId_clinicId_fkey" FOREIGN KEY ("actorMembershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- Bounds remain enforced even for direct SQL writes.
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_time_bounds" CHECK ("endsAt" >= "startsAt" + interval '5 minutes' AND "endsAt" <= "startsAt" + interval '480 minutes');
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_reason_required" CHECK (length(btrim("reason")) > 0);
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_cancellation_reason" CHECK ("status" <> 'CANCELLED' OR length(btrim("cancellationReason")) > 0 AND "cancellationReason" IS NOT NULL);
