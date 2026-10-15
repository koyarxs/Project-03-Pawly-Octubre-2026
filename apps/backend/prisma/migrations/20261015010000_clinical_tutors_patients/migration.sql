-- CreateEnum
CREATE TYPE "TutorStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('ACTIVE', 'DECEASED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Species" AS ENUM ('DOG', 'CAT', 'BIRD', 'RABBIT', 'RODENT', 'REPTILE', 'HORSE', 'OTHER');

-- CreateEnum
CREATE TYPE "PatientSex" AS ENUM ('FEMALE', 'MALE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Tutor" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254),
    "phone" VARCHAR(32) NOT NULL,
    "address" VARCHAR(500),
    "notes" VARCHAR(2000),
    "status" "TutorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Tutor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "species" "Species" NOT NULL,
    "breed" VARCHAR(100),
    "sex" "PatientSex" NOT NULL DEFAULT 'UNKNOWN',
    "birthDate" DATE,
    "weightKg" DECIMAL(8,3),
    "color" VARCHAR(100),
    "microchip" VARCHAR(64),
    "status" "PatientStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" VARCHAR(2000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientTutor" (
    "clinicId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "tutorId" UUID NOT NULL,

    CONSTRAINT "PatientTutor_pkey" PRIMARY KEY ("clinicId","patientId","tutorId")
);

-- CreateIndex
CREATE INDEX "Tutor_clinicId_status_lastName_firstName_idx" ON "Tutor"("clinicId", "status", "lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "Tutor_id_clinicId_key" ON "Tutor"("id", "clinicId");

-- CreateIndex
CREATE INDEX "Patient_clinicId_status_name_idx" ON "Patient"("clinicId", "status", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_id_clinicId_key" ON "Patient"("id", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_clinicId_microchip_key" ON "Patient"("clinicId", "microchip");

-- CreateIndex
CREATE INDEX "PatientTutor_clinicId_tutorId_idx" ON "PatientTutor"("clinicId", "tutorId");

-- AddForeignKey
ALTER TABLE "Tutor" ADD CONSTRAINT "Tutor_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PatientTutor" ADD CONSTRAINT "PatientTutor_patientId_clinicId_fkey" FOREIGN KEY ("patientId", "clinicId") REFERENCES "Patient"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PatientTutor" ADD CONSTRAINT "PatientTutor_tutorId_clinicId_fkey" FOREIGN KEY ("tutorId", "clinicId") REFERENCES "Tutor"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

