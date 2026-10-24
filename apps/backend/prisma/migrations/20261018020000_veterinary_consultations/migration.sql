BEGIN;
-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateEnum
CREATE TYPE "DiagnosisType" AS ENUM ('PRESUMPTIVE', 'DEFINITIVE');

-- CreateTable
CREATE TABLE "Consultation" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "appointmentId" UUID,
    "requestId" UUID NOT NULL,
    "professionalMembershipId" UUID NOT NULL,
    "createdByMembershipId" UUID NOT NULL,
    "finalizedByMembershipId" UUID,
    "attendedAt" TIMESTAMPTZ(3) NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "anamnesis" VARCHAR(8000) NOT NULL DEFAULT '',
    "physicalExam" VARCHAR(8000) NOT NULL DEFAULT '',
    "findings" VARCHAR(8000) NOT NULL DEFAULT '',
    "diagnosis" VARCHAR(4000) NOT NULL DEFAULT '',
    "diagnosisType" "DiagnosisType",
    "treatment" VARCHAR(8000) NOT NULL DEFAULT '',
    "instructions" VARCHAR(8000) NOT NULL DEFAULT '',
    "notes" VARCHAR(4000) NOT NULL DEFAULT '',
    "weightKg" DECIMAL(8,3),
    "temperatureC" DECIMAL(4,1),
    "heartRate" INTEGER,
    "respiratoryRate" INTEGER,
    "nextControlAt" TIMESTAMPTZ(3),
    "status" "ConsultationStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "finalizedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationEvent" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "consultationId" UUID NOT NULL,
    "actorMembershipId" UUID NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationAmendment" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "consultationId" UUID NOT NULL,
    "actorMembershipId" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "correction" VARCHAR(8000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_appointmentId_key" ON "Consultation"("appointmentId");

-- CreateIndex
CREATE INDEX "Consultation_clinicId_patientId_attendedAt_idx" ON "Consultation"("clinicId", "patientId", "attendedAt");

-- CreateIndex
CREATE INDEX "Consultation_clinicId_status_attendedAt_idx" ON "Consultation"("clinicId", "status", "attendedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_id_clinicId_key" ON "Consultation"("id", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_clinicId_requestId_key" ON "Consultation"("clinicId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_appointmentId_patientId_clinicId_key" ON "Consultation"("appointmentId", "patientId", "clinicId");

-- CreateIndex
CREATE INDEX "ConsultationEvent_clinicId_consultationId_createdAt_idx" ON "ConsultationEvent"("clinicId", "consultationId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultationAmendment_clinicId_consultationId_createdAt_idx" ON "ConsultationAmendment"("clinicId", "consultationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationAmendment_clinicId_requestId_key" ON "ConsultationAmendment"("clinicId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_id_patientId_clinicId_key" ON "Appointment"("id", "patientId", "clinicId");

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_patientId_clinicId_fkey" FOREIGN KEY ("patientId", "clinicId") REFERENCES "Patient"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_appointmentId_patientId_clinicId_fkey" FOREIGN KEY ("appointmentId", "patientId", "clinicId") REFERENCES "Appointment"("id", "patientId", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_professionalMembershipId_clinicId_fkey" FOREIGN KEY ("professionalMembershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_createdByMembershipId_clinicId_fkey" FOREIGN KEY ("createdByMembershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_finalizedByMembershipId_clinicId_fkey" FOREIGN KEY ("finalizedByMembershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ConsultationEvent" ADD CONSTRAINT "ConsultationEvent_consultationId_clinicId_fkey" FOREIGN KEY ("consultationId", "clinicId") REFERENCES "Consultation"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ConsultationEvent" ADD CONSTRAINT "ConsultationEvent_actorMembershipId_clinicId_fkey" FOREIGN KEY ("actorMembershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ConsultationAmendment" ADD CONSTRAINT "ConsultationAmendment_consultationId_clinicId_fkey" FOREIGN KEY ("consultationId", "clinicId") REFERENCES "Consultation"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ConsultationAmendment" ADD CONSTRAINT "ConsultationAmendment_actorMembershipId_clinicId_fkey" FOREIGN KEY ("actorMembershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- Clinical bounds and finalized records remain protected for direct SQL writes.
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_vitals" CHECK (
  ("weightKg" IS NULL OR "weightKg" BETWEEN 0.001 AND 10000) AND
  ("temperatureC" IS NULL OR "temperatureC" BETWEEN 20 AND 50) AND
  ("heartRate" IS NULL OR "heartRate" BETWEEN 1 AND 500) AND
  ("respiratoryRate" IS NULL OR "respiratoryRate" BETWEEN 1 AND 300));
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_next_control" CHECK ("nextControlAt" IS NULL OR "nextControlAt" > "attendedAt");
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_reason" CHECK (length(btrim("reason")) > 0);
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_finalization" CHECK (
  ("status" = 'DRAFT' AND "finalizedAt" IS NULL AND "finalizedByMembershipId" IS NULL) OR
  ("status" = 'FINALIZED' AND "finalizedAt" IS NOT NULL AND "finalizedByMembershipId" IS NOT NULL AND
   "diagnosisType" IS NOT NULL AND length(btrim("anamnesis")) > 0 AND length(btrim("physicalExam")) > 0 AND
   length(btrim("diagnosis")) > 0 AND length(btrim("treatment")) > 0));
ALTER TABLE "ConsultationAmendment" ADD CONSTRAINT "ConsultationAmendment_required" CHECK (length(btrim("reason")) > 0 AND length(btrim("correction")) > 0);

CREATE FUNCTION "protectFinalizedConsultation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" = 'FINALIZED' THEN
    RAISE EXCEPTION 'Finalized consultation is immutable' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "protectFinalizedConsultation" BEFORE UPDATE OR DELETE ON "Consultation"
FOR EACH ROW EXECUTE FUNCTION "protectFinalizedConsultation"();

CREATE FUNCTION "protectClinicalAppendOnly"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Clinical history is append only' USING ERRCODE='23514';
END;
$$;
CREATE TRIGGER "protectConsultationEvents" BEFORE UPDATE OR DELETE ON "ConsultationEvent"
FOR EACH ROW EXECUTE FUNCTION "protectClinicalAppendOnly"();
CREATE TRIGGER "protectConsultationAmendments" BEFORE UPDATE OR DELETE ON "ConsultationAmendment"
FOR EACH ROW EXECUTE FUNCTION "protectClinicalAppendOnly"();

CREATE FUNCTION "requireFinalizedForAmendment"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE state text;
BEGIN
  EXECUTE format('SELECT "status"::text FROM %I."Consultation" WHERE "id"=$1 AND "clinicId"=$2', TG_TABLE_SCHEMA)
    INTO state USING NEW."consultationId",NEW."clinicId";
  IF state IS DISTINCT FROM 'FINALIZED' THEN
    RAISE EXCEPTION 'Amendment requires finalized consultation' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "requireFinalizedForAmendment" BEFORE INSERT ON "ConsultationAmendment"
FOR EACH ROW EXECUTE FUNCTION "requireFinalizedForAmendment"();

-- Deferred: consultation and appointment can be updated atomically, in either order.
CREATE FUNCTION "checkClinicalAppointment"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE clinical record; booking record; expected text;
BEGIN
  IF TG_TABLE_NAME='Consultation' THEN
    EXECUTE format('SELECT "appointmentId","clinicId","professionalMembershipId","status"::text AS state FROM %I."Consultation" WHERE "id"=$1',TG_TABLE_SCHEMA)
      INTO clinical USING NEW."id";
  ELSE
    EXECUTE format('SELECT "appointmentId","clinicId","professionalMembershipId","status"::text AS state FROM %I."Consultation" WHERE "appointmentId"=$1',TG_TABLE_SCHEMA)
      INTO clinical USING NEW."id";
  END IF;
  IF clinical."appointmentId" IS NULL THEN RETURN NULL; END IF;
  EXECUTE format('SELECT "status"::text AS state,"professionalMembershipId" FROM %I."Appointment" WHERE "id"=$1 AND "clinicId"=$2',TG_TABLE_SCHEMA)
    INTO booking USING clinical."appointmentId",clinical."clinicId";
  expected := CASE WHEN clinical.state='FINALIZED' THEN 'COMPLETED' ELSE 'IN_PROGRESS' END;
  IF booking.state IS DISTINCT FROM expected OR booking."professionalMembershipId" IS DISTINCT FROM clinical."professionalMembershipId" THEN
    RAISE EXCEPTION 'Appointment and consultation must agree' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER "consultationAppointmentConsistent" AFTER INSERT OR UPDATE ON "Consultation"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "checkClinicalAppointment"();
CREATE CONSTRAINT TRIGGER "appointmentConsultationConsistent" AFTER UPDATE ON "Appointment"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "checkClinicalAppointment"();

COMMIT;
