ALTER TABLE "Tutor"
  ADD COLUMN "rut" VARCHAR(12),
  ADD COLUMN "insuranceType" VARCHAR(20),
  ADD COLUMN "insuranceProvider" VARCHAR(100),
  ADD COLUMN "fonasaGroup" VARCHAR(1);
ALTER TABLE "BookingRequest" ADD COLUMN "ownerRut" VARCHAR(12);

CREATE TABLE "PatientDocument" (
 "id" UUID PRIMARY KEY, "clinicId" UUID NOT NULL, "patientId" UUID NOT NULL,
 "uploadedById" UUID NOT NULL, "name" VARCHAR(180) NOT NULL, "mimeType" VARCHAR(50) NOT NULL,
 "size" INTEGER NOT NULL, "content" BYTEA NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PatientDocument_patientId_clinicId_fkey" FOREIGN KEY ("patientId","clinicId") REFERENCES "Patient"("id","clinicId") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PatientDocument_uploadedById_clinicId_fkey" FOREIGN KEY ("uploadedById","clinicId") REFERENCES "ClinicMembership"("id","clinicId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PatientDocument_clinicId_patientId_createdAt_idx" ON "PatientDocument"("clinicId","patientId","createdAt");
